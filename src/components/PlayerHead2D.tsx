import { useEffect, useRef, useState, memo } from 'react';

interface PlayerHead2DProps {
  username: string;
  uuid?: string;
  className?: string;
}

function PlayerHead2D({ username, uuid, className = '' }: PlayerHead2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Use our secure server-side CORS-bypass skin proxy
    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (uuid) params.append('uuid', uuid);
    
    img.src = `/api/skin?${params.toString()}`;

    img.onload = () => {
      if (!active) return;
      drawHead(img);
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
        drawHead(fallbackImg);
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
  }, [username, uuid]);

  const drawHead = (img: HTMLImageElement) => {
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

    // Draw Head Front (source 8,8 size 8x8, dest 0,0 size 8x8)
    ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8);
    // Draw Helm Overlay (source 40,8 size 8x8, dest 0,0 size 8x8)
    ctx.drawImage(img, 40, 8, 8, 8, 0, 0, 8, 8);
  };

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-zinc-950/20 ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/20 backdrop-blur-xs rounded-full">
          <div className="w-3.5 h-3.5 border border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {error ? (
        <img 
          src="https://minotar.net/helm/Steve/100.png" 
          alt="Fallback Steve" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <canvas
          ref={canvasRef}
          width={8}
          height={8}
          className="w-full h-full object-contain image-render-pixelated select-none"
          style={{ imageRendering: 'pixelated' }}
        />
      )}
    </div>
  );
}

export default memo(PlayerHead2D);
