import { 
  InterceptorType, 
  EnemyType, 
  BatteryConfig, 
  City, 
  EnemyMissile, 
  InterceptorMissile, 
  Explosion, 
  Particle, 
  Shockwave, 
  ActiveLockTarget, 
  UpgradeItem, 
  WaveInfo,
  CountryId,
  CountryTheater
} from '../types/game';
import { soundManager } from '../audio/soundManager';
import { getWaveConfig } from './waveConfigs';
import { INITIAL_UPGRADES, getLockTimeForLevel } from './upgradesData';
import { getCountryTheater } from './countriesData';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number, credits: number) => void;
  onWaveComplete: (wave: number, stats: WaveClearStats) => void;
  onGameOver: (finalStats: GameOverStats) => void;
  onBatteryChange: (batteries: BatteryConfig[]) => void;
  onCityStatusChange: (cities: City[]) => void;
  onScreenNotification: (message: string, type: 'info' | 'warning' | 'alert') => void;
}

export interface WaveClearStats {
  wave: number;
  interceptions: number;
  accuracy: number;
  citiesSaved: number;
  bountyEarned: number;
  bonusCredits: number;
}

export interface GameOverStats {
  waveReached: number;
  score: number;
  interceptions: number;
  missilesFired: number;
  accuracy: number;
  casualties: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Viewport
  public width: number = 800;
  public height: number = 600;

  // Country & Theater
  public currentCountry: CountryTheater;

  // Game state
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public wave: number = 1;
  public currentWaveConfig: WaveInfo;
  public score: number = 0;
  public credits: number = 500;
  public selectedBatteryType: InterceptorType = 'iron_dome';

  // Game stats
  public totalInterceptions: number = 0;
  public totalMissilesFired: number = 0;
  public waveInterceptions: number = 0;
  public waveMissilesFired: number = 0;

  // Entities
  public cities: City[] = [];
  public batteries: Map<InterceptorType, BatteryConfig> = new Map();
  public enemyMissiles: EnemyMissile[] = [];
  public interceptorMissiles: InterceptorMissile[] = [];
  public explosions: Explosion[] = [];
  public particles: Particle[] = [];
  public shockwaves: Shockwave[] = [];
  public activeLocks: ActiveLockTarget[] = [];
  public upgrades: UpgradeItem[] = [];

  // Automated CIWS turret
  public ciwsUnlocked: boolean = false;
  public ciwsLevel: number = 0;
  private ciwsCooldown: number = 0;
  private ciwsMuzzleFlash: { x: number; y: number; alpha: number; targetX: number; targetY: number } | null = null;

  // Spawner & Wave
  private missilesToSpawn: EnemyType[] = [];
  private nextSpawnTime: number = 0;
  private waveCompleted: boolean = false;

  // Visual FX
  private screenShakeIntensity: number = 0;
  private radarAngle: number = 0;
  private searchlightAngle1: number = 0;
  private searchlightAngle2: number = 0;
  private stars: { x: number; y: number; size: number; alpha: number; twinkleSpeed: number }[] = [];

