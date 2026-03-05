import React, { useRef, useEffect, useCallback } from 'react';
import { ShapeType, renderShape, RotMatrix, multiplyMatrix, axisAngleMatrix } from './shape-renderer';
import { DitherSettings, applyDithering } from './dither-engine';
import { ParsedModel, renderOBJToCanvas, renderSVGToCanvas } from './obj-parser';
import { ExportButton } from './export-button';
import { EmbedButton } from './embed-button';

export type ShapeSource =
  | { type: 'primitive'; shape: ShapeType }
  | { type: 'obj'; model: ParsedModel; name: string }
  | { type: 'svg'; svgText: string; name: string }
  | { type: 'gif'; image: HTMLImageElement; name: string };

export const SHAPES: { id: ShapeType; label: string }[] = [
  { id: 'sphere', label: 'Sphere' },
  { id: 'torus', label: 'Torus' },
  { id: 'cube', label: 'Cube' },
  { id: 'cylinder', label: 'Cylinder' },
  { id: 'octahedron', label: 'Octahedron' },
  { id: 'pyramid', label: 'Pyramid' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'cone', label: 'Cone' },
];

interface ShapeCanvasProps {
  shapeSource: ShapeSource;
  ditherSettings: DitherSettings;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  exportCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  extrudeScale: number;
  autoRotate: boolean;
  rotationSpeed: number;
  zoom: number;
}

