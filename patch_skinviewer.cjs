const fs = require('fs');
let code = fs.readFileSync('src/components/SkinViewer.tsx', 'utf8');

const replacement = `import React, { useEffect, useRef } from 'react';
import * as skinview3d from 'skinview3d';

interface SkinViewerProps {
  username: string;
  width?: number;
  height?: number;
}

export default function SkinViewer({ username, width = 200, height = 300 }: SkinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      skin: \`http://skins.ely.by/skins/\${username}.png\`
    });

    viewer.animation = new skinview3d.WalkingAnimation();
    viewer.autoRotate = true;
    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
    };
  }, [username, width, height]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]" />
    </div>
  );
}
`;

fs.writeFileSync('src/components/SkinViewer.tsx', replacement);
