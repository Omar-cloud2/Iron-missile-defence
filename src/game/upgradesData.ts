import { UpgradeItem } from '../types/game';

export const INITIAL_UPGRADES: UpgradeItem[] = [
  // RADAR UPGRADES
  {
    id: 'radar_lock_speed',
    name: 'AESA Radar Lock Speed',
    category: 'radar',
    description: 'Increases phased-array pulse frequency to lock incoming missiles faster upon tapping.',
    currentLevel: 0,
    maxLevel: 5,
    cost: 300,
    costMultiplier: 1.8,
    effectLabel: '0.60s Lock Time',
    nextEffectLabel: '0.45s (-25% Lock Time)',
    icon: 'Radio'
  },
  {
    id: 'radar_multi_target',
    name: 'Multi-Target Tracking Core',
    category: 'radar',
    description: 'Allows locking onto multiple missiles simultaneously by tapping in rapid succession.',
    currentLevel: 1,
    maxLevel: 4,
    cost: 450,
    costMultiplier: 2.2,
    effectLabel: '1 Simultaneous Lock',
    nextEffectLabel: '2 Concurrent Locks',
    icon: 'Crosshair'
  },
  {
    id: 'radar_early_warning',
    name: 'Over-The-Horizon Sensor',
    category: 'radar',
    description: 'Expands radar detection ceiling, revealing missile trajectories and altitudes earlier.',
    currentLevel: 0,
    maxLevel: 3,
    cost: 350,
    costMultiplier: 1.9,
    effectLabel: 'Standard Detection',
    nextEffectLabel: '+20% Early Warning HUD',
    icon: 'Activity'
  },

  // BATTERIES & INTERCEPTORS UPGRADES
  {
    id: 'iron_dome_capacity',
    name: 'Iron Dome Extended Pods',
    category: 'batteries',
    description: 'Expands Tamir rocket ready-to-fire magazine capacity for anti-swarm defense.',
    currentLevel: 0,
    maxLevel: 4,
    cost: 350,
    costMultiplier: 1.7,
    effectLabel: '16 Ready Interceptors',
    nextEffectLabel: '20 Ready Interceptors (+4)',
    icon: 'Boxes'
  },
  {
    id: 'iron_dome_frag_radius',
    name: 'Tamir Proximity Fragmentation',
    category: 'batteries',
    description: 'Increases Iron Dome warhead blast radius, taking out tight drone and rocket clusters.',
    currentLevel: 0,
    maxLevel: 4,
    cost: 400,
    costMultiplier: 1.8,
    effectLabel: '38px Blast Radius',
    nextEffectLabel: '48px Blast Radius (+25%)',
    icon: 'Sparkles'
  },
  {
    id: 'patriot_speed',
    name: 'Patriot Solid-Rocket Booster',
    category: 'batteries',
    description: 'Boosts PAC-3 missile acceleration to intercept medium and high-speed cruise threats.',
    currentLevel: 0,
    maxLevel: 4,
    cost: 450,
    costMultiplier: 1.8,
    effectLabel: 'Mach 4.5 Interceptor Speed',
    nextEffectLabel: 'Mach 5.8 (+30% Flight Speed)',
    icon: 'Zap'
  },
  {
    id: 'thaad_kinetic_power',
    name: 'THAAD Exo-Atmospheric Kinetic Kill',
    category: 'batteries',
    description: 'Upgrades THAAD hit-to-kill kinetic impactor with high-energy hypersonic shockwave radius.',
    currentLevel: 0,
    maxLevel: 3,
    cost: 650,
    costMultiplier: 2.0,
    effectLabel: 'Base Kinetic Impact',
    nextEffectLabel: '+40% Kinetic Shockwave Radius',
    icon: 'ShieldAlert'
  },
  {
    id: 'battery_reload_speed',
    name: 'Autoloader Conveyor Systems',
    category: 'batteries',
    description: 'Accelerates replenishment and reloading cycles across all missile batteries.',
    currentLevel: 0,
    maxLevel: 4,
    cost: 500,
    costMultiplier: 1.8,
    effectLabel: 'Standard Reload Speed',
    nextEffectLabel: '-25% Battery Reload Time',
    icon: 'RefreshCw'
  },

  // CIVIL DEFENSE & POINT DEFENSE
  {
    id: 'city_aegis_shields',
    name: 'Kinetic City Energy Shields',
    category: 'defense',
    description: 'Deploys localized plasma barrier over all cities, absorbing direct missile impacts.',
    currentLevel: 0,
    maxLevel: 3,
    cost: 550,
    costMultiplier: 2.1,
    effectLabel: 'No Shields Active',
    nextEffectLabel: '1 Hit Absorption Shield / City',
    icon: 'Shield'
  },
  {
    id: 'ciws_phalanx_turret',
    name: 'Phalanx CIWS 20mm Vulcan',
    category: 'defense',
    description: 'Automated high-rate-of-fire radar-guided Gatling cannon intercepts low-altitude leakers.',
    currentLevel: 0,
    maxLevel: 3,
    cost: 750,
    costMultiplier: 2.2,
    effectLabel: 'Offline',
    nextEffectLabel: 'Install 1x Automated CIWS Turret',
    icon: 'Crosshair'
  },
  {
    id: 'civil_defense_repair',
    name: 'Emergency Engineering Brigades',
    category: 'defense',
    description: 'Instantly dispatches rapid structural engineering teams to restore damaged city HP.',
    currentLevel: 0,
    maxLevel: 99,
    cost: 300,
    costMultiplier: 1.3,
    effectLabel: 'Reusable City Repair',
    nextEffectLabel: 'Repair +40% City Integrity',
    icon: 'Wrench'
  }
];

export function getLockTimeForLevel(level: number): number {
  switch (level) {
    case 0: return 0.40; // 400ms (crisp & responsive from wave 1)
    case 1: return 0.28; // 280ms
    case 2: return 0.18; // 180ms
    case 3: return 0.10; // 100ms
    case 4: return 0.05; // 50ms
    case 5: return 0.02; // 20ms (near-instantaneous fire)
    default: return 0.02;
  }
}
