class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Background Air Raid Siren nodes
  // Dual-Rotor Mechanical Air Raid Siren Nodes
  private sirenRotor1: OscillatorNode | null = null;
  private sirenRotor2: OscillatorNode | null = null;
  private sirenSubDrone: OscillatorNode | null = null;
  private sirenNoise: AudioBufferSourceNode | null = null;
  private sirenNoiseFilter: BiquadFilterNode | null = null;
  private sirenWailLfo: OscillatorNode | null = null;
  private sirenFlutterLfo: OscillatorNode | null = null;
  private sirenMasterGain: GainNode | null = null;
  private sirenDelay: DelayNode | null = null;
  private isSirenRunning: boolean = false;

  constructor() {
    // Lazy initialize on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
    if (this.sirenMasterGain && this.ctx) {
      this.sirenMasterGain.gain.setValueAtTime(muted ? 0 : 0.22, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // =================== REALISTIC DUAL-ROTOR MECHANICAL AIR RAID SIREN =================== //

  private makeDistortionCurve(amount: number = 18): Float32Array {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  // Continuous atmospheric dual-rotor mechanical air raid siren (10-port / 12-port minor-third)
  public startBackgroundSiren() {
    if (this.isSirenRunning) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    this.isSirenRunning = true;
    const now = this.ctx.currentTime;

    try {
      // 1. Master siren gain
      const sirenMasterGain = this.ctx.createGain();
      sirenMasterGain.gain.setValueAtTime(0.0001, now);
      // Realistic turbine spool-up fade
      sirenMasterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.22, now + 2.4);

      // 2. Wail LFO with asymmetric periodic wave (steep motor acceleration, sustained peak, inertial drag deceleration)
      const real = new Float32Array([0, 0, 0, 0, 0, 0]);
      const imag = new Float32Array([0, 1.0, 0.38, 0.14, 0.05, 0.02]);
      const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });

      const wailLfo = this.ctx.createOscillator();
      wailLfo.setPeriodicWave(wave);
      wailLfo.frequency.setValueAtTime(0.125, now); // ~8.0-second realistic civil defense wail cycle

      // Micro-flutter LFO for mechanical rotor blade turbulence
      const flutterLfo = this.ctx.createOscillator();
      flutterLfo.type = 'sine';
      flutterLfo.frequency.setValueAtTime(4.2, now);
      const flutterGain = this.ctx.createGain();
      flutterGain.gain.setValueAtTime(5, now);
      flutterLfo.connect(flutterGain);

      // 3. Dual Mechanical Rotors:
      // Rotor 1: Lower 10-port rotor (base 500Hz, sweeps ~340Hz - 660Hz)
      const rotor1 = this.ctx.createOscillator();
      rotor1.type = 'sawtooth';
      rotor1.frequency.setValueAtTime(500, now);

      const lfoGainRotor1 = this.ctx.createGain();
      lfoGainRotor1.gain.setValueAtTime(160, now);
      wailLfo.connect(lfoGainRotor1);
      lfoGainRotor1.connect(rotor1.frequency);
      flutterGain.connect(rotor1.frequency);

      // Rotor 2: Upper 12-port rotor (ratio 1.2 exact minor-third interval, sweeps ~408Hz - 792Hz)
      const rotor2 = this.ctx.createOscillator();
      rotor2.type = 'sawtooth';
      rotor2.frequency.setValueAtTime(600, now);

      const lfoGainRotor2 = this.ctx.createGain();
      lfoGainRotor2.gain.setValueAtTime(192, now);
      wailLfo.connect(lfoGainRotor2);
      lfoGainRotor2.connect(rotor2.frequency);
      flutterGain.connect(rotor2.frequency);

      // 4. Sub-chassis motor drone (110Hz low frequency rumble of the induction motor)
      const subDrone = this.ctx.createOscillator();
      subDrone.type = 'triangle';
      subDrone.frequency.setValueAtTime(110, now);

      const lfoGainSub = this.ctx.createGain();
      lfoGainSub.gain.setValueAtTime(26, now);
      wailLfo.connect(lfoGainSub);
      lfoGainSub.connect(subDrone.frequency);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.3, now);
      subDrone.connect(subGain);

      // 5. Aerodynamic Port Chopping Noise (looping bandpassed air turbulence)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1050, now);
      noiseFilter.Q.setValueAtTime(2.8, now);

      const lfoGainNoise = this.ctx.createGain();
      lfoGainNoise.gain.setValueAtTime(420, now);
      wailLfo.connect(lfoGainNoise);
      lfoGainNoise.connect(noiseFilter.frequency);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);

      // 6. Mixer into Soft-Clipping WaveShaper (for authentic 130dB port-chopping growl)
      const preMixer = this.ctx.createGain();
      preMixer.gain.setValueAtTime(0.45, now);

      rotor1.connect(preMixer);
      rotor2.connect(preMixer);
      subGain.connect(preMixer);
      noiseGain.connect(preMixer);

      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(16) as Float32Array<ArrayBuffer>;
      shaper.oversample = '4x';
      preMixer.connect(shaper);

      // 7. Distance Atmosphere Filter (simulates sound traveling across city night air)
      const distFilter = this.ctx.createBiquadFilter();
      distFilter.type = 'lowpass';
      distFilter.frequency.setValueAtTime(1150, now);
      distFilter.Q.setValueAtTime(0.9, now);
      shaper.connect(distFilter);

      // 8. Urban Reflection Delay Network (creates haunting city skyline echo)
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.setValueAtTime(0.22, now); // 220ms urban slapback

      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.setValueAtTime(0.28, now);

      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.setValueAtTime(800, now);

      delay.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delay);

      // Route dry + wet into sirenMasterGain
      distFilter.connect(sirenMasterGain);
      distFilter.connect(delay);
      delayFilter.connect(sirenMasterGain);

      sirenMasterGain.connect(this.masterGain);

      // Start all sound generators
      wailLfo.start(now);
      flutterLfo.start(now);
      rotor1.start(now);
      rotor2.start(now);
      subDrone.start(now);
      noiseSource.start(now);

      this.sirenRotor1 = rotor1;
      this.sirenRotor2 = rotor2;
      this.sirenSubDrone = subDrone;
      this.sirenNoise = noiseSource;
      this.sirenNoiseFilter = noiseFilter;
      this.sirenWailLfo = wailLfo;
      this.sirenFlutterLfo = flutterLfo;
      this.sirenMasterGain = sirenMasterGain;
      this.sirenDelay = delay;
    } catch {
      // AudioContext policy fallback
    }
  }

  // Stop / realistic motor spool-down of background air raid siren
  public stopBackgroundSiren() {
    if (!this.isSirenRunning) return;
    this.isSirenRunning = false;

    if (this.sirenMasterGain && this.ctx) {
      const now = this.ctx.currentTime;
      // Realistic 2.2-second inertial spool-down to silence
      this.sirenMasterGain.gain.linearRampToValueAtTime(0.0001, now + 2.0);

      if (this.sirenRotor1 && this.sirenRotor2) {
        this.sirenRotor1.frequency.exponentialRampToValueAtTime(80, now + 2.0);
        this.sirenRotor2.frequency.exponentialRampToValueAtTime(96, now + 2.0);
      }

      setTimeout(() => {
        try {
          this.sirenRotor1?.stop();
          this.sirenRotor2?.stop();
          this.sirenSubDrone?.stop();
          this.sirenNoise?.stop();
          this.sirenWailLfo?.stop();
          this.sirenFlutterLfo?.stop();

          this.sirenRotor1?.disconnect();
          this.sirenRotor2?.disconnect();
          this.sirenSubDrone?.disconnect();
          this.sirenNoise?.disconnect();
          this.sirenNoiseFilter?.disconnect();
          this.sirenWailLfo?.disconnect();
          this.sirenFlutterLfo?.disconnect();
          this.sirenMasterGain?.disconnect();
          this.sirenDelay?.disconnect();
        } catch {
          // ignore cleanup errors
        }
        this.sirenRotor1 = null;
        this.sirenRotor2 = null;
        this.sirenSubDrone = null;
        this.sirenNoise = null;
        this.sirenNoiseFilter = null;
        this.sirenWailLfo = null;
        this.sirenFlutterLfo = null;
        this.sirenMasterGain = null;
        this.sirenDelay = null;
      }, 2100);
    }
  }

  // =================== RADAR & TARGETING SOUNDS =================== //

  // Clean tactical radar chirp when tapping / locking
  public playLockStart() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(1250, now + 0.05);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Pure tactical audio chime when lock is acquired (NO spoken speech)
  public playLockAcquired() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Twin affirmative high-tech tone
    [1400, 1950].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      gain.gain.setValueAtTime(0.18, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.055 + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.07);
    });
  }

  // Subtle clean mechanical launcher click (NO missile whoosh/engine noise)
  public playLaunchIronDome() {
    this.playCleanLaunchClick(850);
  }

  public playLaunchPatriot() {
    this.playCleanLaunchClick(600);
  }

  public playLaunchTHAAD() {
    this.playCleanLaunchClick(420);
  }

  private playCleanLaunchClick(frequency: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // =================== EXPLOSIONS & IMPACTS =================== //

  public playExplosion(intensity: 'light' | 'medium' | 'heavy' | 'kinetic' = 'medium') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    if (intensity === 'kinetic') {
      // Kinetic shockwave crack
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = 'sawtooth';
      snap.frequency.setValueAtTime(1800, now);
      snap.frequency.exponentialRampToValueAtTime(140, now + 0.12);
      snapGain.gain.setValueAtTime(0.45, now);
      snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      snap.connect(snapGain);
      snapGain.connect(this.masterGain);
      snap.start(now);
      snap.stop(now + 0.14);

      const boom = this.ctx.createOscillator();
      const boomGain = this.ctx.createGain();
      boom.type = 'triangle';
      boom.frequency.setValueAtTime(140, now + 0.02);
      boom.frequency.exponentialRampToValueAtTime(30, now + 0.38);
      boomGain.gain.setValueAtTime(0.5, now + 0.02);
      boomGain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);
      boom.connect(boomGain);
      boomGain.connect(this.masterGain);
      boom.start(now + 0.02);
      boom.stop(now + 0.4);
      return;
    }

    const duration = intensity === 'light' ? 0.3 : intensity === 'medium' ? 0.5 : 0.8;
    const volume = intensity === 'light' ? 0.25 : intensity === 'medium' ? 0.4 : 0.6;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(intensity === 'heavy' ? 130 : 170, now);
    osc.frequency.exponentialRampToValueAtTime(26, now + duration * 0.7);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);

    this.playNoiseBurst(duration, intensity === 'heavy' ? 700 : 1200, volume * 0.7, 'lowpass');
  }

  // Ground impact on city
  public playGroundDetonation() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 1.2);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.2);

    this.playNoiseBurst(1.0, 500, 0.65, 'lowpass');
  }

  // Brief siren alert blip
  public playSirenAlert() {
    this.startBackgroundSiren();
  }

  // Shop purchase chime
  public playPurchaseSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.16, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.12);
    });
  }

  // CIWS Phalanx Vulcan auto-fire burst
  public playCIWSBurst() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320 - i * 20, now + i * 0.035);
      gain.gain.setValueAtTime(0.14, now + i * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.035 + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.035);
      osc.stop(now + i * 0.035 + 0.04);
    }
  }

  public playLaserPulse() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Noise generator helper
  private playNoiseBurst(
    duration: number, 
    cutoff: number, 
    volume: number, 
    filterType: BiquadFilterType = 'lowpass'
  ) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(cutoff, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + duration);
  }
}

export const soundManager = new SoundManager();
