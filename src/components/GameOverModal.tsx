import React from 'react';
import { RotateCcw, Crosshair, Users, Target } from 'lucide-react';
import { GameOverStats } from '../game/gameEngine';

interface GameOverModalProps {
  stats: GameOverStats;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onReturnToTitle
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md pointer-events-auto select-none">
      <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-xl p-6 sm:p-8 shadow-[0_0_60px_rgba(239,68,68,0.25)] flex flex-col items-center text-center">
        {/* Skull / Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center mb-4 text-red-500">
          <Crosshair className="w-8 h-8 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase mb-1">
          ALL SECTORS <span className="text-red-500">DESTROYED</span>
        </h2>
        <div className="text-xs font-mono-hud text-slate-400 tracking-widest uppercase mb-6">
          AIR DEFENSE GRID BREACHED · MISSION DEBRIEFING
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] font-mono-hud text-slate-400 uppercase">FINAL WAVE</div>
            <div className="text-lg font-bold font-mono-hud text-amber-400">
              WAVE {stats.waveReached}
            </div>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] font-mono-hud text-slate-400 uppercase">TOTAL SCORE</div>
            <div className="text-lg font-bold font-mono-hud text-sky-400">
              {stats.score.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] font-mono-hud text-slate-400 uppercase">INTERCEPTIONS</div>
              <div className="text-sm font-bold font-mono-hud text-white">
                {stats.interceptions} / {stats.missilesFired} ({stats.accuracy}%)
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-red-400" />
            <div>
              <div className="text-[10px] font-mono-hud text-slate-400 uppercase">CASUALTIES</div>
              <div className="text-sm font-bold font-mono-hud text-red-300">
                {stats.casualties.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onRestart}
            className="w-full py-3 px-4 rounded bg-red-600 hover:bg-red-500 text-white font-bold font-mono-hud text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.35)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART DEFENSE MISSION</span>
          </button>

          <button
            onClick={onReturnToTitle}
            className="w-full py-2.5 px-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono-hud text-xs tracking-wider uppercase transition cursor-pointer"
          >
            RETURN TO COMMAND TITLE
          </button>
        </div>
      </div>
    </div>
  );
};
