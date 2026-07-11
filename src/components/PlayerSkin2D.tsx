import React, { useEffect, useRef, useState } from 'react';

interface PlayerSkin2DProps {
  username: string;
  isElyBy?: boolean;
  className?: string;
}

export default function PlayerSkin2D({ username, isElyBy = true, className = '' }: PlayerSkin2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Set source URL based on provider
    if (isElyBy) {
      img.src = `https://skinsystem.ely.by/skins/${username}.png`;
    } else {
      img.src = `https://minotar.net/skin/${username}`;
    }

    img.onload = () => {
      if (!active) return;
      drawSkin(img);
      setLoading(false);
    };

    img.onerror = () => {
      if (!active) return;
      // Fallback to Steve skin
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.src = 'https://minotar.net/skin/Steve';
      fallbackImg.onload = () => {
        if (!active) return;
        drawSkin(fallbackImg);
        setLoading(false);
      };
      fallbackImg.onerror = () => {
        if (!active) return;
        setError(true);
        setLoading(false);
      };
    };

    return () => {
      active = false;
    };
  }, [username, isElyBy]);

  const drawSkin = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Disable image smoothing to keep beautiful pixelated look
    ctx.imageSmoothingEnabled = false;
    (ctx as any).mozImageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;
    (ctx as any).msImageSmoothingEnabled = false;

    const is64x64 = img.height >= 64;

    // Draw Right Leg
    ctx.drawImage(img, 4, 20, 4, 12, 4, 20, 4, 12); // Front
    if (is64x64) {
      ctx.drawImage(img, 4, 36, 4, 12, 4, 20, 4, 12); // Overlay
    }

    // Draw Left Leg
    if (is64x64) {
      ctx.drawImage(img, 20, 52, 4, 12, 8, 20, 4, 12); // Front
      ctx.drawImage(img, 4, 52, 4, 12, 8, 20, 4, 12); // Overlay
    } else {
      // Mirror Right Leg for 64x32
      ctx.save();
      ctx.translate(10, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 4, 20, 4, 12, -2, 20, 4, 12);
      ctx.restore();
    }

    // Draw Torso
    ctx.drawImage(img, 20, 20, 8, 12, 4, 8, 8, 12); // Front
    if (is64x64) {
      ctx.drawImage(img, 20, 36, 8, 12, 4, 8, 8, 12); // Overlay
    }

    // Draw Right Arm
    ctx.drawImage(img, 44, 20, 4, 12, 0, 8, 4, 12); // Front
    if (is64x64) {
      ctx.drawImage(img, 44, 36, 4, 12, 0, 8, 4, 12); // Overlay
    }

    // Draw Left Arm
    if (is64x64) {
      ctx.drawImage(img, 36, 52, 4, 12, 12, 8, 4, 12); // Front
      ctx.drawImage(img, 52, 52, 4, 12, 12, 8, 4, 12); // Overlay
    } else {
      // Mirror Right Arm for 64x32
      ctx.save();
      ctx.translate(14, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 44, 20, 4, 12, -2, 8, 4, 12);
      ctx.restore();
    }

    // Draw Head
    ctx.drawImage(img, 8, 8, 8, 8, 4, 0, 8, 8); // Front
    ctx.drawImage(img, 40, 8, 8, 8, 4, 0, 8, 8); // Helm Overlay
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/20 backdrop-blur-xs rounded-2xl">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {error ? (
        <img 
          src="https://minotar.net/armor/body/Steve/200.png" 
          alt="Fallback Steve" 
          className="w-auto h-full object-contain filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]"
        />
      ) : (
        <canvas
          ref={canvasRef}
          width={16}
          height={32}
          className="w-auto h-full object-contain image-render-pixelated select-none"
          style={{ imageRendering: 'pixelated' }}
        />
      )}
    </div>
  );
}
