import React from 'react';
import { 
  Shield, 
  Zap, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Radio, 
  Flame,
  ShoppingBag,
  Sparkles,
  Globe2
} from 'lucide-react';
import { BatteryConfig, City, InterceptorType, CountryTheater } from '../types/game';

interface HUDOverlayProps {
  score: number;
  credits: number;
  wave: number;
  threatWarning: string;
  batteries: BatteryConfig[];
  selectedBattery: InterceptorType;
  cities: City[];
  country: CountryTheater;
  isPaused: boolean;
  isMuted: boolean;
  notification: { message: string; type: 'info' | 'warning' | 'alert' } | null;
  onSelectBattery: (type: InterceptorType) => void;
  onManualReload: (type: InterceptorType) => void;
  onTriggerEMP: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onOpenShop: () => void;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  score,
  credits,
  wave,
  threatWarning,
  batteries,
  selectedBattery,
  cities,
  country,
  isPaused,
  isMuted,
  notification,
  onSelectBattery,
  onManualReload,
  onTriggerEMP,
  onTogglePause,
  onToggleMute,
  onOpenShop
}) => {
  const aliveCitiesCount = cities.filter(c => !c.isDestroyed).length;
  const totalCivilians = cities.reduce((sum, c) => sum + c.population, 0);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* ================= TOP PERIMETER HUD ================= */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Wave & DEFCON Indicator + Country Theater Tag */}
        <div className="pointer-events-auto flex flex-col gap-1 bg-slate-950/80 border border-sky-500/20 rounded p-2.5 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono-hud text-xs sm:text-sm font-bold text-sky-400 tracking-wider uppercase">
              WAVE {wave}
            </span>
            <span className="text-slate-500 text-xs">|</span>
            <span className="font-mono-hud text-xs text-amber-400 font-semibold tracking-wider">
              {threatWarning.split('·')[0].trim()}
            </span>
            <span className="text-slate-600 text-xs hidden sm:inline">|</span>
            {/* Active Theater Tag */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[11px] font-mono-hud">
              <span>{country.flag}</span>
              <span className="text-white font-bold">{country.name.toUpperCase()}</span>
            </div>
          </div>

          <div className="text-[11px] font-mono-hud text-slate-300 tracking-tight hidden sm:block">
            {threatWarning}
          </div>
        </div>

        {/* Center: Mission Notification Toast (Low Occlusion) */}
        {notification && (
          <div className="pointer-events-none transition-all duration-300 animate-bounce">
            <div className={`px-4 py-1.5 rounded border text-xs sm:text-sm font-mono-hud font-bold tracking-wider shadow-lg flex items-center gap-2 ${
              notification.type === 'alert' 
                ? 'bg-red-950/90 border-red-500 text-red-200' 
                : notification.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                : 'bg-sky-950/90 border-sky-500 text-sky-200'
            }`}>
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        {/* Right: Credits, Score & Control Buttons */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          {/* Tactical Credits */}
          <div className="bg-slate-950/80 border border-amber-500/30 rounded px-3 py-1.5 backdrop-blur-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-mono-hud text-slate-400 leading-none">TACTICAL CREDITS</span>
              <span className="font-mono-hud text-sm sm:text-base font-bold text-amber-300 tabular-nums leading-tight">
                {credits.toLocaleString()} CR
              </span>
            </div>
          </div>

          {/* Score */}
          <div className="bg-slate-950/80 border border-sky-500/30 rounded px-3 py-1.5 backdrop-blur-xs flex flex-col text-right hidden sm:flex">
            <span className="text-[9px] font-mono-hud text-slate-400 leading-none">SCORE</span>
            <span className="font-mono-hud text-sm sm:text-base font-bold text-sky-300 tabular-nums leading-tight">
              {score.toLocaleString()}
            </span>
          </div>

          {/* Upgrades Shop Button */}
          <button
            onClick={onOpenShop}
            className="p-2 sm:px-3 sm:py-2 rounded bg-sky-600/80 hover:bg-sky-500 border border-sky-400/50 text-white font-mono-hud text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.3)] transition"
            title="Procurement & Upgrades"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline font-bold">UPGRADES</span>
          </button>

          {/* Audio Mute */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Toggle Air Raid Siren & Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Pause */}
          <button
            onClick={onTogglePause}
            className="p-2 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Pause Game"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </div>

      {/* ================= BOTTOM PERIMETER: BATTERIES & SECTORS ================= */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 mb-8 sm:mb-9">
        {/* Left: Battery Selection Clusters */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-slate-950/85 border border-slate-800 p-2 sm:p-2.5 rounded-lg backdrop-blur-xs">
          {batteries.map((battery) => {
            const isSelected = battery.type === selectedBattery;
            const isReloading = battery.isReloading;
            const isEmpty = battery.ammo === 0;

            let icon = <Shield className="w-4 h-4" />;
            if (battery.type === 'patriot') icon = <Zap className="w-4 h-4" />;
            if (battery.type === 'thaad') icon = <ShieldAlert className="w-4 h-4" />;

            return (
              <div
                key={battery.type}
                onClick={() => onSelectBattery(battery.type)}
                className={`relative flex flex-col p-2 sm:px-3 sm:py-2.5 rounded cursor-pointer transition select-none min-w-[95px] sm:min-w-[125px] border ${
                  isSelected 
                    ? 'bg-slate-900/90 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]' 
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5" style={{ color: isSelected ? battery.color : undefined }}>
                    {icon}
                    <span className="font-bold text-xs uppercase tracking-wide">
                      {battery.name.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-hud px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                    [{battery.hotkey}]
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono-hud text-xs">
                  <span className="text-[10px] text-slate-500 uppercase">AMMO</span>
                  <span className={`font-bold tabular-nums ${
                    isEmpty ? 'text-red-400 animate-pulse' : isSelected ? 'text-white' : 'text-slate-300'
                  }`}>
                    {isReloading ? 'RELOAD' : `${battery.ammo}/${battery.maxAmmo}`}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                  {isReloading ? (
                    <div 
                      className="h-full bg-amber-400 transition-all duration-100" 
                      style={{ width: `${Math.round(battery.reloadProgress * 100)}%` }} 
                    />
                  ) : (
                    <div 
                      className="h-full transition-all duration-150" 
                      style={{ 
                        width: `${Math.round((battery.ammo / battery.maxAmmo) * 100)}%`,
                        backgroundColor: battery.color 
                      }} 
                    />
                  )}
                </div>

                {!isReloading && battery.ammo < battery.maxAmmo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onManualReload(battery.type);
                    }}
                    className="mt-1 text-[9px] font-mono-hud text-sky-400 hover:text-sky-300 tracking-wider text-right uppercase"
                  >
                    Reload (R)
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Emergency Countermeasure & City Survival Ticker */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Tactical EMP Flare Button */}
          <button
            onClick={onTriggerEMP}
            className="group px-3 py-2 sm:px-4 sm:py-2.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 font-mono-hud text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] transition active:scale-95"
            title="Deploy EMP Flash Barrage (150 Credits)"
          >
            <Flame className="w-4 h-4 text-red-400 group-hover:scale-110 transition" />
            <div className="flex flex-col text-left">
              <span className="font-bold leading-none text-red-300">EMP FLARE [SPACE]</span>
              <span className="text-[10px] text-red-400/80 leading-tight">150 CR · DISRUPT WAVE</span>
            </div>
          </button>

          {/* Sectors Integrity Cluster */}
          <div className="bg-slate-950/85 border border-slate-800 px-3 py-2 rounded-lg backdrop-blur-xs flex flex-col text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">
                {country.code} SECTORS
              </span>
              <span className="font-mono-hud text-xs font-bold text-emerald-400 tabular-nums">
                {aliveCitiesCount} / {cities.length} ACTIVE
              </span>
            </div>
            <span className="font-mono-hud text-[11px] text-slate-400 tabular-nums">
              POPULATION: <strong className="text-white">{totalCivilians.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
