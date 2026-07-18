import { useEffect, useRef, useState } from 'react';
import * as skinview3d from 'skinview3d';
import { RotateCw, Play, Pause, Shirt, Eye, EyeOff } from 'lucide-react';

interface SkinViewerProps {
  username: string;
  uuid?: string;
  width?: number;
  height?: number;
}

type AnimationType = 'none' | 'walk' | 'run' | 'fly' | 'crouch';

export default function SkinViewer({ username, uuid, width = 200, height = 300 }: SkinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);

  // Interaction States
  const [autoRotate, setAutoRotate] = useState(false);
  const [animation, setAnimation] = useState<AnimationType>('none');
  const [outerLayer, setOuterLayer] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const skinUrl = `/api/skin?username=${encodeURIComponent(username || "Steve")}${uuid ? `&uuid=${encodeURIComponent(uuid)}` : ''}`;

    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      skin: skinUrl
    });

    // Set initial values from state
    viewer.autoRotate = autoRotate;
    viewer.autoRotateSpeed = 0.8;
    
    if (animation === 'walk') {
      viewer.animation = new skinview3d.WalkingAnimation();
    } else if (animation === 'run') {
      viewer.animation = new skinview3d.RunningAnimation();
    } else if (animation === 'fly') {
      viewer.animation = new skinview3d.FlyingAnimation();
    } else if (animation === 'crouch') {
      viewer.animation = new skinview3d.CrouchAnimation();
    } else {
      viewer.animation = null;
    }

    viewer.playerObject.skin.setOuterLayerVisible(outerLayer);
    viewerRef.current = viewer;

    let resetTimeout: NodeJS.Timeout | null = null;
    let isResetting = false;
    let animationFrameId: number;

    const defaultPos = viewer.camera.position.clone();
    const defaultTarget = viewer.controls.target.clone();

    const smoothReset = () => {
      // Only smooth reset if not auto-rotating and no animation is active (so camera doesn't jump constantly)
      if (viewer.autoRotate || viewer.animation) return;
      isResetting = true;
      const step = () => {
        if (!isResetting || !viewerRef.current) return;

        const camera = viewerRef.current.camera;
        const controls = viewerRef.current.controls;
        const playerWrapper = viewerRef.current.playerWrapper;

        camera.position.lerp(defaultPos, 0.1);
        controls.target.lerp(defaultTarget, 0.1);
        playerWrapper.rotation.y = playerWrapper.rotation.y * 0.9;
        controls.update();

        if (camera.position.distanceTo(defaultPos) < 0.01 && 
            controls.target.distanceTo(defaultTarget) < 0.01 && 
            Math.abs(playerWrapper.rotation.y) < 0.01) {
          camera.position.copy(defaultPos);
          controls.target.copy(defaultTarget);
          playerWrapper.rotation.y = 0;
          controls.update();
          isResetting = false;
        } else {
          animationFrameId = requestAnimationFrame(step);
        }
      };
      animationFrameId = requestAnimationFrame(step);
    };

    const stopReset = () => {
      isResetting = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    const onUserInteraction = () => {
      if (isResetting) return;

      if (resetTimeout) {
        clearTimeout(resetTimeout);
      }

      resetTimeout = setTimeout(() => {
        smoothReset();
      }, 5000);
    };

    viewer.controls.addEventListener('change', onUserInteraction);

    const canvasElement = canvasRef.current;
    if (canvasElement) {
      canvasElement.addEventListener('mousedown', stopReset);
      canvasElement.addEventListener('touchstart', stopReset);
      canvasElement.addEventListener('wheel', stopReset);
    }

    return () => {
      if (resetTimeout) {
        clearTimeout(resetTimeout);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (canvasElement) {
        canvasElement.removeEventListener('mousedown', stopReset);
        canvasElement.removeEventListener('touchstart', stopReset);
        canvasElement.removeEventListener('wheel', stopReset);
      }
      viewer.controls.removeEventListener('change', onUserInteraction);
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [username, uuid, width, height]);

  // Reactive updates without rebuilding the Canvas/Three.js webgl context
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.autoRotate = autoRotate;
    
    if (!autoRotate) {
      // Normalize rotation.y to be within [-Math.PI, Math.PI] to avoid spinning multiple times unnecessarily
      let startRotation = viewer.playerWrapper.rotation.y % (Math.PI * 2);
      if (startRotation > Math.PI) startRotation -= Math.PI * 2;
      if (startRotation < -Math.PI) startRotation += Math.PI * 2;
      viewer.playerWrapper.rotation.y = startRotation;

      let animId: number;
      const animateBack = () => {
        if (!viewerRef.current || viewerRef.current.autoRotate) return;
        viewerRef.current.playerWrapper.rotation.y *= 0.85;
        if (Math.abs(viewerRef.current.playerWrapper.rotation.y) < 0.001) {
          viewerRef.current.playerWrapper.rotation.y = 0;
        } else {
          animId = requestAnimationFrame(animateBack);
        }
      };
      animId = requestAnimationFrame(animateBack);
      return () => {
        cancelAnimationFrame(animId);
      };
    }
  }, [autoRotate]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (animation === 'walk') {
      viewer.animation = new skinview3d.WalkingAnimation();
    } else if (animation === 'run') {
      viewer.animation = new skinview3d.RunningAnimation();
    } else if (animation === 'fly') {
      viewer.animation = new skinview3d.FlyingAnimation();
    } else if (animation === 'crouch') {
      viewer.animation = new skinview3d.CrouchAnimation();
    } else {
      viewer.animation = null;
    }
  }, [animation]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.playerObject.skin.setOuterLayerVisible(outerLayer);
  }, [outerLayer]);

  return (
    <div className="flex flex-col items-center w-full relative group/viewer">
      <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]" />
      
      {/* Visual shadow effect */}
      <div className="absolute bottom-12 w-32 h-4 bg-blue-900/10 blur-[15px] rounded-[100%] scale-x-150 pointer-events-none"></div>

      {/* Floating Modern HUD Controls */}
      <div className="mt-4 flex flex-col gap-3 w-full max-w-[240px] bg-zinc-950/60 border border-zinc-800/40 backdrop-blur-md p-3 rounded-2xl shadow-xl transition-all opacity-90 group-hover/viewer:opacity-100 group-hover/viewer:border-zinc-700/50">
        
        {/* Toggle Controls row */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
          
          {/* Rotate Button */}
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
              autoRotate 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/50 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
            title="Вращение скина"
          >
            <RotateCw size={12} className={autoRotate ? 'animate-spin' : ''} style={{ animationDuration: '4s' }} />
            <span>Крутить</span>
          </button>

          {/* Outer Layer Button */}
          <button
            type="button"
            onClick={() => setOuterLayer(!outerLayer)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
              outerLayer 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                : 'bg-zinc-900/50 text-zinc-500 border-zinc-800/50 hover:bg-zinc-800/50 hover:text-zinc-300'
            }`}
            title="Отображение верхнего слоя (шляпы, куртки)"
          >
            <Shirt size={12} />
            <span>2-й слой</span>
          </button>
        </div>

        {/* Animation Quick Selectors */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 text-left px-1">Анимации:</span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'none', label: 'Стоит' },
              { id: 'walk', label: 'Шаг' },
              { id: 'run', label: 'Бег' },
              { id: 'fly', label: 'Полёт' },
              { id: 'crouch', label: 'Присед' }
            ].map((anim) => (
              <button
                key={anim.id}
                type="button"
                onClick={() => setAnimation(anim.id as AnimationType)}
                className={`py-1 px-1.5 rounded-lg text-[9px] font-semibold text-center transition-all ${
                  animation === anim.id
                    ? 'bg-zinc-100 text-zinc-950 font-bold shadow-md'
                    : 'bg-zinc-900/30 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                }`}
              >
                {anim.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