export function ShapeCanvas({
  shapeSource,
  ditherSettings,
  canvasRef,
  exportCanvasRef,
  extrudeScale,
  autoRotate,
  rotationSpeed,
  zoom,
}: ShapeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const svgImageDataRef = useRef<ImageData | null>(null);
  const needsRenderRef = useRef(true);

  // Trackball rotation matrix (accumulated)
  const rotMatrixRef = useRef<RotMatrix>(
    multiplyMatrix(
      axisAngleMatrix(1, 0, 0, 0.3),
      axisAngleMatrix(0, 1, 0, 0.4)
    )
  );

  // Elapsed time for orbiting lights (always ticking)
  const elapsedTimeRef = useRef(0);

  // ─── Mouse drag rotation (trackball) with momentum ───
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  // Momentum: velocity of rotation (axis + angular speed)
  const velocityRef = useRef({ axX: 0, axY: 0, angle: 0 });
  const lastDragDeltaRef = useRef({ dx: 0, dy: 0, time: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    // Kill momentum on grab
    velocityRef.current = { axX: 0, axY: 0, angle: 0 };
    lastDragDeltaRef.current = { dx: 0, dy: 0, time: performance.now() };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (dx === 0 && dy === 0) return;

    const sensitivity = 0.006;
    const angle = Math.sqrt(dx * dx + dy * dy) * sensitivity;
    const axLen = Math.sqrt(dx * dx + dy * dy) || 1;
    const axX = -dy / axLen;
    const axY = dx / axLen;

    const increment = axisAngleMatrix(axX, axY, 0, angle);
    rotMatrixRef.current = multiplyMatrix(increment, rotMatrixRef.current);
    needsRenderRef.current = true;

    // Track last delta for momentum
    lastDragDeltaRef.current = { dx, dy, time: performance.now() };
  }, []);

  const handleMouseUp = useCallback(() => {
    if (draggingRef.current) {
      // Calculate momentum from last drag delta
      const { dx, dy, time } = lastDragDeltaRef.current;
      const elapsed = performance.now() - time;
      // Only apply momentum if the last move was recent (< 50ms ago)
      if (elapsed < 50 && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
        const axLen = Math.sqrt(dx * dx + dy * dy) || 1;
        velocityRef.current = {
          axX: -dy / axLen,
          axY: dx / axLen,
          angle: Math.sqrt(dx * dx + dy * dy) * 0.004,
        };
      }
    }
    draggingRef.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (draggingRef.current) {
      const { dx, dy, time } = lastDragDeltaRef.current;
      const elapsed = performance.now() - time;
      if (elapsed < 50 && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
        const axLen = Math.sqrt(dx * dx + dy * dy) || 1;
        velocityRef.current = {
          axX: -dy / axLen,
          axY: dx / axLen,
          angle: Math.sqrt(dx * dx + dy * dy) * 0.004,
        };
      }
    }
    draggingRef.current = false;
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      draggingRef.current = true;
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      velocityRef.current = { axX: 0, axY: 0, angle: 0 };
      lastDragDeltaRef.current = { dx: 0, dy: 0, time: performance.now() };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggingRef.current || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - lastMouseRef.current.x;
    const dy = e.touches[0].clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    if (dx === 0 && dy === 0) return;

    const sensitivity = 0.006;
    const angle = Math.sqrt(dx * dx + dy * dy) * sensitivity;
    const axLen = Math.sqrt(dx * dx + dy * dy) || 1;
    const axX = -dy / axLen;
    const axY = dx / axLen;

    const increment = axisAngleMatrix(axX, axY, 0, angle);
    rotMatrixRef.current = multiplyMatrix(increment, rotMatrixRef.current);
    needsRenderRef.current = true;
    lastDragDeltaRef.current = { dx, dy, time: performance.now() };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (draggingRef.current) {
      const { dx, dy, time } = lastDragDeltaRef.current;
      const elapsed = performance.now() - time;
      if (elapsed < 50 && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
        const axLen = Math.sqrt(dx * dx + dy * dy) || 1;
        velocityRef.current = {
          axX: -dy / axLen,
          axY: dx / axLen,
          angle: Math.sqrt(dx * dx + dy * dy) * 0.004,
        };
      }
    }
    draggingRef.current = false;
  }, []);

  // Pre-render SVG
  useEffect(() => {
    if (shapeSource.type === 'svg') {
      svgImageDataRef.current = null;
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth || 800;
      const ch = container.clientHeight || 600;
      renderSVGToCanvas(shapeSource.svgText, Math.floor(cw * 0.6), Math.floor(ch * 0.6), extrudeScale).then(
        (imgData) => {
          svgImageDataRef.current = imgData;
          needsRenderRef.current = true;
        }
      );
    } else {
      svgImageDataRef.current = null;
    }
  }, [shapeSource, extrudeScale]);

  // Mark render needed when settings change
  useEffect(() => {
    needsRenderRef.current = true;
  }, [shapeSource, ditherSettings, extrudeScale, autoRotate, rotationSpeed, zoom]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let running = true;
    let lastTime = 0;

    function render(timestamp: number) {
      if (!running || !ctx || !canvas || !container) return;

      const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
      lastTime = timestamp;

      // Always tick elapsed time for orbiting lights
      elapsedTimeRef.current += dt;

      // Auto-rotate
      if (autoRotate && !draggingRef.current) {
        const speed = rotationSpeed / 50;
        const autoRot = axisAngleMatrix(0, 1, 0, dt * speed * 0.8);
        rotMatrixRef.current = multiplyMatrix(autoRot, rotMatrixRef.current);
      }

      // Apply momentum (smooth deceleration)
      const vel = velocityRef.current;
      if (vel.angle > 0.0001) {
        const momentumRot = axisAngleMatrix(vel.axX, vel.axY, 0, vel.angle);
        rotMatrixRef.current = multiplyMatrix(momentumRot, rotMatrixRef.current);
        // Dampen — smooth exponential decay
        vel.angle *= Math.pow(0.04, dt); // decays to near-zero over ~1s
        needsRenderRef.current = true;
      } else {
        vel.angle = 0;
      }

      // Orbiting lights always cause re-render
      needsRenderRef.current = true;

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      canvas.width = cw;
      canvas.height = ch;

      const rScale = 0.45;
      const rw = Math.max(1, Math.floor(cw * rScale));
      const rh = Math.max(1, Math.floor(ch * rScale));

      // Map zoom (1-100) to camera distance
      const zoomFactor = zoom / 50;
      const camDist = 3.5 / Math.pow(zoomFactor, 0.7);

      let shapeImg: ImageData;

      if (shapeSource.type === 'primitive') {
        shapeImg = renderShape(ctx, shapeSource.shape, rw, rh, rotMatrixRef.current, camDist, elapsedTimeRef.current);
      } else if (shapeSource.type === 'obj') {
        const rotY = Math.atan2(rotMatrixRef.current[2], rotMatrixRef.current[0]);
        shapeImg = renderOBJToCanvas(ctx, shapeSource.model, rw, rh, rotY, extrudeScale);
      } else if (shapeSource.type === 'svg' && svgImageDataRef.current) {
        shapeImg = svgImageDataRef.current;
      } else if (shapeSource.type === 'gif') {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = rw;
        offCanvas.height = rh;
        const offCtx = offCanvas.getContext('2d')!;
        offCtx.fillStyle = '#000';
        offCtx.fillRect(0, 0, rw, rh);
        const img = shapeSource.image;
        const sc = Math.min(rw / img.width, rh / img.height) * (extrudeScale / 50) * 0.7;
        const iw = img.width * sc, ih = img.height * sc;
        offCtx.drawImage(img, (rw - iw) / 2, (rh - ih) / 2, iw, ih);
        shapeImg = offCtx.getImageData(0, 0, rw, rh);
      } else {
        shapeImg = ctx.createImageData(rw, rh);
        animRef.current = requestAnimationFrame(render);
        return;
      }

      let finalImg: ImageData;
      if (ditherSettings.enabled) {
        finalImg = applyDithering(shapeImg, ditherSettings, shapeImg.width, shapeImg.height);
      } else {
        finalImg = shapeImg;
      }

      // Write to export canvas
      const expCanvas = exportCanvasRef.current;
      if (expCanvas) {
        expCanvas.width = finalImg.width;
        expCanvas.height = finalImg.height;
        const expCtx = expCanvas.getContext('2d');
        if (expCtx) expCtx.putImageData(finalImg, 0, 0);
      }

      // Draw to display canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = finalImg.width;
      offscreen.height = finalImg.height;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.putImageData(finalImg, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(offscreen, 0, 0, finalImg.width, finalImg.height, 0, 0, cw, ch);
      }

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [shapeSource, ditherSettings, extrudeScale, autoRotate, rotationSpeed, zoom]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-black select-none"
      style={{ cursor: draggingRef.current ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />

      {/* Top-right action buttons */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <EmbedButton canvasRef={exportCanvasRef} />
        <ExportButton canvasRef={exportCanvasRef} />
      </div>
    </div>
  );
}
