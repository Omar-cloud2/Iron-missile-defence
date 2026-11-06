import React from 'react';
import { 
  Shield, 
  Zap, 
  ShieldAlert, 
  Crosshair, 
  Volume2, 
  VolumeX, 
  Play, 
  Globe2, 
  Radio
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { CountryId } from '../types/game';
import { COUNTRY_THEATERS } from '../game/countriesData';

interface TitleScreenProps {
  selectedCountry: CountryId;
  onSelectCountry: (countryId: CountryId) => void;
  onStart: () => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedCountry,
  onSelectCountry,
  onStart,
  highScore,
  isMuted,
  onToggleMute
}) => {
  const currentTheater = COUNTRY_THEATERS.find(c => c.id === selectedCountry) || COUNTRY_THEATERS[0];

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-4 sm:p-8 pointer-events-auto bg-slate-950/85 backdrop-blur-xs select-none overflow-y-auto">
      {/* Top Bar with DEFCON, Audio & Theater */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b border-sky-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono-hud text-xs tracking-widest text-emerald-400 font-semibold uppercase">
            AEGIS AIR DEFENSE COMMAND · ALL THEATERS OPERATIONAL
          </span>
        </div>
        <div className="flex items-center gap-4">
          {highScore > 0 && (
            <span className="font-mono-hud text-xs text-amber-400/90 tracking-wider">
              HIGH SCORE: <span className="text-white font-bold">{highScore.toLocaleString()}</span>
            </span>
          )}
          <button
            onClick={onToggleMute}
            className="p-2 rounded border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-2 text-xs font-mono-hud cursor-pointer"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            <span>{isMuted ? 'MUTED' : 'AIR RAID SIREN ON'}</span>
          </button>
        </div>
      </div>

      {/* Hero Centerpiece & Title Lockup */}
      <div className="flex flex-col items-center text-center max-w-3xl my-auto py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-sky-500/30 bg-sky-950/40 text-sky-400 text-xs font-mono-hud mb-3 tracking-widest uppercase">
          <Crosshair className="w-3.5 h-3.5" />
          <span>Multi-Tier Air Defense Simulator · Hypersonic Mach 10 Ready</span>
        </div>

        {/* Bespoke Tactical Title */}
        <div className="relative mb-2">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase italic drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]">
            IRON <span className="text-sky-400">SHIELD</span>
          </h1>
          <div className="text-xs sm:text-sm font-mono-hud tracking-[0.3em] text-slate-400 uppercase mt-0.5">
            MISSILE DEFENSE INTERCEPT PROTOCOL
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 mb-5 max-w-2xl font-normal leading-relaxed">
          Enemy forces have initiated strategic saturation bombardment against key sectors.
          <strong className="text-sky-400 font-semibold"> Tap incoming projectiles to lock radar</strong> and fire Iron Dome, Patriot, and THAAD batteries while emergency sirens wail across defended cities.
        </p>

        {/* ================= COUNTRY THEATER SELECTOR ================= */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="font-mono-hud text-xs font-bold text-sky-400 tracking-wider flex items-center gap-1.5 uppercase">
              <Globe2 className="w-4 h-4" />
              <span>SELECT COUNTRY THEATER & DEFENSE DOCTRINE:</span>
            </span>
            <span className="font-mono-hud text-[11px] text-slate-400">
              Active: <strong className="text-white">{currentTheater.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {COUNTRY_THEATERS.map((country) => {
              const isSelected = country.id === selectedCountry;
              return (
                <div
                  key={country.id}
                  onClick={() => {
                    onSelectCountry(country.id);
                    soundManager.playLockStart();
                  }}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition select-none flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)] ring-1 ring-sky-400'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{country.flag}</span>
                      <span className="text-[10px] font-mono-hud px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        {country.code}
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-white uppercase tracking-wide mb-0.5">
                      {country.name}
                    </div>
                    <div className="text-[10px] font-mono-hud text-sky-300 line-clamp-1 mb-1.5">
                      {country.doctrine}
                    </div>
                  </div>

                  <div className="text-[9px] font-mono-hud text-emerald-400/90 border-t border-slate-800/80 pt-1.5 leading-tight">
                    {country.specialTrait}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interceptor Showcase Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full mb-6 text-left">
          <div className="p-3 rounded border border-sky-500/20 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sky-400 mb-1 font-bold text-xs uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Iron Dome (Tamir)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Rapid salvo cold-launch pneumatic eject & fragmentation blast against drone swarms, rockets, and low cruise missiles.
            </p>
          </div>

          <div className="p-3 rounded border border-emerald-500/20 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-400 mb-1 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>Patriot PAC-3</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Thunderous solid-booster roar with hit-to-kill kinetic penetrators for high-altitude ballistic & supersonic targets.
            </p>
          </div>

          <div className="p-3 rounded border border-amber-500/20 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-amber-400 mb-1 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>THAAD (Mach 8+)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Exo-atmospheric hyper-velocity kinetic strike weapon purpose-built to stop Mach 10+ Hypersonic Gliders and MIRVs.
            </p>
          </div>
        </div>

        {/* Start CTA Button */}
        <button
          onClick={() => {
            soundManager.playLockAcquired();
            onStart();
          }}
          className="group relative px-8 py-3.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold tracking-wider text-base uppercase transition transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(56,189,248,0.4)] flex items-center gap-3 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>DEPLOY DEFENSE SHIELD · {currentTheater.name.toUpperCase()}</span>
        </button>

        {/* Flat control-hint line */}
        <div className="mt-3 text-xs font-mono-hud text-slate-400 tracking-wider">
          Tap Projectiles to Lock · Keys 1-3 Battery Select · Space EMP Flare · Atmospheric Air Raid Siren
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-5xl flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] font-mono-hud text-slate-500">
        <span className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-sky-400" />
          <span>STATUS: DEFCON 4 · HYPERSONIC GLIDE TRACKING READY</span>
        </span>
        <span>THEATER: {currentTheater.theaterName.toUpperCase()}</span>
      </div>
    </div>
  );
};