  // Animation frame
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks, initialCountry: CountryId = 'israel') {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from canvas');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.currentWaveConfig = getWaveConfig(1);
    this.currentCountry = getCountryTheater(initialCountry);
    this.upgrades = JSON.parse(JSON.stringify(INITIAL_UPGRADES));

    this.initBatteries();
    this.applyCountryConfiguration(initialCountry);
    this.initStars();
    this.resize();
  }

  public setCountry(countryId: CountryId) {
    this.currentCountry = getCountryTheater(countryId);
    this.applyCountryConfiguration(countryId);
  }

  private applyCountryConfiguration(countryId: CountryId) {
    const theater = getCountryTheater(countryId);
    this.currentCountry = theater;

    // Build cities from theater definitions
    this.cities = theater.cities.map((c, idx) => ({
      id: c.id,
      name: c.name,
      xRatio: c.xRatio,
      width: 70,
      health: 100,
      maxHealth: 100,
      shields: (theater.startingBonus.extraShields || 0) + 1,
      maxShields: 3,
      population: c.population,
      initialPopulation: c.population,
      isDestroyed: false,
      skylineSeed: (idx + 1) * 111,
      landmark: c.landmark
    }));

    // Reset batteries
    this.initBatteries();

    // Apply country traits to batteries
    if (theater.startingBonus.ironDomeCapacityBonus) {
      const idBat = this.batteries.get('iron_dome');
      if (idBat) {
        idBat.maxAmmo += theater.startingBonus.ironDomeCapacityBonus;
        idBat.ammo = idBat.maxAmmo;
      }
    }

    if (theater.startingBonus.reloadSpeedMultiplier) {
      this.batteries.forEach(bat => {
        bat.reloadDuration = Math.floor(bat.reloadDuration / theater.startingBonus.reloadSpeedMultiplier!);
      });
    }

    if (theater.startingBonus.thaadBlastBonus) {
      const thaadBat = this.batteries.get('thaad');
      if (thaadBat) {
        thaadBat.blastRadius += theater.startingBonus.thaadBlastBonus;
      }
    }

    // CIWS bonus
    if (theater.startingBonus.ciwsActive) {
      this.ciwsUnlocked = true;
      this.ciwsLevel = 1;
      const ciwsUpgrade = this.upgrades.find(u => u.id === 'ciws_phalanx_turret');
      if (ciwsUpgrade) ciwsUpgrade.currentLevel = 1;
    } else {
      this.ciwsUnlocked = false;
      this.ciwsLevel = 0;
    }

    // Multi-lock bonus
    if (theater.startingBonus.multiLockBonus) {
      const mlUpgrade = this.upgrades.find(u => u.id === 'radar_multi_target');
      if (mlUpgrade) {
        mlUpgrade.currentLevel = Math.max(mlUpgrade.currentLevel, 1 + theater.startingBonus.multiLockBonus);
      }
    }

    // Credits bonus
    this.credits = 500 + (theater.startingBonus.credits || 0);

    this.callbacks.onCityStatusChange(this.cities);
    this.callbacks.onBatteryChange(Array.from(this.batteries.values()));
    this.callbacks.onScoreUpdate(this.score, this.credits);
  }

  public resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    this.updateCityPositions();
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 95; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.72,
        size: Math.random() * 1.6 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.03 + 0.01
      });
    }
  }

  private initBatteries() {
    const ironDomeConfig: BatteryConfig = {
      type: 'iron_dome',
      name: 'Iron Dome',
      codeName: 'Tamir Battery',
      description: 'Rapid-fire short-range swarm defense against rockets, cruise missiles, and drones.',
      ammo: 20,
      maxAmmo: 20,
      isReloading: false,
      reloadProgress: 0,
      reloadDuration: 3200,
      missileSpeed: 720,
      blastRadius: 46,
      damage: 100,
      x: 0.23,
      y: 0,
      color: '#38bdf8', // Sky cyan
      exhaustColor: '#7dd3fc',
      hotkey: '1',
      iconName: 'Shield',
      unlocked: true
    };

    const patriotConfig: BatteryConfig = {
      type: 'patriot',
      name: 'Patriot PAC-3',
      codeName: 'MIM-104 Battery',
      description: 'Heavy medium/high altitude ballistic defense. High velocity with kinetic penetrator.',
      ammo: 10,
      maxAmmo: 10,
      isReloading: false,
      reloadProgress: 0,
      reloadDuration: 4400,
      missileSpeed: 920,
      blastRadius: 62,
      damage: 240,
      x: 0.50,
      y: 0,
      color: '#34d399', // Emerald
      exhaustColor: '#6ee7b7',
      hotkey: '2',
      iconName: 'Zap',
      unlocked: true
    };

    const thaadConfig: BatteryConfig = {
      type: 'thaad',
      name: 'THAAD',
      codeName: 'Terminal High Altitude',
      description: 'Mach 8+ kinetic hit-to-kill interceptor. Obliterates hypersonic gliders & MIRVs.',
      ammo: 8,
      maxAmmo: 8,
      isReloading: false,
      reloadProgress: 0,
      reloadDuration: 5000,
      missileSpeed: 1250,
      blastRadius: 80,
      damage: 420,
      x: 0.77,
      y: 0,
      color: '#f59e0b', // Amber/Gold
      exhaustColor: '#fde68a',
      hotkey: '3',
      iconName: 'ShieldAlert',
      unlocked: true
    };

    this.batteries.set('iron_dome', ironDomeConfig);
    this.batteries.set('patriot', patriotConfig);
    this.batteries.set('thaad', thaadConfig);
  }

  private updateCityPositions() {
    const baseW = Math.max(50, Math.min(105, this.width * 0.085));
    this.cities.forEach(c => {
      c.width = baseW;
    });
  }

  public startMission(startWave: number = 1) {
    this.wave = startWave;
    this.prepareWave(this.wave);
    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);

    soundManager.startBackgroundSiren();
    this.callbacks.onScreenNotification(`THEATER: ${this.currentCountry.theaterName.toUpperCase()}`, 'warning');
  }

  public prepareWave(waveNumber: number) {
    this.wave = waveNumber;
    this.currentWaveConfig = getWaveConfig(waveNumber);
    this.waveCompleted = false;

    this.waveInterceptions = 0;
    this.waveMissilesFired = 0;

    // Build missile queue
    const queue: EnemyType[] = [];
    for (let i = 0; i < this.currentWaveConfig.scudCount; i++) queue.push('scud');
    for (let i = 0; i < this.currentWaveConfig.cruiseCount; i++) queue.push('cruise');
    for (let i = 0; i < this.currentWaveConfig.droneCount; i++) queue.push('drone');
    for (let i = 0; i < this.currentWaveConfig.mirvCount; i++) queue.push('mirv');
    for (let i = 0; i < this.currentWaveConfig.hypersonicCount; i++) queue.push('hypersonic');
    for (let i = 0; i < this.currentWaveConfig.bunkerBusterCount; i++) queue.push('bunker_buster');

    queue.sort(() => Math.random() - 0.5);
    this.missilesToSpawn = queue;

    // Reset batteries
    this.batteries.forEach(battery => {
      battery.ammo = battery.maxAmmo;
      battery.isReloading = false;
      battery.reloadProgress = 0;
    });

    this.callbacks.onBatteryChange(Array.from(this.batteries.values()));
    this.nextSpawnTime = performance.now() + 1100;
    soundManager.startBackgroundSiren();
  }

  public selectBattery(type: InterceptorType) {
    if (this.batteries.has(type)) {
      this.selectedBatteryType = type;
      soundManager.playLockStart();
    }
  }

  public manualReload(type: InterceptorType) {
    const battery = this.batteries.get(type);
    if (!battery || battery.isReloading || battery.ammo === battery.maxAmmo) return;
    battery.isReloading = true;
    battery.reloadProgress = 0;
    this.callbacks.onBatteryChange(Array.from(this.batteries.values()));
  }

  public handleTap(clientX: number, clientY: number) {
    if (!this.isRunning || this.isPaused) return;

    const rect = this.canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const multiLockUpgrade = this.upgrades.find(u => u.id === 'radar_multi_target');
    const maxLocks = (multiLockUpgrade?.currentLevel || 0) + 1;

    if (this.activeLocks.length >= maxLocks) {
      this.activeLocks.shift();
    }

    let bestTarget: EnemyMissile | null = null;
    let bestDistance = 65; // very generous touch tolerance

    for (const missile of this.enemyMissiles) {
      const dx = missile.x - clickX;
      const dy = missile.y - clickY;
      const dist = Math.hypot(dx, dy);

      if (dist < bestDistance) {
        bestDistance = dist;
        bestTarget = missile;
      }
    }

    if (bestTarget) {
      this.initiateLockOn(bestTarget);
    } else {
      let nearestMissile: EnemyMissile | null = null;
      let nearestDist = 135;
      for (const missile of this.enemyMissiles) {
        const d = Math.hypot(missile.x - clickX, missile.y - clickY);
        if (d < nearestDist) {
          nearestDist = d;
          nearestMissile = missile;
        }
      }

      if (nearestMissile) {
        this.initiateLockOn(nearestMissile);
      } else {
        this.shockwaves.push({
          x: clickX,
          y: clickY,
          radius: 4,
          maxRadius: 28,
          alpha: 0.5,
          color: '#38bdf8'
        });
      }
    }
  }

  private initiateLockOn(missile: EnemyMissile) {
    const lockSpeedUpgrade = this.upgrades.find(u => u.id === 'radar_lock_speed');
    const lockSpeedLevel = lockSpeedUpgrade ? lockSpeedUpgrade.currentLevel : 0;
    const baseLockSeconds = getLockTimeForLevel(lockSpeedLevel);
    const lockDurationMs = baseLockSeconds * 1000;

    const existingLock = this.activeLocks.find(l => l.missileId === missile.id);
    if (existingLock) {
      existingLock.startTime = performance.now();
      existingLock.duration = lockDurationMs;
      soundManager.playLockStart();
      return;
    }

    this.activeLocks.push({
      id: Math.random().toString(36).slice(2, 9),
      missileId: missile.id,
      x: missile.x,
      y: missile.y,
      batteryType: this.selectedBatteryType,
      startTime: performance.now(),
      duration: lockDurationMs,
      progress: 0,
      completed: false
    });

    missile.isLocked = true;
    soundManager.playLockStart();
  }

  private fireInterceptorAt(target: EnemyMissile, batteryType: InterceptorType) {
    const battery = this.batteries.get(batteryType);
    if (!battery) return;

    if (battery.ammo <= 0) {
      if (!battery.isReloading) {
        battery.isReloading = true;
        battery.reloadProgress = 0;
      }
      this.callbacks.onScreenNotification(`${battery.name.toUpperCase()} DEPLETED · AUTO RELOADING`, 'warning');
      const fallbacks: InterceptorType[] = ['iron_dome', 'patriot', 'thaad'];
      const alt = fallbacks.find(t => t !== batteryType && (this.batteries.get(t)?.ammo || 0) > 0);
      if (alt) {
        this.fireInterceptorAt(target, alt);
      }
      return;
    }

    battery.ammo--;
    this.waveMissilesFired++;
    this.totalMissilesFired++;

    if (battery.ammo === 0) {
      battery.isReloading = true;
      battery.reloadProgress = 0;
    }

    this.callbacks.onBatteryChange(Array.from(this.batteries.values()));

    const startX = battery.x * this.width;
    const startY = this.height - 35;

    const distanceToTarget = Math.hypot(target.x - startX, target.y - startY);
    const interceptorSpeed = battery.missileSpeed;
    const estimatedFlightTime = distanceToTarget / interceptorSpeed;

    const leadTargetX = Math.max(20, Math.min(this.width - 20, target.x + target.vx * estimatedFlightTime * 0.88));
    const leadTargetY = Math.max(30, target.y + target.vy * estimatedFlightTime * 0.88);

    // Realistic multi-stage rocket sound
    if (batteryType === 'iron_dome') {
      soundManager.playLaunchIronDome();
    } else if (batteryType === 'patriot') {
      soundManager.playLaunchPatriot();
    } else if (batteryType === 'thaad') {
      soundManager.playLaunchTHAAD();
      this.screenShakeIntensity = Math.max(this.screenShakeIntensity, 4);
    }

    this.interceptorMissiles.push({
      id: Math.random().toString(36).slice(2, 9),
      batteryType,
      startX,
      startY,
      x: startX,
      y: startY,
      targetMissileId: target.id,
      targetX: leadTargetX,
      targetY: leadTargetY,
      vx: 0,
      vy: 0,
      speed: interceptorSpeed,
      blastRadius: battery.blastRadius,
      damage: battery.damage,
      color: battery.color,
      smokeColor: battery.exhaustColor,
      trail: [],
      isKineticHitToKill: batteryType === 'thaad',
      distanceTraveled: 0,
      targetDistance: distanceToTarget,
      hasDetonated: false
    });

    target.assignedInterceptors++;
  }

  public triggerEmergencyFlare() {
    if (this.credits < 150) {
      this.callbacks.onScreenNotification('INSUFFICIENT FUNDS FOR EMP FLARES (150 CR)', 'info');
      return;
    }

    this.credits -= 150;
    this.callbacks.onScoreUpdate(this.score, this.credits);
    soundManager.playExplosion('heavy');
    this.screenShakeIntensity = 6;

    this.shockwaves.push({
      x: this.width / 2,
      y: this.height / 2,
      radius: 10,
      maxRadius: this.width * 0.65,
      alpha: 1,
      color: '#38bdf8',
      lineWidth: 4
    });

    this.enemyMissiles.forEach(missile => {
      if (missile.type === 'drone' || missile.type === 'scud') {
        missile.health -= 150;
      } else {
        missile.health -= 60;
      }
    });

    this.callbacks.onScreenNotification('TACTICAL EMP DISRUPTED INCOMING WARHEADS', 'warning');
  }

  private loop = (timestamp: number) => {
    if (!this.isRunning) return;

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTimestamp = timestamp;

    if (!this.isPaused) {
      this.update(dt, timestamp);
    }

    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number) {
    // 1. Spawner logic with simultaneous cluster salvos
    if (this.missilesToSpawn.length > 0 && now >= this.nextSpawnTime) {
      const maxSalvo = Math.min(
        this.missilesToSpawn.length, 
        this.currentWaveConfig.simultaneousSpawnsMax || 1
      );
      // Salvo burst chance increases with wave (45% in Wave 1 to 75% in later waves)
      const burstChance = Math.min(0.75, 0.45 + this.wave * 0.06);
      const salvoCount = (maxSalvo > 1 && Math.random() < burstChance)
        ? Math.floor(Math.random() * (maxSalvo - 1)) + 2 
        : 1;

      for (let s = 0; s < salvoCount; s++) {
        if (this.missilesToSpawn.length > 0) {
          const type = this.missilesToSpawn.shift()!;
          this.spawnEnemyMissile(type);
        }
      }

      const interval = Math.random() * 
        (this.currentWaveConfig.spawnIntervalMax - this.currentWaveConfig.spawnIntervalMin) + 
        this.currentWaveConfig.spawnIntervalMin;
      this.nextSpawnTime = now + interval;
    }

    // 2. Battery reloading
    this.batteries.forEach(battery => {
      if (battery.isReloading) {
        const reloadUpgrade = this.upgrades.find(u => u.id === 'battery_reload_speed');
        const reloadMult = 1 + (reloadUpgrade ? reloadUpgrade.currentLevel * 0.25 : 0);
        
        battery.reloadProgress += (dt * 1000 * reloadMult) / battery.reloadDuration;
        if (battery.reloadProgress >= 1) {
          battery.ammo = battery.maxAmmo;
          battery.isReloading = false;
          battery.reloadProgress = 0;
          this.callbacks.onBatteryChange(Array.from(this.batteries.values()));
        }
      }
    });

    // 3. Active radar locks update
    for (let i = this.activeLocks.length - 1; i >= 0; i--) {
      const lock = this.activeLocks[i];
      const target = this.enemyMissiles.find(m => m.id === lock.missileId);

      if (!target || target.health <= 0) {
        this.activeLocks.splice(i, 1);
        continue;
      }

      lock.x = target.x;
      lock.y = target.y;

      const elapsed = now - lock.startTime;
      lock.progress = Math.min(1, elapsed / lock.duration);
      target.lockProgress = lock.progress;

      if (lock.progress >= 1 && !lock.completed) {
        lock.completed = true;
        soundManager.playLockAcquired();
        this.fireInterceptorAt(target, lock.batteryType);
        this.activeLocks.splice(i, 1);
      }
    }

    // 4. Update Enemy Missiles with realistic aerodynamics
    for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
      const m = this.enemyMissiles[i];
      m.timeAlive += dt;

      // Behavior by missile class
      if (m.type === 'hypersonic') {
        // Hypersonic Glide Vehicle (HGV):
        // Atmospheric Skip-Glide Wave (wave-riding aerodynamic lift in upper atmosphere)
        m.skipWavePhase = (m.skipWavePhase || 0) + dt * 4.2;
        const skipForce = Math.sin(m.skipWavePhase) * 65 * dt;
        
        // Lateral supersonic jink
        const lateralJink = Math.sin(m.timeAlive * 3.2) * 80 * dt;
        m.x += m.vx * dt + lateralJink;
        m.y += m.vy * dt + skipForce;

        if (!m.hasSonicBoomed && m.y >= this.height * 0.22) {
          m.hasSonicBoomed = true;
          this.screenShakeIntensity = Math.max(this.screenShakeIntensity, 5.5);
          this.callbacks.onScreenNotification(`⚠️ HYPERSONIC THREAT: ${m.name} REACHING MACH ${m.machNumber?.toFixed(1) || '9.8'}!`, 'alert');
        }
      } else if (m.type === 'cruise') {
        // Low-altitude evasive S-curve weaving
        const weaveOffset = Math.sin(m.timeAlive * 3.8) * 75 * dt;
        m.x += m.vx * dt + weaveOffset;
        m.y += m.vy * dt;
      } else if (m.type === 'drone') {
        m.x += m.vx * dt;
        m.y += m.vy * dt + Math.sin(m.timeAlive * 7.5) * 18 * dt;
      } else {
        // Ballistic Scud descent
        m.x += m.vx * dt;
        m.y += m.vy * dt;
      }

      // Trail originates from rocket nozzle
      const currentSpeed = Math.hypot(m.vx, m.vy) || 1;
      const tailOffset = m.isHypersonic ? 16 : 14;
      const tailX = m.x - (m.vx / currentSpeed) * tailOffset;
      const tailY = m.y - (m.vy / currentSpeed) * tailOffset;
      m.trail.push({ x: tailX, y: tailY, alpha: 1.0 });
      if (m.trail.length > (m.isHypersonic ? 38 : 24)) {
        m.trail.shift();
      }
      m.trail.forEach(t => t.alpha -= dt * (m.isHypersonic ? 1.4 : 1.9));

      // MIRV mid-air separation
      if (m.type === 'mirv' && !m.splitTriggered && m.y >= this.height * 0.44) {
        m.splitTriggered = true;
        this.triggerMIRVSplit(m);
      }

      // Check ground/city strike
      if (m.y >= this.height - 40) {
        this.handleMissileGroundImpact(m);
        this.enemyMissiles.splice(i, 1);
        continue;
      }

      // Destroyed by interceptor
      if (m.health <= 0) {
        this.createMissileExplosion(m, 'air');
        this.enemyMissiles.splice(i, 1);
        
        // Country bounty multiplier
        const mult = this.currentCountry.startingBonus.bountyMultiplier || 1.0;
        const finalBounty = Math.round(m.bounty * mult);

        this.score += m.scoreValue;
        this.credits += finalBounty;
        this.waveInterceptions++;
        this.totalInterceptions++;
        this.callbacks.onScoreUpdate(this.score, this.credits);
      }
    }

    // 5. Update Interceptors
    for (let i = this.interceptorMissiles.length - 1; i >= 0; i--) {
      const imp = this.interceptorMissiles[i];
      const target = this.enemyMissiles.find(m => m.id === imp.targetMissileId);

      let destX = imp.targetX;
      let destY = imp.targetY;

      if (target) {
        destX = target.x;
        destY = target.y;
      }

      const dx = destX - imp.x;
      const dy = destY - imp.y;
      const dist = Math.hypot(dx, dy);

      const speed = imp.speed;
      const step = speed * dt;

      if (dist > 4) {
        imp.vx = (dx / dist) * speed;
        imp.vy = (dy / dist) * speed;
      }

      imp.x += imp.vx * dt;
      imp.y += imp.vy * dt;
      imp.distanceTraveled += step;

      const impSpeed = Math.hypot(imp.vx, imp.vy) || 1;
      const impTailOffset = imp.batteryType === 'thaad' ? 18 : 13;
      const impTailX = imp.x - (imp.vx / impSpeed) * impTailOffset;
      const impTailY = imp.y - (imp.vy / impSpeed) * impTailOffset;
      imp.trail.push({ x: impTailX, y: impTailY, alpha: 1.0 });
      if (imp.trail.length > (imp.isKineticHitToKill ? 36 : 26)) {
        imp.trail.shift();
      }
      imp.trail.forEach(t => t.alpha -= dt * 2.1);

      const hitRadius = imp.isKineticHitToKill ? 18 : imp.blastRadius * 0.68;
      const isCloseToTarget = target && Math.hypot(target.x - imp.x, target.y - imp.y) <= hitRadius;
      const reachedDestination = dist <= Math.max(12, step * 1.25);

      if (isCloseToTarget || reachedDestination || imp.y <= 12) {
        this.detonateInterceptor(imp, target);
        this.interceptorMissiles.splice(i, 1);
      }
    }

    // 6. Automated CIWS Phalanx turret
    if (this.ciwsUnlocked) {
      this.updateCIWSTurret(dt);
    }

    // 7. Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.elapsed += dt * 1000;

      const progress = exp.elapsed / exp.duration;
      if (progress < 0.35) {
        exp.currentRadius = (progress / 0.35) * exp.maxRadius;
      } else {
        exp.currentRadius = exp.maxRadius * (1 - (progress - 0.35) / 0.65);
      }

      if (exp.isHarmfulToEnemies && progress < 0.72) {
        for (const m of this.enemyMissiles) {
          const d = Math.hypot(m.x - exp.x, m.y - exp.y);
          if (d <= exp.currentRadius + m.size) {
            const dmg = exp.damage * (1 - d / (exp.currentRadius + m.size));
            m.health -= dmg * dt * 5.5;
          }
        }
      }

      if (exp.elapsed >= exp.duration) {
        this.explosions.splice(i, 1);
      }
    }

    // 8. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= (1 - p.drag * dt);
      p.vy *= (1 - p.drag * dt);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 9. Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * dt * 9;
      sw.alpha -= dt * 2.2;
      if (sw.alpha <= 0.02 || sw.radius >= sw.maxRadius * 0.95) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 10. Screen shake & sweep angles
    if (this.screenShakeIntensity > 0) {
      this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - dt * 11);
    }

    this.radarAngle = (this.radarAngle + dt * 1.6) % (Math.PI * 2);
    this.searchlightAngle1 = Math.sin(now * 0.0008) * 0.65;
    this.searchlightAngle2 = Math.cos(now * 0.0006) * 0.7;

    // 11. Wave Cleared check
    if (
      this.missilesToSpawn.length === 0 && 
      this.enemyMissiles.length === 0 && 
      !this.waveCompleted && 
      this.isRunning
    ) {
      this.waveCompleted = true;
      this.handleWaveCleared();
    }

    // 12. Game Over check
    const aliveCities = this.cities.filter(c => !c.isDestroyed);
    if (aliveCities.length === 0 && this.isRunning) {
      this.handleGameOver();
    }
  }

  private spawnEnemyMissile(type: EnemyType) {
    const aliveCities = this.cities.filter(c => !c.isDestroyed);
    const targetCity = aliveCities.length > 0 
      ? aliveCities[Math.floor(Math.random() * aliveCities.length)]
      : this.cities[Math.floor(Math.random() * this.cities.length)];

    const targetX = targetCity.xRatio * this.width + (Math.random() * 40 - 20);
    const targetY = this.height - 35;
    const startX = Math.random() * (this.width - 80) + 40;
    const startY = -15;

    let speed = 120 + Math.random() * 20 + this.wave * 10;
    let health = 100;
    let bounty = 50;
    let scoreValue = 100;
    let trailColor = '#f87171';
    let coreColor = '#ffffff';
    let size = 6;
    let name = 'Scud-B';
    let isHypersonic = false;
    let machNumber = 3.2;

    if (type === 'cruise') {
      speed = 175 + this.wave * 15;
      health = 80;
      bounty = 75;
      scoreValue = 160;
      trailColor = '#fb923c';
      size = 5;
      name = 'Kalibr Cruise';
      machNumber = 0.9;
    } else if (type === 'drone') {
      speed = 100 + this.wave * 8;
      health = 50;
      bounty = 40;
      scoreValue = 80;
      trailColor = '#facc15';
      size = 4;
      name = 'Shahed Drone';
      machNumber = 0.3;
    } else if (type === 'mirv') {
      speed = 150 + this.wave * 12;
      health = 220;
      bounty = 140;
      scoreValue = 300;
      trailColor = '#ec4899';
      size = 8;
      name = 'SS-18 Satan MIRV';
      machNumber = 7.0;
    } else if (type === 'hypersonic') {
      // Mach 9.2 - Mach 12+ Hypersonic Glide Vehicle (Fast & dramatic, but interceptable!)
      speed = 340 + this.wave * 25;
      health = 200;
      bounty = 240;
      scoreValue = 500;
      trailColor = '#06b6d4'; // Cyan plasma
      coreColor = '#cffafe';
      size = 8;
      name = 'DF-17 Hypersonic Glide';
      isHypersonic = true;
      machNumber = 9.2 + Math.random() * 2.8;
      this.callbacks.onScreenNotification(`⚡ HYPERSONIC GLIDER DETECTED · MACH ${machNumber.toFixed(1)}!`, 'alert');
    } else if (type === 'bunker_buster') {
      speed = 130 + this.wave * 10;
      health = 360;
      bounty = 220;
      scoreValue = 500;
      trailColor = '#dc2626';
      size = 10;
      name = 'Armored Warhead';
      machNumber = 4.5;
    }

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy);
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    this.enemyMissiles.push({
      id: Math.random().toString(36).slice(2, 9),
      type,
      name,
      x: startX,
      y: startY,
      startX,
      startY,
      vx,
      vy,
      targetX,
      targetY,
      targetCityId: targetCity.id,
      speed,
      health,
      maxHealth: health,
      bounty,
      scoreValue,
      trail: [],
      trailColor,
      coreColor,
      size,
      timeAlive: 0,
      isLocked: false,
      lockProgress: 0,
      assignedInterceptors: 0,
      isHypersonic,
      machNumber,
      plasmaGlowRadius: isHypersonic ? 22 : undefined,
      skipWavePhase: 0,
      hasSonicBoomed: false
    });
  }

  private triggerMIRVSplit(parent: EnemyMissile) {
    soundManager.playExplosion('light');
    
    this.shockwaves.push({
      x: parent.x,
      y: parent.y,
      radius: 4,
      maxRadius: 38,
      alpha: 0.95,
      color: '#ec4899',
      lineWidth: 3
    });

    const subCount = 3;
    const aliveCities = this.cities.filter(c => !c.isDestroyed);

    for (let s = 0; s < subCount; s++) {
      const targetCity = aliveCities[s % aliveCities.length] || this.cities[0];
      const targetX = targetCity.xRatio * this.width + (Math.random() * 50 - 25);
      const targetY = this.height - 35;

      const spreadAngle = (s - 1) * 0.38;
      const baseSpeed = parent.speed * 1.15;
      const dx = targetX - parent.x;
      const dy = targetY - parent.y;
      const dist = Math.hypot(dx, dy);

      const vx = Math.cos(Math.atan2(dy, dx) + spreadAngle) * baseSpeed;
      const vy = Math.sin(Math.atan2(dy, dx) + spreadAngle) * baseSpeed;

      this.enemyMissiles.push({
        id: Math.random().toString(36).slice(2, 9),
        type: 'scud',
        name: `MIRV Sub-Warhead #${s + 1}`,
        x: parent.x + (s - 1) * 12,
        y: parent.y + 5,
        startX: parent.x,
        startY: parent.y,
        vx,
        vy,
        targetX,
        targetY,
        targetCityId: targetCity.id,
        speed: baseSpeed,
        health: 80,
        maxHealth: 80,
        bounty: 60,
        scoreValue: 120,
        trail: [],
        trailColor: '#f43f5e',
        coreColor: '#ffffff',
        size: 5,
        timeAlive: 0,
        isLocked: false,
        lockProgress: 0,
        assignedInterceptors: 0,
        machNumber: 6.2
      });
    }

    this.callbacks.onScreenNotification('ALERT: MIRV SPLIT INTO SUB-WARHEADS!', 'alert');
  }

  private detonateInterceptor(imp: InterceptorMissile, target?: EnemyMissile) {
    const isKinetic = imp.isKineticHitToKill;
    const blastRadius = imp.blastRadius;
    const damage = imp.damage;

    // Realistic explosion / kinetic crack
    soundManager.playExplosion(isKinetic ? 'kinetic' : 'medium');
    this.screenShakeIntensity = Math.max(this.screenShakeIntensity, isKinetic ? 5.5 : 3.5);

    this.explosions.push({
      id: Math.random().toString(36).slice(2, 9),
      x: imp.x,
      y: imp.y,
      currentRadius: 4,
      maxRadius: blastRadius,
      duration: isKinetic ? 400 : 560,
      elapsed: 0,
      color: imp.color,
      innerColor: '#ffffff',
      isHarmfulToEnemies: true,
      damage: damage,
      isKineticCrack: isKinetic
    });

    this.shockwaves.push({
      x: imp.x,
      y: imp.y,
      radius: 6,
      maxRadius: blastRadius * 1.6,
      alpha: 1,
      color: isKinetic ? '#f59e0b' : imp.color,
      lineWidth: isKinetic ? 3.5 : 2
    });

    const particleCount = isKinetic ? 28 : 18;
    for (let p = 0; p < particleCount; p++) {
      const angle = Math.random() * Math.PI * 2;
      const pSpeed = Math.random() * 200 + 70;
      this.particles.push({
        x: imp.x,
        y: imp.y,
        vx: Math.cos(angle) * pSpeed,
        vy: Math.sin(angle) * pSpeed,
        life: Math.random() * 0.45 + 0.25,
        maxLife: 0.65,
        size: Math.random() * 3 + 1.5,
        color: Math.random() > 0.4 ? imp.color : '#fef08a',
        gravity: 40,
        drag: 0.1
      });
    }

    if (target) {
      target.health -= damage;
    }
  }

  private handleMissileGroundImpact(missile: EnemyMissile) {
    const targetCity = this.cities.find(c => c.id === missile.targetCityId) || 
      this.cities.reduce((prev, curr) => {
        const d1 = Math.abs(curr.xRatio * this.width - missile.x);
        const d2 = Math.abs(prev.xRatio * this.width - missile.x);
        return d1 < d2 ? curr : prev;
      });

    soundManager.playGroundDetonation();
    this.screenShakeIntensity = 12;

    this.explosions.push({
      id: Math.random().toString(36).slice(2, 9),
      x: missile.x,
      y: this.height - 25,
      currentRadius: 12,
      maxRadius: 85,
      duration: 950,
      elapsed: 0,
      color: '#ef4444',
      innerColor: '#fbbf24',
      isHarmfulToEnemies: false,
      damage: 0,
      isNukeOrGroundStrike: true
    });

    for (let i = 0; i < 35; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = Math.random() * 280 + 90;
      this.particles.push({
        x: missile.x,
        y: this.height - 25,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.85 + 0.4,
        maxLife: 1.25,
        size: Math.random() * 4 + 2,
        color: Math.random() > 0.5 ? '#f97316' : '#ef4444',
        gravity: 320,
        drag: 0.05
      });
    }

    if (targetCity.shields > 0) {
      targetCity.shields--;
      this.callbacks.onScreenNotification(`${targetCity.name.toUpperCase()} SHIELD ABSORPTION SUCCESSFUL!`, 'warning');
      this.callbacks.onCityStatusChange(this.cities);
      return;
    }

    const damageAmount = missile.isHypersonic ? 50 : missile.type === 'bunker_buster' ? 65 : 35;
    targetCity.health = Math.max(0, targetCity.health - damageAmount);

    const casualtyRate = (damageAmount / 100) * 0.35;
    const casualties = Math.floor(targetCity.population * casualtyRate);
    targetCity.population = Math.max(0, targetCity.population - casualties);

    if (targetCity.health <= 0 && !targetCity.isDestroyed) {
      targetCity.isDestroyed = true;
      targetCity.population = 0;
      this.callbacks.onScreenNotification(`CRITICAL BREACH: ${targetCity.name.toUpperCase()} DESTROYED!`, 'alert');
    } else {
      this.callbacks.onScreenNotification(`${targetCity.name.toUpperCase()} DAMAGED! ${casualties.toLocaleString()} CASUALTIES`, 'alert');
    }

    this.callbacks.onCityStatusChange(this.cities);
  }

  private createMissileExplosion(missile: EnemyMissile, type: 'air') {
    soundManager.playExplosion('light');
    this.explosions.push({
      id: Math.random().toString(36).slice(2, 9),
      x: missile.x,
      y: missile.y,
      currentRadius: 5,
      maxRadius: missile.isHypersonic ? 48 : 36,
      duration: 450,
      elapsed: 0,
      color: missile.trailColor,
      innerColor: '#ffffff',
      isHarmfulToEnemies: true,
      damage: 40
    });

    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 130 + 40;
      this.particles.push({
        x: missile.x,
        y: missile.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.4 + 0.2,
        maxLife: 0.6,
        size: Math.random() * 2.5 + 1,
        color: missile.trailColor,
        gravity: 50,
        drag: 0.1
      });
    }
  }

  private updateCIWSTurret(dt: number) {
    this.ciwsCooldown -= dt;
    if (this.ciwsCooldown > 0) return;

    let closestTarget: EnemyMissile | null = null;
    let lowestY = this.height * 0.64;

    for (const m of this.enemyMissiles) {
      if (m.y >= lowestY && m.health > 0) {
        lowestY = m.y;
        closestTarget = m;
      }
    }

    if (closestTarget) {
      this.ciwsCooldown = Math.max(0.08, 0.20 - this.ciwsLevel * 0.04);
      soundManager.playCIWSBurst();

      const turretX = this.width * 0.5;
      const turretY = this.height - 45;

      this.ciwsMuzzleFlash = {
        x: turretX,
        y: turretY,
        targetX: closestTarget.x,
        targetY: closestTarget.y,
        alpha: 1.0
      };

      closestTarget.health -= 38 + this.ciwsLevel * 16;

      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: closestTarget.x,
          y: closestTarget.y,
          vx: (Math.random() - 0.5) * 85,
          vy: (Math.random() - 0.5) * 85,
          life: 0.16,
          maxLife: 0.16,
          size: 2,
          color: '#fbbf24',
          gravity: 0,
          drag: 0.05
        });
      }
    }
  }

  private handleWaveCleared() {
    const accuracy = this.waveMissilesFired > 0 
      ? Math.min(100, Math.round((this.waveInterceptions / this.waveMissilesFired) * 100))
      : 100;

    const aliveCount = this.cities.filter(c => !c.isDestroyed).length;
    const bonusCredits = aliveCount * 120 + Math.floor(accuracy * 2);
    const totalBounty = this.currentWaveConfig.rewardCredits + bonusCredits;

    this.credits += totalBounty;
    this.callbacks.onScoreUpdate(this.score, this.credits);

    const stats: WaveClearStats = {
      wave: this.wave,
      interceptions: this.waveInterceptions,
      accuracy,
      citiesSaved: aliveCount,
      bountyEarned: this.currentWaveConfig.rewardCredits,
      bonusCredits
    };

    soundManager.stopBackgroundSiren();
    soundManager.playPurchaseSound();
    this.callbacks.onWaveComplete(this.wave, stats);
  }

  private handleGameOver() {
    this.isRunning = false;
    soundManager.stopBackgroundSiren();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const accuracy = this.totalMissilesFired > 0 
      ? Math.min(100, Math.round((this.totalInterceptions / this.totalMissilesFired) * 100))
      : 0;

    const casualties = this.cities.reduce((sum, c) => sum + (c.initialPopulation - c.population), 0);

    const stats: GameOverStats = {
      waveReached: this.wave,
      score: this.score,
      interceptions: this.totalInterceptions,
      missilesFired: this.totalMissilesFired,
      accuracy,
      casualties
    };

    this.callbacks.onGameOver(stats);
  }

  public applyUpgrade(upgradeId: string): boolean {
    const upgrade = this.upgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.currentLevel >= upgrade.maxLevel) return false;
    if (this.credits < upgrade.cost) return false;

    this.credits -= upgrade.cost;
    upgrade.currentLevel++;
    upgrade.cost = Math.floor(upgrade.cost * upgrade.costMultiplier);

    if (upgradeId === 'radar_lock_speed') {
      const nextTime = getLockTimeForLevel(upgrade.currentLevel);
      upgrade.effectLabel = `${nextTime.toFixed(2)}s Lock Time`;
      const afterTime = getLockTimeForLevel(upgrade.currentLevel + 1);
      upgrade.nextEffectLabel = upgrade.currentLevel < upgrade.maxLevel 
        ? `${afterTime.toFixed(2)}s Lock Time` 
        : 'MAX LOCK PERFORMANCE';
    } else if (upgradeId === 'radar_multi_target') {
      upgrade.effectLabel = `${upgrade.currentLevel + 1} Simultaneous Locks`;
      upgrade.nextEffectLabel = upgrade.currentLevel < upgrade.maxLevel 
        ? `${upgrade.currentLevel + 2} Concurrent Locks` 
        : 'MAX CONCURRENCY';
    } else if (upgradeId === 'iron_dome_capacity') {
      const bat = this.batteries.get('iron_dome');
      if (bat) {
        bat.maxAmmo += 4;
        bat.ammo = bat.maxAmmo;
      }
      upgrade.effectLabel = `${bat?.maxAmmo} Ready Interceptors`;
      upgrade.nextEffectLabel = `+4 Pod Rockets (${(bat?.maxAmmo || 0) + 4})`;
    } else if (upgradeId === 'iron_dome_frag_radius') {
      const bat = this.batteries.get('iron_dome');
      if (bat) bat.blastRadius = Math.floor(bat.blastRadius * 1.25);
      upgrade.effectLabel = `${bat?.blastRadius}px Blast Radius`;
    } else if (upgradeId === 'patriot_speed') {
      const bat = this.batteries.get('patriot');
      if (bat) bat.missileSpeed = Math.floor(bat.missileSpeed * 1.25);
      upgrade.effectLabel = `Mach ${(bat?.missileSpeed ? bat.missileSpeed / 160 : 5).toFixed(1)} Flight Speed`;
    } else if (upgradeId === 'thaad_kinetic_power') {
      const bat = this.batteries.get('thaad');
      if (bat) bat.blastRadius = Math.floor(bat.blastRadius * 1.3);
      upgrade.effectLabel = `${bat?.blastRadius}px Kinetic Shockwave`;
    } else if (upgradeId === 'city_aegis_shields') {
      this.cities.forEach(c => {
        if (!c.isDestroyed) {
          c.shields = Math.min(3, c.shields + 1);
        }
      });
      upgrade.effectLabel = `${upgrade.currentLevel} Energy Shields per City`;
      this.callbacks.onCityStatusChange(this.cities);
    } else if (upgradeId === 'ciws_phalanx_turret') {
      this.ciwsUnlocked = true;
      this.ciwsLevel = upgrade.currentLevel;
      upgrade.effectLabel = `CIWS Active (Lv ${this.ciwsLevel})`;
    } else if (upgradeId === 'civil_defense_repair') {
      this.cities.forEach(c => {
        if (!c.isDestroyed) {
          c.health = Math.min(c.maxHealth, c.health + 45);
        }
      });
      this.callbacks.onCityStatusChange(this.cities);
    }

    soundManager.playPurchaseSound();
    this.callbacks.onScoreUpdate(this.score, this.credits);
    this.callbacks.onBatteryChange(Array.from(this.batteries.values()));
    return true;
  }

  // =================== RENDERING SYSTEM =================== //

  private render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    if (this.screenShakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      const sy = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      ctx.translate(sx, sy);
    }

    // Sky & Atmospheric Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(0.35, '#090d16');
    skyGrad.addColorStop(0.7, '#0f172a');
    skyGrad.addColorStop(1, '#020617');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(star => {
      ctx.globalAlpha = star.alpha * (0.8 + Math.sin(this.lastTimestamp * star.twinkleSpeed) * 0.2);
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Tactical Radar Grid & Altitude Markers
    this.renderTacticalGrid(ctx, w, h);

    // Searchlights
    this.renderSearchlights(ctx, w, h);

    // Cities & Batteries with country-specific skyline landmarks
    this.renderCitiesAndBatteries(ctx, w, h);

    // CIWS Tracers
    if (this.ciwsMuzzleFlash) {
      this.renderCIWSTracers(ctx);
    }

    // Enemy Missiles with Hypersonic Plasma Glows
    this.renderEnemyMissiles(ctx);

    // Interceptors
    this.renderInterceptors(ctx);

    // Explosions
    this.renderExplosionsAndShockwaves(ctx);

    // Particles
    this.renderParticles(ctx);

    // Targeting Reticles
    this.renderTargetingReticles(ctx);

    ctx.restore();
  }

  private renderTacticalGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;

    const altitudes = [
      { y: h * 0.2, label: 'EXOSPHERE · FL800 · THAAD ENGAGEMENT ZONE' },
      { y: h * 0.45, label: 'STRATOSPHERE · FL450 · HYPERSONIC SKIP HORIZON' },
      { y: h * 0.72, label: 'TROPOSPHERE · FL150 · IRON DOME PROXIMITY LINE' }
    ];

    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';

    altitudes.forEach(alt => {
      ctx.beginPath();
      ctx.setLineDash([4, 6]);
      ctx.moveTo(35, alt.y);
      ctx.lineTo(w - 35, alt.y);
      ctx.stroke();
      ctx.fillText(alt.label, 40, alt.y - 4);
    });
    ctx.setLineDash([]);

    // Rotating Radar Sweep
    const radarCenterX = w * 0.5;
    const radarCenterY = h - 35;
    const radarRadius = Math.max(w, h) * 0.85;

    ctx.save();
    ctx.beginPath();
    ctx.arc(radarCenterX, radarCenterY, radarRadius, 0, Math.PI * 2);
    ctx.clip();

    const sweepGradient = ctx.createConicGradient(this.radarAngle, radarCenterX, radarCenterY);
    sweepGradient.addColorStop(0, 'rgba(14, 165, 233, 0.12)');
    sweepGradient.addColorStop(0.12, 'rgba(14, 165, 233, 0.01)');
    sweepGradient.addColorStop(0.2, 'transparent');
    sweepGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = sweepGradient;
    ctx.beginPath();
    ctx.arc(radarCenterX, radarCenterY, radarRadius, 0, Math.PI * 2);
    ctx.fill();

    [0.25, 0.5, 0.75, 1.0].forEach(factor => {
      ctx.beginPath();
      ctx.arc(radarCenterX, radarCenterY, radarRadius * factor, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.05)';
      ctx.stroke();
    });

    ctx.restore();
    ctx.restore();
  }

  private renderSearchlights(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    const s1X = w * 0.32;
    const s2X = w * 0.68;
    const groundY = h - 35;

    [
      { x: s1X, angle: -Math.PI / 2 + this.searchlightAngle1 },
      { x: s2X, angle: -Math.PI / 2 + this.searchlightAngle2 }
    ].forEach(sl => {
      const beamLength = h * 0.85;
      const targetX = sl.x + Math.cos(sl.angle) * beamLength;
      const targetY = groundY + Math.sin(sl.angle) * beamLength;

      const beamGrad = ctx.createLinearGradient(sl.x, groundY, targetX, targetY);
      beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
      beamGrad.addColorStop(0.6, 'rgba(186, 230, 253, 0.05)');
      beamGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(sl.x - 3, groundY);
      ctx.lineTo(targetX - 28, targetY);
      ctx.lineTo(targetX + 28, targetY);
      ctx.lineTo(sl.x + 3, groundY);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }

  private renderCitiesAndBatteries(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const groundY = h - 35;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, groundY, w, 35);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    this.cities.forEach(city => {
      const cx = city.xRatio * w;
      const cw = city.width;

      ctx.save();

      if (city.isDestroyed) {
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(cx - cw / 2, groundY - 8, cw, 8);
        ctx.fillStyle = '#ef4444';
        ctx.font = '9px "Share Tech Mono", monospace';
        ctx.fillText('DESTROYED', cx - 24, groundY + 16);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;

        const seed = city.skylineSeed;
        const b1H = 18 + (seed % 14);
        const b2H = 28 + ((seed * 3) % 18);
        const b3H = 16 + ((seed * 7) % 12);

        // Building 1
        ctx.fillRect(cx - cw / 2, groundY - b1H, cw * 0.3, b1H);
        ctx.strokeRect(cx - cw / 2, groundY - b1H, cw * 0.3, b1H);

        // Main Center Tower / Landmark
        ctx.fillRect(cx - cw * 0.2, groundY - b2H, cw * 0.4, b2H);
        ctx.strokeRect(cx - cw * 0.2, groundY - b2H, cw * 0.4, b2H);

        // Antenna with blinking red light
        ctx.strokeStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(cx, groundY - b2H);
        ctx.lineTo(cx, groundY - b2H - 12);
        ctx.stroke();

        if (Math.sin(this.lastTimestamp * 0.005) > 0) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(cx, groundY - b2H - 12, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Building 3
        ctx.fillRect(cx + cw * 0.2, groundY - b3H, cw * 0.3, b3H);
        ctx.strokeRect(cx + cw * 0.2, groundY - b3H, cw * 0.3, b3H);

        // Illuminated windows
        ctx.fillStyle = '#fef08a';
        for (let row = 0; row < 3; row++) {
          ctx.fillRect(cx - cw * 0.12, groundY - b2H + 6 + row * 6, 2, 2);
          ctx.fillRect(cx + cw * 0.06, groundY - b2H + 6 + row * 6, 2, 2);
        }

        // Energy Shield Dome
        if (city.shields > 0) {
          ctx.strokeStyle = '#38bdf8';
          ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, groundY, cw * 0.75, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.font = '10px "Share Tech Mono", monospace';
          ctx.fillText(`SHIELD: ${city.shields}`, cx - 22, groundY - cw * 0.75 - 4);
        }

        // Health bar
        const hpPercent = city.health / city.maxHealth;
        const barW = cw * 0.85;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(cx - barW / 2, groundY + 8, barW, 4);

        ctx.fillStyle = hpPercent > 0.5 ? '#10b981' : hpPercent > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(cx - barW / 2, groundY + 8, barW * hpPercent, 4);

        // City & Landmark label
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '9px "Share Tech Mono", monospace';
        const shortName = city.name.split('·')[0].trim();
        ctx.fillText(shortName, cx - barW / 2, groundY + 22);

        if (city.landmark) {
          ctx.fillStyle = '#64748b';
          ctx.font = '8px "Share Tech Mono", monospace';
          ctx.fillText(city.landmark, cx - barW / 2, groundY - b2H - 14);
        }
      }

      ctx.restore();
    });

    // Batteries
    this.batteries.forEach(bat => {
      const bx = bat.x * w;
      const isSelected = bat.type === this.selectedBatteryType;

      ctx.save();
      ctx.fillStyle = isSelected ? bat.color : '#334155';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1;

      ctx.fillRect(bx - 14, groundY - 14, 28, 14);
      ctx.strokeRect(bx - 14, groundY - 14, 28, 14);

      const tubeAngle = -Math.PI / 2 + (bat.x - 0.5) * 0.4;
      ctx.strokeStyle = isSelected ? '#ffffff' : '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - 6, groundY - 8);
      ctx.lineTo(bx - 6 + Math.cos(tubeAngle) * 16, groundY - 8 + Math.sin(tubeAngle) * 16);
      ctx.moveTo(bx + 6, groundY - 8);
      ctx.lineTo(bx + 6 + Math.cos(tubeAngle) * 16, groundY - 8 + Math.sin(tubeAngle) * 16);
      ctx.stroke();

      const ammoDots = Math.min(bat.ammo, 8);
      for (let dot = 0; dot < ammoDots; dot++) {
        ctx.fillStyle = bat.color;
        ctx.fillRect(bx - 10 + dot * 2.8, groundY + 4, 2, 2);
      }

      if (isSelected) {
        ctx.strokeStyle = bat.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, groundY - 7, 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  private renderCIWSTracers(ctx: CanvasRenderingContext2D) {
    if (!this.ciwsMuzzleFlash) return;

    ctx.save();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(this.ciwsMuzzleFlash.x, this.ciwsMuzzleFlash.y);
    ctx.lineTo(this.ciwsMuzzleFlash.targetX, this.ciwsMuzzleFlash.targetY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.ciwsMuzzleFlash.x, this.ciwsMuzzleFlash.y, 6, 0, Math.PI * 2);
    ctx.fill();

    this.ciwsMuzzleFlash.alpha -= 0.25;
    if (this.ciwsMuzzleFlash.alpha <= 0) {
      this.ciwsMuzzleFlash = null;
    }
    ctx.restore();
  }

  private renderEnemyMissiles(ctx: CanvasRenderingContext2D) {
    ctx.save();

    this.enemyMissiles.forEach(m => {
      // 1. Hypersonic Ionized Plasma Envelope & Vapor Rings
      if (m.isHypersonic) {
        // Glowing cyan/magenta ionized plasma sheath around nose
        const plasmaGrad = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, 22);
        plasmaGrad.addColorStop(0, 'rgba(207, 250, 254, 0.9)');
        plasmaGrad.addColorStop(0.3, 'rgba(6, 182, 212, 0.6)');
        plasmaGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.25)');
        plasmaGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = plasmaGrad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 22, 0, Math.PI * 2);
        ctx.fill();

        // Prandtl-Glauert condensation shock cone
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(m.x - m.vx * 0.02, m.y - m.vy * 0.02, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. High-temp smoke/plasma wake trail
      if (m.trail.length > 1) {
        ctx.lineWidth = m.isHypersonic ? 4 : 2;
        for (let i = 0; i < m.trail.length - 1; i++) {
          const p1 = m.trail[i];
          const p2 = m.trail[i + 1];
          ctx.strokeStyle = m.trailColor;
          ctx.globalAlpha = Math.max(0, p1.alpha * (m.isHypersonic ? 0.9 : 0.7));
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      }

      // 3. Realistic Military Missile Model
      const angle = Math.atan2(m.vy, m.vx);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(angle);

      this.drawDetailedEnemyMissile(ctx, m);

      ctx.restore();

      // 4. Tactical Radar Bracket & Mach Speed Telemetry
      ctx.strokeStyle = m.isLocked ? '#22c55e' : m.isHypersonic ? '#06b6d4' : 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = m.isHypersonic ? 1.5 : 1;
      const boxSize = m.isHypersonic ? 26 : 22;
      const cornerLen = 5;

      // Brackets
      ctx.beginPath();
      ctx.moveTo(m.x - boxSize, m.y - boxSize + cornerLen);
      ctx.lineTo(m.x - boxSize, m.y - boxSize);
      ctx.lineTo(m.x - boxSize + cornerLen, m.y - boxSize);

      ctx.moveTo(m.x + boxSize - cornerLen, m.y - boxSize);
      ctx.lineTo(m.x + boxSize, m.y - boxSize);
      ctx.lineTo(m.x + boxSize, m.y - boxSize + cornerLen);

      ctx.moveTo(m.x - boxSize, m.y + boxSize - cornerLen);
      ctx.lineTo(m.x - boxSize, m.y + boxSize);
      ctx.lineTo(m.x - boxSize + cornerLen, m.y + boxSize);

      ctx.moveTo(m.x + boxSize - cornerLen, m.y + boxSize);
      ctx.lineTo(m.x + boxSize, m.y + boxSize);
      ctx.lineTo(m.x + boxSize, m.y + boxSize - cornerLen);
      ctx.stroke();

      // Trajectory forecast line
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = m.isHypersonic ? 'rgba(6, 182, 212, 0.4)' : 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + m.vx * 0.8, m.y + m.vy * 0.8);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tactical Readout
      ctx.fillStyle = m.isLocked ? '#22c55e' : m.isHypersonic ? '#06b6d4' : '#f87171';
      ctx.font = '9px "Share Tech Mono", monospace';
      
      const tagText = m.isHypersonic 
        ? `${m.name.toUpperCase()} · MACH ${m.machNumber?.toFixed(1) || '9.8'}`
        : `${m.name.toUpperCase()}`;

      ctx.fillText(tagText, m.x + boxSize + 4, m.y - 2);

      if (m.maxHealth > 100) {
        const hpR = m.health / m.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(m.x - 16, m.y - boxSize - 6, 32, 3);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(m.x - 16, m.y - boxSize - 6, 32 * hpR, 3);
      }
    });

    ctx.restore();
  }

  private drawDetailedEnemyMissile(ctx: CanvasRenderingContext2D, m: EnemyMissile) {
    switch (m.type) {
      case 'cruise':
        this.drawCruiseMissile(ctx);
        break;
      case 'drone':
        this.drawKamikazeDrone(ctx);
        break;
      case 'mirv':
        this.drawMIRVMissile(ctx);
        break;
      case 'hypersonic':
        this.drawHypersonicWaverider(ctx);
        break;
      case 'bunker_buster':
        this.drawBunkerBusterMissile(ctx);
        break;
      case 'scud':
      default:
        this.drawScudMissile(ctx);
        break;
    }
  }

  private drawScudMissile(ctx: CanvasRenderingContext2D) {
    // 1. Supersonic Rocket Motor Flame & Shock Diamonds
    const flameGrad = ctx.createLinearGradient(-15, 0, -36, 0);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.2, '#fde047');
    flameGrad.addColorStop(0.5, '#f97316');
    flameGrad.addColorStop(0.85, '#ef4444');
    flameGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-15, -3.5);
    ctx.lineTo(-36, 0);
    ctx.lineTo(-15, 3.5);
    ctx.closePath();
    ctx.fill();

    // Shock Diamonds (Mach disks)
    ctx.fillStyle = '#ffffff';
    [-21, -27].forEach(dx => {
      ctx.beginPath();
      ctx.moveTo(dx, -2);
      ctx.lineTo(dx + 2.5, 0);
      ctx.lineTo(dx, 2);
      ctx.lineTo(dx - 2.5, 0);
      ctx.closePath();
      ctx.fill();
    });

    // 2. Engine Bell Nozzle
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-12, -3);
    ctx.lineTo(-16, -4);
    ctx.lineTo(-16, 4);
    ctx.lineTo(-12, 3);
    ctx.closePath();
    ctx.fill();

    // 3. 4 Clipped-Delta Stabilizer Fins
    ctx.fillStyle = '#334155';
    // Top fin
    ctx.beginPath();
    ctx.moveTo(-6, -3.5);
    ctx.lineTo(-15, -9.5);
    ctx.lineTo(-15, -3.5);
    ctx.closePath();
    ctx.fill();
    // Bottom fin
    ctx.beginPath();
    ctx.moveTo(-6, 3.5);
    ctx.lineTo(-15, 9.5);
    ctx.lineTo(-15, 3.5);
    ctx.closePath();
    ctx.fill();
    // Horizontal fin profile
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-6, 0);
    ctx.stroke();

    // 4. Cylindrical Fuselage with 3D cylindrical lighting
    const bodyGrad = ctx.createLinearGradient(0, -3.5, 0, 3.5);
    bodyGrad.addColorStop(0, '#94a3b8'); // Specular highlight
    bodyGrad.addColorStop(0.35, '#475569'); // Olive/slate
    bodyGrad.addColorStop(0.8, '#334155');
    bodyGrad.addColorStop(1, '#0f172a'); // Core drop shadow

    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-12, -3.5, 21, 7);

    // Segment panel lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = 1;
    [-5, 1].forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, -3.5);
      ctx.lineTo(px, 3.5);
      ctx.stroke();
    });

    // Yellow / black guidance telemetry band
    ctx.fillStyle = '#eab308';
    ctx.fillRect(4, -3.5, 3.5, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(5.2, -3.5, 1.1, 7);

    // 5. Conical Ogive Radome (Warhead Nose)
    const noseGrad = ctx.createLinearGradient(9, -3.5, 9, 3.5);
    noseGrad.addColorStop(0, '#f87171');
    noseGrad.addColorStop(0.5, '#dc2626');
    noseGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.moveTo(9, -3.5);
    ctx.lineTo(19, 0); // Sharp nose tip
    ctx.lineTo(9, 3.5);
    ctx.closePath();
    ctx.fill();
  }

  private drawCruiseMissile(ctx: CanvasRenderingContext2D) {
    // 1. Turbofan Jet Exhaust
    const jetGrad = ctx.createLinearGradient(-12, 0, -28, 0);
    jetGrad.addColorStop(0, '#38bdf8');
    jetGrad.addColorStop(0.3, '#f97316');
    jetGrad.addColorStop(0.7, '#ef4444');
    jetGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(-12, -2.5);
    ctx.lineTo(-28, 0);
    ctx.lineTo(-12, 2.5);
    ctx.closePath();
    ctx.fill();

    // 2. Cruise Missile Wings (Slender high-aspect-ratio deployed wings)
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.8;
    // Port wing (top)
    ctx.beginPath();
    ctx.moveTo(1, -2.5);
    ctx.lineTo(-5, -13.5);
    ctx.lineTo(-2, -13.5);
    ctx.lineTo(3, -2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Starboard wing (bottom)
    ctx.beginPath();
    ctx.moveTo(1, 2.5);
    ctx.lineTo(-5, 13.5);
    ctx.lineTo(-2, 13.5);
    ctx.lineTo(3, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wingtip nav lights
    ctx.fillStyle = '#ef4444'; // Red port
    ctx.fillRect(-5, -14, 2, 1.5);
    ctx.fillStyle = '#22c55e'; // Green starboard
    ctx.fillRect(-5, 12.5, 2, 1.5);

    // 3. Tail Steering Stabilizers
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-7, -2.5);
    ctx.lineTo(-13, -7.5);
    ctx.lineTo(-13, -2.5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-7, 2.5);
    ctx.lineTo(-13, 7.5);
    ctx.lineTo(-13, 2.5);
    ctx.closePath();
    ctx.fill();

    // 4. Underside Air Intake Scoop
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-6, 2.8);
    ctx.lineTo(-2, 4.2);
    ctx.lineTo(1, 2.8);
    ctx.closePath();
    ctx.fill();

    // 5. Cylindrical Fuselage with Stealth Radar Absorbing Coating
    const bodyGrad = ctx.createLinearGradient(0, -2.8, 0, 2.8);
    bodyGrad.addColorStop(0, '#64748b');
    bodyGrad.addColorStop(0.4, '#334155');
    bodyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-12, -2.8, 20, 5.6);

    // 6. Rounded Ceramic Radome
    const noseGrad = ctx.createLinearGradient(8, -2.8, 8, 2.8);
    noseGrad.addColorStop(0, '#94a3b8');
    noseGrad.addColorStop(0.5, '#475569');
    noseGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.moveTo(8, -2.8);
    ctx.lineTo(15, 0);
    ctx.lineTo(8, 2.8);
    ctx.closePath();
    ctx.fill();
  }

  private drawKamikazeDrone(ctx: CanvasRenderingContext2D) {
    // 1. Pusher Propeller / Booster Glow
    const boostGrad = ctx.createLinearGradient(-11, 0, -22, 0);
    boostGrad.addColorStop(0, '#facc15');
    boostGrad.addColorStop(0.4, '#ea580c');
    boostGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = boostGrad;
    ctx.beginPath();
    ctx.moveTo(-11, -2);
    ctx.lineTo(-22, 0);
    ctx.lineTo(-11, 2);
    ctx.closePath();
    ctx.fill();

    // 2. Large Delta Flying Wing (Shahed Style)
    const wingGrad = ctx.createLinearGradient(0, -14, 0, 14);
    wingGrad.addColorStop(0, '#334155');
    wingGrad.addColorStop(0.5, '#1e293b');
    wingGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = wingGrad;

    ctx.beginPath();
    ctx.moveTo(11, 0); // Nose tip
    ctx.lineTo(-11, -14); // Left wingtip
    ctx.lineTo(-12, -14);
    ctx.lineTo(-8, 0); // Trailing edge notch
    ctx.lineTo(-12, 14);
    ctx.lineTo(-11, 14); // Right wingtip
    ctx.closePath();
    ctx.fill();

    // Wing panel camo markings
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -4);
    ctx.lineTo(-7, -11);
    ctx.moveTo(4, 4);
    ctx.lineTo(-7, 11);
    ctx.stroke();

    // 3. Wingtip Vertical Stabilizer Winglets
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-12, -14.5, 5, 2);
    ctx.fillRect(-12, 12.5, 5, 2);

    // 4. Center Fuselage Dorsal Spine & Guidance Optic
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(2, -2.5);
    ctx.lineTo(-9, -2);
    ctx.lineTo(-9, 2);
    ctx.lineTo(2, 2.5);
    ctx.closePath();
    ctx.fill();

    // Optical camera window
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(9.5, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMIRVMissile(ctx: CanvasRenderingContext2D) {
    // 1. Dual Heavy Rocket Exhaust Plumes with Shock Diamonds
    [-2.2, 2.2].forEach(yOffset => {
      const plumeGrad = ctx.createLinearGradient(-18, yOffset, -38, yOffset);
      plumeGrad.addColorStop(0, '#ffffff');
      plumeGrad.addColorStop(0.2, '#f43f5e');
      plumeGrad.addColorStop(0.6, '#9333ea');
      plumeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.moveTo(-18, yOffset - 2.5);
      ctx.lineTo(-38, yOffset);
      ctx.lineTo(-18, yOffset + 2.5);
      ctx.closePath();
      ctx.fill();

      // Shock Diamonds
      ctx.fillStyle = '#ffffff';
      [-24, -30].forEach(dx => {
        ctx.beginPath();
        ctx.moveTo(dx, yOffset - 1.8);
        ctx.lineTo(dx + 2, yOffset);
        ctx.lineTo(dx, yOffset + 1.8);
        ctx.lineTo(dx - 2, yOffset);
        ctx.closePath();
        ctx.fill();
      });

      // Nozzle bell
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-18, yOffset - 2.5, 3.5, 5);
    });

    // 2. Heavy Titanium ICBM Main Fuselage
    const bodyGrad = ctx.createLinearGradient(0, -4.8, 0, 4.8);
    bodyGrad.addColorStop(0, '#cbd5e1');
    bodyGrad.addColorStop(0.3, '#64748b');
    bodyGrad.addColorStop(0.8, '#334155');
    bodyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-15, -4.8, 22, 9.6);

    // Segmented stage rings
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    [-9, -2].forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, -4.8);
      ctx.lineTo(px, 4.8);
      ctx.stroke();
    });

    // 3. Iconic Black-and-White Roll Telemetry Pattern (ICBM Signature)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -4.8, 7, 4.8);
    ctx.fillRect(7, 0, 7, 4.8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(7, -4.8, 7, 4.8);
    ctx.fillRect(0, 0, 7, 4.8);

    // 4. Conical Reentry Payload Shroud (MIRV Bus)
    const shroudGrad = ctx.createLinearGradient(14, -4.8, 14, 4.8);
    shroudGrad.addColorStop(0, '#f43f5e');
    shroudGrad.addColorStop(0.5, '#be123c');
    shroudGrad.addColorStop(1, '#881337');
    ctx.fillStyle = shroudGrad;
    ctx.beginPath();
    ctx.moveTo(14, -4.8);
    ctx.lineTo(23, 0); // Extended heavy warhead tip
    ctx.lineTo(14, 4.8);
    ctx.closePath();
    ctx.fill();

    // Heat shield tip
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(20, -1.8);
    ctx.lineTo(23, 0);
    ctx.lineTo(20, 1.8);
    ctx.closePath();
    ctx.fill();
  }

  private drawHypersonicWaverider(ctx: CanvasRenderingContext2D) {
    // 1. Blinding Plasma Scramjet Plume
    const scramGrad = ctx.createLinearGradient(-15, 0, -36, 0);
    scramGrad.addColorStop(0, '#ffffff');
    scramGrad.addColorStop(0.2, '#cffafe');
    scramGrad.addColorStop(0.5, '#06b6d4');
    scramGrad.addColorStop(0.85, '#7c3aed');
    scramGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = scramGrad;
    ctx.beginPath();
    ctx.moveTo(-15, -3.5);
    ctx.lineTo(-36, 0);
    ctx.lineTo(-15, 3.5);
    ctx.closePath();
    ctx.fill();

    // Shock Diamonds in plasma trail
    ctx.fillStyle = '#ffffff';
    [-20, -26].forEach(dx => {
      ctx.beginPath();
      ctx.moveTo(dx, -2.5);
      ctx.lineTo(dx + 3, 0);
      ctx.lineTo(dx, 2.5);
      ctx.lineTo(dx - 3, 0);
      ctx.closePath();
      ctx.fill();
    });

    // 2. Waverider Delta Lifting Body (DF-17 / Dark Eagle)
    const gliderGrad = ctx.createLinearGradient(0, -9.5, 0, 9.5);
    gliderGrad.addColorStop(0, '#94a3b8');
    gliderGrad.addColorStop(0.3, '#334155');
    gliderGrad.addColorStop(0.7, '#1e293b');
    gliderGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = gliderGrad;

    ctx.beginPath();
    ctx.moveTo(21, 0); // Razor sharp nose
    ctx.lineTo(-15, -9.5); // Port swept chine tip
    ctx.lineTo(-15, -4.5);
    ctx.lineTo(-12, 0); // Center notch
    ctx.lineTo(-15, 4.5);
    ctx.lineTo(-15, 9.5); // Starboard swept chine tip
    ctx.closePath();
    ctx.fill();

    // 3. Canted Twin Tail Fins
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(-11, -9.5);
    ctx.lineTo(-16, -12);
    ctx.lineTo(-16, -9.5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-11, 9.5);
    ctx.lineTo(-16, 12);
    ctx.lineTo(-16, 9.5);
    ctx.closePath();
    ctx.fill();

    // 4. Center Aerodynamic Spine
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(-12, -2.2);
    ctx.lineTo(-12, 2.2);
    ctx.closePath();
    ctx.fill();

    // 5. Thermal Stagnation Point (Yellow-hot atmospheric compression heat on nose tip!)
    const heatGrad = ctx.createRadialGradient(21, 0, 0, 21, 0, 6);
    heatGrad.addColorStop(0, '#fef08a');
    heatGrad.addColorStop(0.4, '#f97316');
    heatGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = heatGrad;
    ctx.beginPath();
    ctx.arc(21, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBunkerBusterMissile(ctx: CanvasRenderingContext2D) {
    // 1. Heavy Solid Rocket Plume
    const plumeGrad = ctx.createLinearGradient(-16, 0, -34, 0);
    plumeGrad.addColorStop(0, '#ffffff');
    plumeGrad.addColorStop(0.3, '#f97316');
    plumeGrad.addColorStop(0.8, '#b91c1c');
    plumeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = plumeGrad;
    ctx.beginPath();
    ctx.moveTo(-16, -4);
    ctx.lineTo(-34, 0);
    ctx.lineTo(-16, 4);
    ctx.closePath();
    ctx.fill();

    // 2. Cellular Grid Fins (Heavy penetrator signature)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    [-15, -11].forEach(gx => {
      ctx.strokeRect(gx, -10.5, 3.5, 4.5);
      ctx.strokeRect(gx, 6, 3.5, 4.5);
    });

    // 3. Thick Armored Fuselage
    const armorGrad = ctx.createLinearGradient(0, -4.5, 0, 4.5);
    armorGrad.addColorStop(0, '#64748b');
    armorGrad.addColorStop(0.4, '#334155');
    armorGrad.addColorStop(0.8, '#1e293b');
    armorGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = armorGrad;
    ctx.fillRect(-16, -4.5, 25, 9);

    // Circumferential reinforcement armor bands
    ctx.fillStyle = '#0f172a';
    [-10, -3, 4].forEach(bx => {
      ctx.fillRect(bx, -4.8, 2, 9.6);
    });

    // 4. Hardened Tungsten/Steel Penetrator Cap with Hazard Stripes
    const capGrad = ctx.createLinearGradient(9, -4.5, 9, 4.5);
    capGrad.addColorStop(0, '#475569');
    capGrad.addColorStop(0.5, '#1e293b');
    capGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.moveTo(9, -4.5);
    ctx.lineTo(19, 0); // Heavy solid tungsten point
    ctx.lineTo(9, 4.5);
    ctx.closePath();
    ctx.fill();

    // Hazard warning stripes
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(11, -3);
    ctx.lineTo(14, 1.5);
    ctx.moveTo(14, -2);
    ctx.lineTo(16, 1);
    ctx.stroke();
  }

  private renderInterceptors(ctx: CanvasRenderingContext2D) {
    ctx.save();

    this.interceptorMissiles.forEach(imp => {
      if (imp.trail.length > 1) {
        ctx.lineWidth = imp.isKineticHitToKill ? 3.5 : 2;
        for (let i = 0; i < imp.trail.length - 1; i++) {
          const p1 = imp.trail[i];
          const p2 = imp.trail[i + 1];
          ctx.strokeStyle = imp.color;
          ctx.globalAlpha = Math.max(0, p1.alpha * 0.85);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      }

      const angle = Math.atan2(imp.vy, imp.vx);
      ctx.save();
      ctx.translate(imp.x, imp.y);
      ctx.rotate(angle);

      this.drawDetailedInterceptor(ctx, imp);

      ctx.restore();
    });

    ctx.restore();
  }

  private drawDetailedInterceptor(ctx: CanvasRenderingContext2D, imp: InterceptorMissile) {
    switch (imp.batteryType) {
      case 'patriot':
        this.drawPatriotPAC3(ctx, imp);
        break;
      case 'thaad':
        this.drawTHAADInterceptor(ctx, imp);
        break;
      case 'iron_dome':
      default:
        this.drawIronDomeTamir(ctx, imp);
        break;
    }
  }

  private drawIronDomeTamir(ctx: CanvasRenderingContext2D, imp: InterceptorMissile) {
    // 1. High-Thrust Solid Rocket Motor Plume
    const plumeGrad = ctx.createLinearGradient(-13, 0, -30, 0);
    plumeGrad.addColorStop(0, '#ffffff');
    plumeGrad.addColorStop(0.25, '#7dd3fc');
    plumeGrad.addColorStop(0.65, '#0284c7');
    plumeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = plumeGrad;
    ctx.beginPath();
    ctx.moveTo(-13, -2.5);
    ctx.lineTo(-30, 0);
    ctx.lineTo(-13, 2.5);
    ctx.closePath();
    ctx.fill();

    // Shock diamond
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-18, -1.5);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-18, 1.5);
    ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();

    // 2. 4 Cruciform Tail Steering Fins
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(-6, -2.5);
    ctx.lineTo(-13, -7.5);
    ctx.lineTo(-13, -2.5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-6, 2.5);
    ctx.lineTo(-13, 7.5);
    ctx.lineTo(-13, 2.5);
    ctx.closePath();
    ctx.fill();

    // 3. Slender Tactical White Cylindrical Fuselage
    const bodyGrad = ctx.createLinearGradient(0, -2.5, 0, 2.5);
    bodyGrad.addColorStop(0, '#ffffff'); // Specular highlight
    bodyGrad.addColorStop(0.4, '#e2e8f0');
    bodyGrad.addColorStop(1, '#94a3b8'); // Cylinder shadow
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-12, -2.5, 20, 5);

    // 4. Steerable Forward Canard Fins
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(5, -2.5);
    ctx.lineTo(2, -5.5);
    ctx.lineTo(3.5, -2.5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(5, 2.5);
    ctx.lineTo(2, 5.5);
    ctx.lineTo(3.5, 2.5);
    ctx.closePath();
    ctx.fill();

    // 5. Laser Proximity Sensor Ring & Ogive Radome
    ctx.fillStyle = '#eab308'; // Gold proximity ring
    ctx.fillRect(7, -2.5, 1.8, 5);

    const radomeGrad = ctx.createLinearGradient(8.8, -2.5, 8.8, 2.5);
    radomeGrad.addColorStop(0, '#ffffff');
    radomeGrad.addColorStop(0.5, '#cbd5e1');
    radomeGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = radomeGrad;
    ctx.beginPath();
    ctx.moveTo(8.8, -2.5);
    ctx.lineTo(16, 0); // Sharp radome tip
    ctx.lineTo(8.8, 2.5);
    ctx.closePath();
    ctx.fill();
  }

  private drawPatriotPAC3(ctx: CanvasRenderingContext2D, imp: InterceptorMissile) {
    // 1. High-Velocity Emerald Rocket Plume
    const plumeGrad = ctx.createLinearGradient(-15, 0, -34, 0);
    plumeGrad.addColorStop(0, '#ffffff');
    plumeGrad.addColorStop(0.2, '#6ee7b7');
    plumeGrad.addColorStop(0.6, '#059669');
    plumeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = plumeGrad;
    ctx.beginPath();
    ctx.moveTo(-15, -3);
    ctx.lineTo(-34, 0);
    ctx.lineTo(-15, 3);
    ctx.closePath();
    ctx.fill();

    // Shock diamonds
    ctx.fillStyle = '#ffffff';
    [-20, -26].forEach(dx => {
      ctx.beginPath();
      ctx.moveTo(dx, -1.8);
      ctx.lineTo(dx + 2, 0);
      ctx.lineTo(dx, 1.8);
      ctx.lineTo(dx - 2, 0);
      ctx.closePath();
      ctx.fill();
    });

    // 2. 4 Swept Delta Tail Fins
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(-15, -8.5);
    ctx.lineTo(-15, -3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-7, 3);
    ctx.lineTo(-15, 8.5);
    ctx.lineTo(-15, 3);
    ctx.closePath();
    ctx.fill();

    // 3. Heavy PAC-3 Cylindrical Fuselage
    const bodyGrad = ctx.createLinearGradient(0, -3, 0, 3);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.35, '#e2e8f0');
    bodyGrad.addColorStop(0.8, '#94a3b8');
    bodyGrad.addColorStop(1, '#475569');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-14, -3, 23, 6);

    // Green PAC-3 designation stripe
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, -3, 3, 6);

    // 4. Attitude Control Motor (ACM) Ring
    ctx.fillStyle = '#334155';
    ctx.fillRect(6, -3, 2, 6);

    // 5. Ceramic Ogive Radome
    const noseGrad = ctx.createLinearGradient(9, -3, 9, 3);
    noseGrad.addColorStop(0, '#f8fafc');
    noseGrad.addColorStop(0.5, '#cbd5e1');
    noseGrad.addColorStop(1, '#475569');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.moveTo(9, -3);
    ctx.lineTo(18, 0);
    ctx.lineTo(9, 3);
    ctx.closePath();
    ctx.fill();
  }

  private drawTHAADInterceptor(ctx: CanvasRenderingContext2D, imp: InterceptorMissile) {
    // 1. Kinetic High-Altitude Rocket Plume with Brilliant Mach Shock
    const plumeGrad = ctx.createLinearGradient(-18, 0, -42, 0);
    plumeGrad.addColorStop(0, '#ffffff');
    plumeGrad.addColorStop(0.2, '#fde68a');
    plumeGrad.addColorStop(0.55, '#f59e0b');
    plumeGrad.addColorStop(0.85, '#d97706');
    plumeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = plumeGrad;
    ctx.beginPath();
    ctx.moveTo(-18, -3.8);
    ctx.lineTo(-42, 0);
    ctx.lineTo(-18, 3.8);
    ctx.closePath();
    ctx.fill();

    // Dual Shock Diamonds
    ctx.fillStyle = '#ffffff';
    [-23, -31].forEach(dx => {
      ctx.beginPath();
      ctx.moveTo(dx, -2);
      ctx.lineTo(dx + 2.5, 0);
      ctx.lineTo(dx, 2);
      ctx.lineTo(dx - 2.5, 0);
      ctx.closePath();
      ctx.fill();
    });

    // 2. Flared Conical Booster Skirt (Signature THAAD aerodynamic flared base!)
    const skirtGrad = ctx.createLinearGradient(-18, -4.5, -18, 4.5);
    skirtGrad.addColorStop(0, '#d97706');
    skirtGrad.addColorStop(0.5, '#78350f');
    skirtGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = skirtGrad;
    ctx.beginPath();
    ctx.moveTo(-12, -2.6);
    ctx.lineTo(-18, -5);
    ctx.lineTo(-18, 5);
    ctx.lineTo(-12, 2.6);
    ctx.closePath();
    ctx.fill();

    // 3. Long Needle Slender Fuselage
    const bodyGrad = ctx.createLinearGradient(0, -2.6, 0, 2.6);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.3, '#f1f5f9');
    bodyGrad.addColorStop(0.7, '#94a3b8');
    bodyGrad.addColorStop(1, '#334155');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-12, -2.6, 24, 5.2);

    // Amber staging rings
    ctx.fillStyle = '#f59e0b';
    [-5, 4].forEach(px => {
      ctx.fillRect(px, -2.6, 1.6, 5.2);
    });

    // 4. Kinetic Kill Vehicle (KKV) Shroud & Optical Seeker Window
    const noseGrad = ctx.createLinearGradient(12, -2.6, 12, 2.6);
    noseGrad.addColorStop(0, '#ffffff');
    noseGrad.addColorStop(0.5, '#cbd5e1');
    noseGrad.addColorStop(1, '#475569');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.moveTo(12, -2.6);
    ctx.lineTo(21, 0); // Extended sharp kinetic penetrator tip
    ctx.lineTo(12, 2.6);
    ctx.closePath();
    ctx.fill();

    // Side-mounted sapphire optical infrared seeker window
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(15, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderExplosionsAndShockwaves(ctx: CanvasRenderingContext2D) {
    ctx.save();

    this.shockwaves.forEach(sw => {
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.lineWidth = sw.lineWidth || 2.5;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1.0;

    this.explosions.forEach(exp => {
      const grad = ctx.createRadialGradient(
        exp.x, exp.y, 0,
        exp.x, exp.y, exp.currentRadius
      );
      grad.addColorStop(0, exp.innerColor);
      grad.addColorStop(0.4, exp.color);
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.currentRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  private renderTargetingReticles(ctx: CanvasRenderingContext2D) {
    ctx.save();

    this.activeLocks.forEach(lock => {
      const radius = 24;
      const progress = lock.progress;

      ctx.save();
      ctx.translate(lock.x, lock.y);

      ctx.rotate(this.lastTimestamp * 0.004);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(lock.x, lock.y, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = progress >= 0.9 ? '#22c55e' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Share Tech Mono", monospace';
      const percent = Math.floor(progress * 100);
      ctx.fillText(`LOCK: ${percent}%`, lock.x + 28, lock.y + 4);
    });

    ctx.restore();
  }

  public destroy() {
    this.isRunning = false;
    soundManager.stopBackgroundSiren();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
