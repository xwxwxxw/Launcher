import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Server, Package, Shield, Loader2 } from 'lucide-react';

interface LauncherSplashScreenProps {
  loadingProfiles: boolean;
  loadingMods: boolean;
  onComplete: () => void;
}

export default function LauncherSplashScreen({ loadingProfiles, loadingMods, onComplete }: LauncherSplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Инициализация ядра...');
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Phase 1: Init (0% -> 20%)
    const timer1 = setTimeout(() => {
      setProgress(20);
      setStatusText('Загрузка конфигурационных файлов...');
      setStep(2);
    }, 400);

    // Phase 2: Loading profiles (20% -> 45%)
    const timer2 = setTimeout(() => {
      setProgress(45);
      setStatusText('Получение игровых профилей...');
      setStep(3);
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    // Once profiles are loaded, we move to step 4
    if (!loadingProfiles && progress >= 45) {
      setProgress(70);
      setStatusText('Проверка установленных модификаций...');
      setStep(4);
    }
  }, [loadingProfiles, progress]);

  useEffect(() => {
    // Once mods are done loading (or if they are not loading), we finish the sequence
    if (!loadingProfiles && !loadingMods && progress >= 70) {
      setProgress(90);
      setStatusText('Проверка авторизации и игровых сессий...');
      setStep(5);

      const finalTimer = setTimeout(() => {
        setProgress(100);
        setStatusText('Сборка успешно инициализирована!');
        setStep(6);

        // Allow some time for the user to see the 100% completed state before resolving
        const closeTimer = setTimeout(() => {
          onComplete();
        }, 600);

        return () => clearTimeout(closeTimer);
      }, 700);

      return () => clearTimeout(finalTimer);
    }
  }, [loadingProfiles, loadingMods, progress, onComplete]);

  // Ensure progress bar never jumps backwards and moves smoothly
  const [displayProgress, setDisplayProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev < progress) {
          return Math.min(prev + 2, progress);
        }
        return prev;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [progress]);

  return (
    <div className="fixed inset-0 bg-[#09090b] z-50 flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.07)_0%,transparent_70%)] pointer-events-none"></div>
      
      {/* Decorative Minecraft-like floating particles */}
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-2 h-2 bg-blue-500/30 animate-pulse rounded-sm"></div>
        <div className="absolute top-[60%] left-[80%] w-3 h-3 bg-indigo-500/20 animate-bounce rounded-sm" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-[25%] left-[30%] w-1.5 h-1.5 bg-sky-500/40 animate-ping rounded-sm" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-[15%] left-[70%] w-2 h-2 bg-blue-400/20 animate-pulse rounded-sm" style={{ animationDuration: '2.5s' }}></div>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center relative z-10">
        {/* Animated Custom Voxel Logo */}
        <div className="relative w-28 h-28 mb-10 flex items-center justify-center">
          {/* External rotating glowing ring */}
          <motion.div 
            className="absolute inset-0 border border-blue-500/20 rounded-2xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          ></motion.div>
          <motion.div 
            className="absolute inset-2 border border-indigo-500/10 rounded-xl"
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          ></motion.div>

          {/* Minecraft Voxel Box visual */}
          <div className="relative w-14 h-14 transform-gpu [transform-style:preserve-3d] animate-[spin_10s_linear_infinite]">
            {/* Front */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded border border-white/20 shadow-lg shadow-blue-500/20"></div>
            {/* Overlay grid design inside the block */}
            <div className="absolute inset-1 border border-white/10 rounded flex items-center justify-center">
              <div className="w-6 h-6 bg-white/5 rounded-sm flex items-center justify-center border border-white/5">
                <div className="w-2 h-2 bg-blue-400 rounded-sm"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Header */}
        <h1 className="text-2xl font-black tracking-widest text-white uppercase text-center mb-1">
          Layle Launcher
        </h1>
        <div className="flex items-center gap-1.5 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          <span className="text-[10px] tracking-widest font-mono text-zinc-500 uppercase font-bold">
            Система инициализации v2.4
          </span>
        </div>

        {/* Progress Bar & Text */}
        <div className="w-full bg-zinc-900/60 border border-zinc-800/40 p-4 rounded-2xl backdrop-blur-sm shadow-xl shadow-black/40">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[11px] font-medium text-zinc-400 font-sans tracking-wide">
              {statusText}
            </span>
            <span className="text-xs font-bold font-mono text-blue-400">
              {displayProgress}%
            </span>
          </div>

          <div className="h-1.5 w-full bg-zinc-950/80 rounded-full overflow-hidden border border-zinc-900/50">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              style={{ width: `${displayProgress}%` }}
            ></div>
          </div>

          {/* Scannable sub-steps */}
          <div className="grid grid-cols-5 gap-1.5 mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s} 
                className={`h-1 rounded-sm transition-all duration-500 ${
                  step >= s + 1 
                    ? 'bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.4)]' 
                    : step === s 
                      ? 'bg-blue-500/40 animate-pulse' 
                      : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Elegant diagnostic footer */}
        <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[9px] font-mono text-zinc-600">
          <span className="flex items-center gap-1">
            <Cpu size={10} className="text-zinc-700" /> CPU: OK
          </span>
          <span className="flex items-center gap-1">
            <Server size={10} className="text-zinc-700" /> LOCALHOST: 3000
          </span>
          <span className="flex items-center gap-1">
            <Package size={10} className="text-zinc-700" /> MOD_LOADER: FABRIC
          </span>
          <span className="flex items-center gap-1">
            <Shield size={10} className="text-zinc-700" /> SECURE: TRUE
          </span>
        </div>
      </div>
    </div>
  );
}
