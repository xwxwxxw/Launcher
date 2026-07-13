import React, { useEffect, useRef } from 'react';
import * as skinview3d from 'skinview3d';

interface SkinViewerProps {
  username: string;
  uuid?: string;
  width?: number;
  height?: number;
}

export default function SkinViewer({ username, uuid, width = 200, height = 300 }: SkinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const skinUrl = `/api/skin?username=${encodeURIComponent(username || "Steve")}${uuid ? `&uuid=${encodeURIComponent(uuid)}` : ''}`;

    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      skin: skinUrl
    });

    // Make the skin static by default (no auto rotate, no walking animation)
    viewer.autoRotate = false;
    viewer.animation = null;

    viewerRef.current = viewer;

    let resetTimeout: NodeJS.Timeout | null = null;
    let isResetting = false;
    let animationFrameId: number;

    const defaultPos = viewer.camera.position.clone();
    const defaultTarget = viewer.controls.target.clone();

    const smoothReset = () => {
      isResetting = true;
      const step = () => {
        if (!isResetting || !viewerRef.current) return;

        const camera = viewerRef.current.camera;
        const controls = viewerRef.current.controls;

        // Smoothly interpolate back to default position and target
        camera.position.lerp(defaultPos, 0.1);
        controls.target.lerp(defaultTarget, 0.1);
        controls.update();

        // Check if we are close enough to stop the interpolation
        if (camera.position.distanceTo(defaultPos) < 0.01 && controls.target.distanceTo(defaultTarget) < 0.01) {
          camera.position.copy(defaultPos);
          controls.target.copy(defaultTarget);
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
      }, 5000); // 5 seconds of inactivity before resetting camera
    };

    // Listen to changes on OrbitControls
    viewer.controls.addEventListener('change', onUserInteraction);

    // Stop resetting if user starts interacting with mouse, touch, or wheel
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

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]" />
    </div>
  );
}

