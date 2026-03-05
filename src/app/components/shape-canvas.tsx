import React, { useRef, useEffect, useCallback } from 'react';
import { ShapeType, renderShape } from './shape-renderer';
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
}

export function ShapeCanvas({
  shapeSource,
  ditherSettings,
  canvasRef,
  exportCanvasRef,
  extrudeScale,
  autoRotate,
  rotationSpeed,
}: ShapeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const angleRef = useRef({ y: 0.4, x: 0.3 });
  const svgImageDataRef = useRef<ImageData | null>(null);

  // Pre-render SVG when source or scale changes
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
        }
      );
    } else {
      svgImageDataRef.current = null;
    }
  }, [shapeSource, extrudeScale]);

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

      if (autoRotate) {
        const speed = (rotationSpeed / 50); // normalize: 50 = 1x
        angleRef.current.y += dt * speed * 0.8;
        angleRef.current.x = Math.sin(angleRef.current.y * 0.3) * 0.35;
      }

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      canvas.width = cw;
      canvas.height = ch;

      const rScale = 0.5;
      const rw = Math.floor(cw * rScale);
      const rh = Math.floor(ch * rScale);

      let shapeImg: ImageData;

      if (shapeSource.type === 'primitive') {
        shapeImg = renderShape(ctx, shapeSource.shape, rw, rh, angleRef.current.y, angleRef.current.x);
      } else if (shapeSource.type === 'obj') {
        shapeImg = renderOBJToCanvas(ctx, shapeSource.model, rw, rh, angleRef.current.y, extrudeScale);
      } else if (shapeSource.type === 'svg' && svgImageDataRef.current) {
        shapeImg = svgImageDataRef.current;
      } else if (shapeSource.type === 'gif') {
        // Render GIF image frame
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

      if (autoRotate || shapeSource.type === 'obj') {
        animRef.current = requestAnimationFrame(render);
      }
    }

    animRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [shapeSource, ditherSettings, extrudeScale, autoRotate, rotationSpeed]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-black"
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Top-right action buttons */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <EmbedButton canvasRef={exportCanvasRef} />
        <ExportButton canvasRef={exportCanvasRef} />
      </div>
    </div>
  );
}
