import React from 'react';
import { ShieldCheck, Sparkles, Target, ArrowRight, ShoppingBag } from 'lucide-react';
import { WaveClearStats } from '../game/gameEngine';

interface WaveClearedModalProps {
  stats: WaveClearStats;
  onOpenShop: () => void;
  onNextWave: () => void;
}

export const WaveClearedModal: React.FC<WaveClearedModalProps> = ({
  stats,
  onOpenShop,
  onNextWave
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto select-none">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-xl p-6 sm:p-7 shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col items-center text-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center mb-3 text-emerald-400">
          <ShieldCheck className="w-9 h-9" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase mb-1">
          AIRSPACE <span className="text-emerald-400">SECURED</span>
        </h2>
        <div className="text-xs font-mono-hud text-slate-400 tracking-widest uppercase mb-5">
          WAVE {stats.wave} INTERCEPTION REPORT
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 mb-5 text-left font-mono-hud">
          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase">INTERCEPTIONS</div>
              <div className="text-sm font-bold text-white">{stats.interceptions} Targets</div>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">ACCURACY RATING</div>
            <div className="text-sm font-bold text-emerald-400">{stats.accuracy}%</div>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">SECTORS PRESERVED</div>
            <div className="text-sm font-bold text-sky-300">{stats.citiesSaved} / 5 Active</div>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase">EARNED BOUNTY</div>
              <div className="text-sm font-bold text-amber-300">
                +{(stats.bountyEarned + stats.bonusCredits).toLocaleString()} CR
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          <button
            onClick={onOpenShop}
            className="flex-1 py-3 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono-hud text-xs sm:text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.3)]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>UPGRADE RADAR</span>
          </button>

          <button
            onClick={onNextWave}
            className="flex-1 py-3 px-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono-hud text-xs sm:text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)]"
          >
            <span>NEXT WAVE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
