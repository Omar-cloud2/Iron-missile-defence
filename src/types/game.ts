export type InterceptorType = 'iron_dome' | 'patriot' | 'thaad' | 'laser';

export type EnemyType = 
  | 'scud'            // Standard ballistic rocket
  | 'cruise'          // Low-altitude fast weaving
  | 'drone'           // Shahed-style delta wing swarm
  | 'mirv'            // Splits into 3-4 warheads mid-air
  | 'hypersonic'      // Hypersonic Glide Vehicle (Mach 8-12)
  | 'bunker_buster'   // Heavy armored warhead with high HP
  | 'emp_chaff';      // Radar-distorting decoy that blinds radar if unintercepted

export type CountryId = 'israel' | 'usa' | 'south_korea' | 'ukraine';

export interface CountryTheater {
  id: CountryId;
  name: string;
  theaterName: string;
  flag: string;
  code: string;
  description: string;
  doctrine: string;
  specialTrait: string;
  cities: {
    id: string;
    name: string;
    xRatio: number;
    population: number;
    landmark?: string;
  }[];
  startingBonus: {
    credits?: number;
    ciwsActive?: boolean;
    ironBeamActive?: boolean;
    extraShields?: number;
    multiLockBonus?: number;
    bountyMultiplier?: number;
    ironDomeCapacityBonus?: number;
    thaadBlastBonus?: number;
    reloadSpeedMultiplier?: number;
  };
  accentColor: string;
}

export interface BatteryConfig {
  type: InterceptorType;
  name: string;
  codeName: string;
  description: string;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  reloadDuration: number; // ms
  missileSpeed: number;
  blastRadius: number;
  damage: number;
  x: number; // calculated ratio 0 to 1
  y: number;
  color: string;
  exhaustColor: string;
  hotkey: string;
  iconName: string;
  unlocked: boolean;
  costToUnlock?: number;
}

export interface City {
  id: string;
  name: string;
  xRatio: number; // 0 to 1 along screen width
  width: number;
  health: number;
  maxHealth: number;
  shields: number;
  maxShields: number;
  population: number;
  initialPopulation: number;
  isDestroyed: boolean;
  skylineSeed: number;
  landmark?: string;
}

export interface EnemyMissile {
  id: string;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  targetCityId?: string;
  speed: number;
  health: number;
  maxHealth: number;
  bounty: number;
  scoreValue: number;
  trail: { x: number; y: number; alpha: number; size?: number }[];
  trailColor: string;
  coreColor: string;
  size: number;
  splitTriggered?: boolean;
  timeAlive: number;
  isLocked: boolean;
  lockProgress: number; // 0 to 1
  assignedInterceptors: number;
  chaffActive?: boolean;
  // Hypersonic specific aerodynamics & physics
  isHypersonic?: boolean;
  machNumber?: number;
  plasmaGlowRadius?: number;
  skipWavePhase?: number;
  vaporConeAlpha?: number;
  hasSonicBoomed?: boolean;
}

export interface InterceptorMissile {
  id: string;
  batteryType: InterceptorType;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetMissileId?: string;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  speed: number;
  blastRadius: number;
  damage: number;
  color: string;
  smokeColor: string;
  trail: { x: number; y: number; alpha: number; width?: number }[];
  isKineticHitToKill: boolean;
  distanceTraveled: number;
  targetDistance: number;
  hasDetonated: boolean;
}

export interface Explosion {
  id: string;
  x: number;
  y: number;
  currentRadius: number;
  maxRadius: number;
  duration: number; // ms
  elapsed: number;  // ms
  color: string;
  innerColor: string;
  isHarmfulToEnemies: boolean;
  damage: number;
  isNukeOrGroundStrike?: boolean;
  isKineticCrack?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth?: number;
}

export interface ActiveLockTarget {
  id: string;
  missileId: string;
  x: number;
  y: number;
  batteryType: InterceptorType;
  startTime: number;
  duration: number; // in ms
  progress: number; // 0 to 1
  completed: boolean;
}

export interface UpgradeItem {
  id: string;
  name: string;
  category: 'radar' | 'batteries' | 'defense';
  description: string;
  currentLevel: number;
  maxLevel: number;
  cost: number;
  costMultiplier: number;
  effectLabel: string;
  nextEffectLabel: string;
  icon: string;
}

export type DefconLevel = 'DEFCON 5' | 'DEFCON 4' | 'DEFCON 3' | 'DEFCON 2' | 'DEFCON 1';

export interface WaveInfo {
  waveNumber: number;
  totalMissiles: number;
  scudCount: number;
  cruiseCount: number;
  droneCount: number;
  mirvCount: number;
  hypersonicCount: number;
  bunkerBusterCount: number;
  empChaffCount: number;
  spawnIntervalMin: number;
  spawnIntervalMax: number;
  simultaneousSpawnsMax: number;
  briefing: string;
  threatWarning: string;
  rewardCredits: number;
}
