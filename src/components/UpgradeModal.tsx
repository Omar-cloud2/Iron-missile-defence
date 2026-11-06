import React, { useState } from 'react';
import { 
  Radio, 
  Crosshair, 
  Shield, 
  Zap, 
  ShieldAlert, 
  Wrench, 
  Boxes, 
  Sparkles, 
  RefreshCw, 
  Play, 
  X,
  ChevronRight,
  Activity
} from 'lucide-react';
import { UpgradeItem } from '../types/game';

interface UpgradeModalProps {
  upgrades: UpgradeItem[];
  credits: number;
  wave: number;
  isBetweenWaves: boolean;
  onApplyUpgrade: (upgradeId: string) => void;
  onClose: () => void;
  onStartNextWave?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  upgrades,
  credits,
  wave,
  isBetweenWaves,
  onApplyUpgrade,
  onClose,
  onStartNextWave
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'radar' | 'batteries' | 'defense'>('all');

  const filteredUpgrades = activeTab === 'all' 
    ? upgrades 
    : upgrades.filter(u => u.category === activeTab);

  const getUpgradeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Radio': return <Radio className="w-5 h-5 text-sky-400" />;
      case 'Crosshair': return <Crosshair className="w-5 h-5 text-emerald-400" />;
      case 'Activity': return <Activity className="w-5 h-5 text-indigo-400" />;
      case 'Boxes': return <Boxes className="w-5 h-5 text-sky-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-emerald-400" />;
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case 'RefreshCw': return <RefreshCw className="w-5 h-5 text-teal-400" />;
      case 'Shield': return <Shield className="w-5 h-5 text-blue-400" />;
      case 'Wrench': return <Wrench className="w-5 h-5 text-orange-400" />;
      default: return <Shield className="w-5 h-5 text-sky-400" />;
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md pointer-events-auto select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-sky-500/30 rounded-xl shadow-[0_0_50px_rgba(15,23,42,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-sky-950/80 border border-sky-500/40 text-sky-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-wider text-white uppercase flex items-center gap-2">
                <span>DEFENSE PROCUREMENT & RADAR UPGRADES</span>
                {isBetweenWaves && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono-hud font-normal">
                    WAVE {wave} CLEARED
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono-hud">
                Acquire phased array tracking radar, enhanced interceptors, and city hardening
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Tactical Credits Pill */}
            <div className="px-3.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div className="text-right">
                <div className="text-[9px] font-mono-hud text-amber-300/80 uppercase leading-none">AVAILABLE FUNDS</div>
                <div className="text-base sm:text-lg font-bold font-mono-hud text-amber-300 tabular-nums leading-tight">
                  {credits.toLocaleString()} CR
                </div>
              </div>
            </div>

            {!isBetweenWaves && (
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-800/80 bg-slate-950/30 overflow-x-auto">
          {[
            { id: 'all', label: 'All Upgrades' },
            { id: 'radar', label: 'Radar & Lock Speed' },
            { id: 'batteries', label: 'Interceptors & Silos' },
            { id: 'defense', label: 'Point Defense & Shields' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded-md font-mono-hud text-xs tracking-wider uppercase transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Upgrades List Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[58vh] grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredUpgrades.map(item => {
            const isMax = item.currentLevel >= item.maxLevel;
            const canAfford = credits >= item.cost && !isMax;

            // Highlight radar lock speed specially
            const isRadarSpeed = item.id === 'radar_lock_speed';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border transition flex flex-col justify-between ${
                  isRadarSpeed
                    ? 'border-sky-500/50 bg-sky-950/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top line: Icon, Name, Level badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        {getUpgradeIcon(item.icon)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                            {item.name}
                          </h3>
                          {isRadarSpeed && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase font-mono-hud">
                              Core Feature
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono-hud text-slate-400">
                          Level {item.currentLevel} / {item.maxLevel}
                        </span>
                      </div>
                    </div>

                    {/* Level Bar Indicators */}
                    <div className="flex gap-1 pt-1">
                      {Array.from({ length: Math.min(item.maxLevel, 5) }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-xs ${
                            i < item.currentLevel 
                              ? 'bg-sky-400' 
                              : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Current -> Next effect */}
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80 mb-3 flex items-center justify-between text-[11px] font-mono-hud">
                    <span className="text-slate-400">Current: <strong className="text-slate-200">{item.effectLabel}</strong></span>
                    {!isMax && (
                      <div className="flex items-center gap-1 text-sky-400 font-semibold">
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>{item.nextEffectLabel}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase Button */}
                <button
                  disabled={!canAfford}
                  onClick={() => onApplyUpgrade(item.id)}
                  className={`w-full py-2 px-3 rounded font-mono-hud text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                    isMax
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : canAfford
                      ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.25)] active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700/60'
                  }`}
                >
                  {isMax ? (
                    <span>MAX LEVEL REACHED</span>
                  ) : (
                    <>
                      <span>UPGRADE TO LV.{item.currentLevel + 1}</span>
                      <span className="text-xs opacity-90">({item.cost.toLocaleString()} CR)</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono-hud text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>RADAR & INTERCEPTOR MODIFICATIONS ARE APPLIED INSTANTLY</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isBetweenWaves ? (
              <button
                onClick={onStartNextWave}
                className="w-full sm:w-auto px-6 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono-hud text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>COMMENCE WAVE {wave + 1}</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold font-mono-hud text-sm tracking-wider uppercase transition cursor-pointer"
              >
                RETURN TO BATTLEFIELD
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
