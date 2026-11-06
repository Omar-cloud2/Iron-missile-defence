import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, WaveClearStats, GameOverStats } from './game/gameEngine';
import { BatteryConfig, City, InterceptorType, UpgradeItem, CountryId } from './types/game';
import { soundManager } from './audio/soundManager';
import { getCountryTheater } from './game/countriesData';
import { TitleScreen } from './components/TitleScreen';
import { HUDOverlay } from './components/HUDOverlay';
import { UpgradeModal } from './components/UpgradeModal';
import { WaveClearedModal } from './components/WaveClearedModal';
import { GameOverModal } from './components/GameOverModal';

type AppStage = 'title' | 'playing' | 'wave_cleared' | 'shop' | 'game_over';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // App UI State
  const [stage, setStage] = useState<AppStage>('title');
  const [selectedCountry, setSelectedCountry] = useState<CountryId>(() => {
    try {
      return (localStorage.getItem('iron_shield_country') as CountryId) || 'israel';
    } catch {
      return 'israel';
    }
  });

  const [score, setScore] = useState<number>(0);
  const [credits, setCredits] = useState<number>(500);
  const [wave, setWave] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('iron_shield_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getIsMuted());
  const [selectedBattery, setSelectedBattery] = useState<InterceptorType>('iron_dome');
  const [batteries, setBatteries] = useState<BatteryConfig[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>([]);
  const [threatWarning, setThreatWarning] = useState<string>('THREAT LEVEL: LOW · BALLISTIC SCUDS ONLY');
  const [lastWaveStats, setLastWaveStats] = useState<WaveClearStats | null>(null);
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'warning' | 'alert' } | null>(null);

  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((message: string, type: 'info' | 'warning' | 'alert') => {
    if (notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
    }
    setNotification({ message, type });
    notifTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 2800);
  }, []);

  // Initialize Canvas & Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(
      canvasRef.current, 
      {
        onScoreUpdate: (newScore, newCredits) => {
          setScore(newScore);
          setCredits(newCredits);
        },
        onWaveComplete: (completedWave, stats) => {
          setLastWaveStats(stats);
          setStage('wave_cleared');
        },
        onGameOver: (finalStats) => {
          setGameOverStats(finalStats);
          setStage('game_over');
          if (finalStats.score > highScore) {
            setHighScore(finalStats.score);
            try {
              localStorage.setItem('iron_shield_highscore', finalStats.score.toString());
            } catch {
              // ignore
            }
          }
        },
        onBatteryChange: (newBatteries) => {
          setBatteries([...newBatteries]);
        },
        onCityStatusChange: (newCities) => {
          setCities([...newCities]);
        },
        onScreenNotification: (message, type) => {
          showNotification(message, type);
        }
      },
      selectedCountry
    );

    engineRef.current = engine;
    setBatteries(Array.from(engine.batteries.values()));
    setCities([...engine.cities]);
    setUpgrades([...engine.upgrades]);
    setCredits(engine.credits);
    setThreatWarning(engine.currentWaveConfig.threatWarning);

    const handleWindowResize = () => {
      engine.resize();
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      engine.destroy();
    };
  }, [highScore, showNotification]);

  // Country Selection
  const handleSelectCountry = (countryId: CountryId) => {
    setSelectedCountry(countryId);
    try {
      localStorage.setItem('iron_shield_country', countryId);
    } catch {
      // ignore
    }
    if (engineRef.current) {
      engineRef.current.setCountry(countryId);
      setCities([...engineRef.current.cities]);
      setBatteries(Array.from(engineRef.current.batteries.values()));
      setUpgrades([...engineRef.current.upgrades]);
      setCredits(engineRef.current.credits);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stage !== 'playing') return;

      if (e.key === '1') {
        engineRef.current?.selectBattery('iron_dome');
        setSelectedBattery('iron_dome');
      } else if (e.key === '2') {
        engineRef.current?.selectBattery('patriot');
        setSelectedBattery('patriot');
      } else if (e.key === '3') {
        engineRef.current?.selectBattery('thaad');
        setSelectedBattery('thaad');
      } else if (e.key === 'r' || e.key === 'R') {
        if (engineRef.current) {
          engineRef.current.manualReload(engineRef.current.selectedBatteryType);
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        engineRef.current?.triggerEmergencyFlare();
      } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        togglePause();
      } else if (e.key === 'u' || e.key === 'U') {
        openShop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage]);

  // Canvas Pointer Handler
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (stage !== 'playing' || !engineRef.current) return;
    engineRef.current.handleTap(e.clientX, e.clientY);
  };

  // Start mission from title
  const handleStartMission = () => {
    if (!engineRef.current) return;
    setScore(0);
    setWave(1);
    engineRef.current.score = 0;
    engineRef.current.startMission(1);
    setThreatWarning(engineRef.current.currentWaveConfig.threatWarning);
    setBatteries(Array.from(engineRef.current.batteries.values()));
    setCities([...engineRef.current.cities]);
    setCredits(engineRef.current.credits);
    setStage('playing');
  };

  const handleSelectBattery = (type: InterceptorType) => {
    if (!engineRef.current) return;
    engineRef.current.selectBattery(type);
    setSelectedBattery(type);
  };

  const handleManualReload = (type: InterceptorType) => {
    if (!engineRef.current) return;
    engineRef.current.manualReload(type);
  };

  const handleTriggerEMP = () => {
    if (!engineRef.current) return;
    engineRef.current.triggerEmergencyFlare();
  };

  const togglePause = () => {
    if (!engineRef.current) return;
    const nextPaused = !engineRef.current.isPaused;
    engineRef.current.isPaused = nextPaused;
    setIsPaused(nextPaused);
    if (nextPaused) {
      soundManager.stopBackgroundSiren();
    } else {
      soundManager.startBackgroundSiren();
    }
  };

  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const openShop = () => {
    if (engineRef.current) {
      engineRef.current.isPaused = true;
      setIsPaused(true);
    }
    soundManager.stopBackgroundSiren();
    setStage('shop');
  };

  const closeShop = () => {
    if (engineRef.current) {
      engineRef.current.isPaused = false;
      setIsPaused(false);
    }
    soundManager.startBackgroundSiren();
    setStage('playing');
  };

  const handleApplyUpgrade = (upgradeId: string) => {
    if (!engineRef.current) return;
    const success = engineRef.current.applyUpgrade(upgradeId);
    if (success) {
      setCredits(engineRef.current.credits);
      setUpgrades([...engineRef.current.upgrades]);
      setBatteries(Array.from(engineRef.current.batteries.values()));
      setCities([...engineRef.current.cities]);
    }
  };

  const handleStartNextWave = () => {
    if (!engineRef.current) return;
    const nextWave = wave + 1;
    setWave(nextWave);
    engineRef.current.prepareWave(nextWave);
    engineRef.current.isPaused = false;
    setIsPaused(false);
    setThreatWarning(engineRef.current.currentWaveConfig.threatWarning);
    setStage('playing');
    soundManager.startBackgroundSiren();
    showNotification(`WAVE ${nextWave} INBOUND · SENSORS TRACKING`, 'warning');
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    engineRef.current.destroy();

    if (canvasRef.current) {
      const freshEngine = new GameEngine(
        canvasRef.current, 
        {
          onScoreUpdate: (newScore, newCredits) => {
            setScore(newScore);
            setCredits(newCredits);
          },
          onWaveComplete: (completedWave, stats) => {
            setLastWaveStats(stats);
            setStage('wave_cleared');
          },
          onGameOver: (finalStats) => {
            setGameOverStats(finalStats);
            setStage('game_over');
          },
          onBatteryChange: (newBatteries) => {
            setBatteries([...newBatteries]);
          },
          onCityStatusChange: (newCities) => {
            setCities([...newCities]);
          },
          onScreenNotification: (message, type) => {
            showNotification(message, type);
          }
        },
        selectedCountry
      );

      engineRef.current = freshEngine;
      freshEngine.startMission(1);
      setWave(1);
      setScore(0);
      setBatteries(Array.from(freshEngine.batteries.values()));
      setCities([...freshEngine.cities]);
      setUpgrades([...freshEngine.upgrades]);
      setCredits(freshEngine.credits);
      setThreatWarning(freshEngine.currentWaveConfig.threatWarning);
      setStage('playing');
    }
  };

  const handleReturnToTitle = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
    }
    soundManager.stopBackgroundSiren();
    setStage('title');
  };

  const currentCountryTheater = engineRef.current?.currentCountry || getCountryTheater(selectedCountry);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none touch-none">
      {/* 60fps Canvas Viewport */}
      <div className="absolute inset-0 z-0">
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          className="w-full h-full block cursor-crosshair active:cursor-crosshair"
        />
      </div>

      {/* CRT Scanline & Radar Screen Overlay */}
      <div className="crt-scanlines absolute inset-0 z-10 pointer-events-none" />

      {/* Title Screen */}
      {stage === 'title' && (
        <TitleScreen
          selectedCountry={selectedCountry}
          onSelectCountry={handleSelectCountry}
          onStart={handleStartMission}
          highScore={highScore}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}

      {/* Playing / In-Game HUD */}
      {(stage === 'playing' || stage === 'shop' || stage === 'wave_cleared') && (
        <HUDOverlay
          score={score}
          credits={credits}
          wave={wave}
          threatWarning={threatWarning}
          batteries={batteries}
          selectedBattery={selectedBattery}
          cities={cities}
          country={currentCountryTheater}
          isPaused={isPaused}
          isMuted={isMuted}
          notification={notification}
          onSelectBattery={handleSelectBattery}
          onManualReload={handleManualReload}
          onTriggerEMP={handleTriggerEMP}
          onTogglePause={togglePause}
          onToggleMute={toggleMute}
          onOpenShop={openShop}
        />
      )}

      {/* Wave Cleared Modal */}
      {stage === 'wave_cleared' && lastWaveStats && (
        <WaveClearedModal
          stats={lastWaveStats}
          onOpenShop={openShop}
          onNextWave={handleStartNextWave}
        />
      )}

      {/* Tactical Procurement / Upgrades Shop */}
      {stage === 'shop' && (
        <UpgradeModal
          upgrades={upgrades}
          credits={credits}
          wave={wave}
          isBetweenWaves={lastWaveStats?.wave === wave}
          onApplyUpgrade={handleApplyUpgrade}
          onClose={closeShop}
          onStartNextWave={handleStartNextWave}
        />
      )}

      {/* Mission Failed Modal */}
      {stage === 'game_over' && gameOverStats && (
        <GameOverModal
          stats={gameOverStats}
          onRestart={handleRestart}
          onReturnToTitle={handleReturnToTitle}
        />
      )}
    </div>
  );
}
