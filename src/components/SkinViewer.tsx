import { useEffect, useRef, useState } from 'react';
import { SkinViewer as Skinview3D, WalkingAnimation } from "skinview3d";
import { Play, Pause, Eye, EyeOff } from 'lucide-react';

interface SkinViewerProps {
  username?: string;
  uuid?: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function SkinViewer({ username = 'Steve', uuid, width = 300, height = 400, className = '' }: SkinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Skinview3D | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    let skinUrl = `https://minotar.net/skin/${username}`;
    if (uuid) {
      skinUrl = `https://minotar.net/skin/${uuid}`;
    }

    const viewer = new Skinview3D({
      canvas: canvasRef.current,
      width,
      height,
      skin: skinUrl,
    });

    
    
    
    

    viewer.animation = new WalkingAnimation();
    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
    };
  }, [username, uuid, width, height]);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.autoRotate = isPlaying;
      if (viewerRef.current.animation) {
        viewerRef.current.animation.paused = !isPlaying;
      }
    }
  }, [isPlaying]);

  return (
    <div 
      className={`relative group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <canvas ref={canvasRef} className="outline-none" />
      
      {showControls && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 animate-in fade-in zoom-in duration-200">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
            title={isPlaying ? 'Пауза' : 'Играть'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
