import { WaveInfo } from '../types/game';

export const WAVE_CONFIGS: WaveInfo[] = [
  {
    waveNumber: 1,
    totalMissiles: 10,
    scudCount: 7,
    cruiseCount: 2,
    droneCount: 0,
    mirvCount: 0,
    hypersonicCount: 1,
    bunkerBusterCount: 0,
    empChaffCount: 0,
    spawnIntervalMin: 1500,
    spawnIntervalMax: 2400,
    simultaneousSpawnsMax: 1,
    briefing: "ALERT: Hostile ballistic missiles inbound with 1 EXPERIMENTAL HYPERSONIC GLIDER (Mach 9+) in the vanguard. Tap incoming warheads to acquire radar lock. Use Iron Dome for rockets and switch to THAAD for the hypersonic threat.",
    threatWarning: "DEFCON 3 · INITIAL BALLISTIC SALVO & 1x HYPERSONIC GLIDER",
    rewardCredits: 600
  },
  {
    waveNumber: 2,
    totalMissiles: 16,
    scudCount: 8,
    cruiseCount: 5,
    droneCount: 1,
    mirvCount: 0,
    hypersonicCount: 2,
    bunkerBusterCount: 0,
    empChaffCount: 0,
    spawnIntervalMin: 1300,
    spawnIntervalMax: 2100,
    simultaneousSpawnsMax: 2,
    briefing: "DEFCON 2: Enemy is deploying 2 Mach 10+ Waverider Hypersonic missiles alongside low-altitude cruise salvos. Switch between Iron Dome and THAAD batteries to defend all sectors.",
    threatWarning: "DEFCON 2 · 2x HYPERSONIC GLIDERS + LOW-ALTITUDE CRUISE",
    rewardCredits: 900
  },
  {
    waveNumber: 3,
    totalMissiles: 22,
    scudCount: 7,
    cruiseCount: 5,
    droneCount: 6,
    mirvCount: 0,
    hypersonicCount: 4,
    bunkerBusterCount: 0,
    empChaffCount: 0,
    spawnIntervalMin: 1100,
    spawnIntervalMax: 1800,
    simultaneousSpawnsMax: 2,
    briefing: "SWARM & HYPERSONIC COORDINATION: Fast kamikaze drone clusters detected alongside 4 Mach 10.5 Hypersonic gliders. Keep batteries reloaded and trigger EMP flares if overwhelmed!",
    threatWarning: "DEFCON 2 · 4x HYPERSONIC GLIDERS + DRONE SWARMS",
    rewardCredits: 1250
  },
  {
    waveNumber: 4,
    totalMissiles: 26,
    scudCount: 6,
    cruiseCount: 6,
    droneCount: 4,
    mirvCount: 4,
    hypersonicCount: 5,
    bunkerBusterCount: 1,
    empChaffCount: 0,
    spawnIntervalMin: 950,
    spawnIntervalMax: 1550,
    simultaneousSpawnsMax: 3,
    briefing: "STRATOSPHERIC SPLIT RAID: Inbound SS-18 MIRVs will split into multiple warheads at 55% altitude, flanked by 5 Mach 11 Hypersonic gliders. Intercept them early in the upper atmosphere!",
    threatWarning: "DEFCON 2 · 5x HYPERSONIC GLIDERS + STRATOSPHERIC MIRVs",
    rewardCredits: 1650
  },
  {
    waveNumber: 5,
    totalMissiles: 32,
    scudCount: 6,
    cruiseCount: 7,
    droneCount: 6,
    mirvCount: 4,
    hypersonicCount: 7,
    bunkerBusterCount: 2,
    empChaffCount: 0,
    spawnIntervalMin: 850,
    spawnIntervalMax: 1400,
    simultaneousSpawnsMax: 3,
    briefing: "SATURATION BREACH: 7 Hypersonic Glide Vehicles entering atmosphere at Mach 11+ with ionized plasma envelopes. Heavy bunker buster warheads require sustained battery fire.",
    threatWarning: "DEFCON 1 · 7x HYPERSONIC GLIDERS + HEAVY WARHEADS",
    rewardCredits: 2150
  },
  {
    waveNumber: 6,
    totalMissiles: 38,
    scudCount: 6,
    cruiseCount: 8,
    droneCount: 6,
    mirvCount: 5,
    hypersonicCount: 10,
    bunkerBusterCount: 3,
    empChaffCount: 0,
    spawnIntervalMin: 750,
    spawnIntervalMax: 1250,
    simultaneousSpawnsMax: 4,
    briefing: "MAXIMUM THREAT LEVEL: 10 Mach 12 Hypersonic Glide Vehicles in coordinated assault waves. Armor-piercing bunker busters targeting command bunkers.",
    threatWarning: "DEFCON 1 · 10x HYPERSONIC SATURATION RAID",
    rewardCredits: 2800
  },
  {
    waveNumber: 7,
    totalMissiles: 44,
    scudCount: 8,
    cruiseCount: 9,
    droneCount: 7,
    mirvCount: 5,
    hypersonicCount: 12,
    bunkerBusterCount: 3,
    empChaffCount: 0,
    spawnIntervalMin: 650,
    spawnIntervalMax: 1100,
    simultaneousSpawnsMax: 4,
    briefing: "ALL-OUT STRATEGIC BOMBARDMENT: Full enemy arsenal airborne. 12 Hypersonic gliders, MIRVs, and cruise salvos attacking all cities at once. Total defense protocol active!",
    threatWarning: "DEFCON 1 · GLOBAL SATURATION WARFARE · WAVE 7",
    rewardCredits: 3600
  }
];

export function getWaveConfig(wave: number): WaveInfo {
  if (wave <= WAVE_CONFIGS.length) {
    return WAVE_CONFIGS[wave - 1];
  }

  // Procedural wave past wave 7
  const excess = wave - 7;
  const total = 52 + excess * 8;
  const hypersonicCount = Math.min(26, 16 + excess * 2);

  return {
    waveNumber: wave,
    totalMissiles: total,
    scudCount: 8 + Math.floor(excess * 1.5),
    cruiseCount: 10 + excess,
    droneCount: 10 + excess * 2,
    mirvCount: Math.min(10, 6 + Math.floor(excess * 0.8)),
    hypersonicCount,
    bunkerBusterCount: Math.min(8, 4 + Math.floor(excess * 0.5)),
    empChaffCount: 0,
    spawnIntervalMin: Math.max(300, 420 - excess * 20),
    spawnIntervalMax: Math.max(600, 800 - excess * 30),
    simultaneousSpawnsMax: Math.min(7, 5 + Math.floor(excess / 2)),
    briefing: `DEFCON 1 CONTINUOUS SIEGE: Wave ${wave}. Extreme saturation barrage with ${hypersonicCount} Mach 12+ Hypersonic Glide Vehicles detected.`,
    threatWarning: `DEFCON 1 · ENDLESS DEFENSE PROTOCOL · ${hypersonicCount}x HYPERSONICS`,
    rewardCredits: 3500 + excess * 600
  };
}
