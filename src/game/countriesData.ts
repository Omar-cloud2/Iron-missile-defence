import { CountryTheater } from '../types/game';

export const COUNTRY_THEATERS: CountryTheater[] = [
  {
    id: 'israel',
    name: 'Israel',
    theaterName: 'Operation Iron Shield · Levant Air Corridor',
    flag: '🇮🇱',
    code: 'ISR',
    description: 'Protect civilian centers from dense rocket barrages, suicide drone swarms, and ballistic missiles.',
    doctrine: 'Multi-Tiered Swarm & Proximity Defense',
    specialTrait: '+30% Iron Dome Pod Capacity · 20% Faster Reload · Iron Beam Point Defense Active',
    cities: [
      { id: 'tel_aviv', name: 'Tel Aviv · Coast', xRatio: 0.14, population: 470000, landmark: 'Azrieli Center' },
      { id: 'jerusalem', name: 'Jerusalem Citadel', xRatio: 0.32, population: 980000, landmark: 'Old City Walls' },
      { id: 'haifa', name: 'Haifa Naval Port', xRatio: 0.50, population: 290000, landmark: 'Mount Carmel Bay' },
      { id: 'beersheba', name: 'Beersheba Desert Base', xRatio: 0.68, population: 220000, landmark: 'Tech Park' },
      { id: 'eilat', name: 'Eilat Southern Port', xRatio: 0.86, population: 53000, landmark: 'Red Sea Gulf' }
    ],
    startingBonus: {
      ironDomeCapacityBonus: 6,
      reloadSpeedMultiplier: 1.25,
      ironBeamActive: true,
      credits: 100
    },
    accentColor: '#38bdf8'
  },
  {
    id: 'usa',
    name: 'United States',
    theaterName: 'NORAD Homeland Defense · North America',
    flag: '🇺🇸',
    code: 'USA',
    description: 'Exo-atmospheric interception of intercontinental hypersonic glide vehicles, MIRV warheads, and cruise missiles.',
    doctrine: 'Global Exo-Atmospheric Kinetic Kill',
    specialTrait: '+35% THAAD Kinetic Shockwave · Extended Radar Horizon · +300 Starting Credits',
    cities: [
      { id: 'wash_dc', name: 'Washington D.C. · Capital', xRatio: 0.14, population: 710000, landmark: 'Capitol & Monument' },
      { id: 'new_york', name: 'New York · Metropolis', xRatio: 0.32, population: 8330000, landmark: 'One WTC Tower' },
      { id: 'norfolk', name: 'Norfolk Naval Base', xRatio: 0.50, population: 240000, landmark: 'Carrier Docks' },
      { id: 'chicago', name: 'Chicago · Great Lakes', xRatio: 0.68, population: 2740000, landmark: 'Willis Tower' },
      { id: 'los_angeles', name: 'Los Angeles · Pacific', xRatio: 0.86, population: 3890000, landmark: 'Coastal Skyline' }
    ],
    startingBonus: {
      thaadBlastBonus: 25,
      credits: 300,
      multiLockBonus: 1
    },
    accentColor: '#60a5fa'
  },
  {
    id: 'south_korea',
    name: 'South Korea',
    theaterName: 'K-AMD Peninsula Defense · DMZ Perimeter',
    flag: '🇰🇷',
    code: 'KOR',
    description: 'High-density defense against super-heavy artillery salvos, KN-23 maneuverable missiles, and saturation strikes.',
    doctrine: 'Integrated Peninsula Anti-Missile Defense (K-AMD)',
    specialTrait: 'Automated Phalanx CIWS Active From Wave 1 · Multi-Target Radar Lv 2 Pre-Installed',
    cities: [
      { id: 'seoul', name: 'Seoul Capital Hub', xRatio: 0.14, population: 9400000, landmark: 'N Seoul Tower' },
      { id: 'incheon', name: 'Incheon International Port', xRatio: 0.32, population: 2980000, landmark: 'Incheon Bridge' },
      { id: 'osan', name: 'Osan Air Defense Base', xRatio: 0.50, population: 230000, landmark: 'Phased Radome' },
      { id: 'busan', name: 'Busan Maritime Harbor', xRatio: 0.68, population: 3340000, landmark: 'Gwangandaegyo' },
      { id: 'daegu', name: 'Daegu Industrial Sector', xRatio: 0.86, population: 2380000, landmark: 'Tower 83' }
    ],
    startingBonus: {
      ciwsActive: true,
      multiLockBonus: 1,
      credits: 150
    },
    accentColor: '#34d399'
  },
  {
    id: 'ukraine',
    name: 'Ukraine',
    theaterName: 'Sky Fortress · Eastern European Shield',
    flag: '🇺🇦',
    code: 'UKR',
    description: 'Counter massive Kalibr/Kh-101 cruise missile volleys, Shahed swarms, and Kinzhal aeroballistic hypersonics.',
    doctrine: 'Agile Distributed Defense & Civil Grid Resilience',
    specialTrait: '+35% Bounty Per Interception · +1 Kinetic Shield On All Cities · Rapid Cheap Repairs',
    cities: [
      { id: 'kyiv', name: 'Kyiv Citadel', xRatio: 0.14, population: 2950000, landmark: 'Motherland Monument' },
      { id: 'odesa', name: 'Odesa Black Sea Port', xRatio: 0.32, population: 1010000, landmark: 'Vorontsov Beacon' },
      { id: 'kharkiv', name: 'Kharkiv Frontier', xRatio: 0.50, population: 1420000, landmark: 'Freedom Square' },
      { id: 'dnipro', name: 'Dnipro Energy Grid', xRatio: 0.68, population: 980000, landmark: 'Hydro Dam' },
      { id: 'lviv', name: 'Lviv Logistics Corridor', xRatio: 0.86, population: 720000, landmark: 'Rathaus Tower' }
    ],
    startingBonus: {
      bountyMultiplier: 1.35,
      extraShields: 1,
      credits: 200
    },
    accentColor: '#facc15'
  }
];

export function getCountryTheater(id: string): CountryTheater {
  return COUNTRY_THEATERS.find(c => c.id === id) || COUNTRY_THEATERS[0];
}
