import React, { useRef, useEffect, useCallback } from 'react';
import { DitherSettings, applyDithering } from './dither-engine';
import { ExportButton } from './export-button';
import { Upload, ImageIcon } from 'lucide-react';

interface VisualCanvasProps {
  image: HTMLImageElement | null;
  ditherSettings: DitherSettings;
  onImageLoad: (img: HTMLImageElement) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  exportCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function VisualCanvas({ image, ditherSettings, onImageLoad, canvasRef, exportCanvasRef }: VisualCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => onImageLoad(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.match(/image\/(jpeg|png|webp)/)) loadFile(file);
    },
    [onImageLoad]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
    },
    [onImageLoad]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !image) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    canvas.width = cw;
    canvas.height = ch;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    const scale = Math.min(cw / image.width, ch / image.height) * 0.85;
    const iw = Math.floor(image.width * scale);
    const ih = Math.floor(image.height * scale);
    const ix = Math.floor((cw - iw) / 2);
    const iy = Math.floor((ch - ih) / 2);

    // Process at original image resolution for export
    const exportCanvas = exportCanvasRef.current;
    if (exportCanvas) {
      exportCanvas.width = image.width;
      exportCanvas.height = image.height;
      const exportCtx = exportCanvas.getContext('2d', { willReadFrequently: true });
      if (exportCtx) {
        exportCtx.drawImage(image, 0, 0, image.width, image.height);
        if (ditherSettings.enabled) {
          const exportImgData = exportCtx.getImageData(0, 0, image.width, image.height);
          const exportDithered = applyDithering(exportImgData, ditherSettings, image.width, image.height);
          exportCtx.putImageData(exportDithered, 0, 0);
        }
      }
    }

    // Preview at display resolution
    const offscreen = document.createElement('canvas');
    offscreen.width = iw;
    offscreen.height = ih;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return;

    offCtx.drawImage(image, 0, 0, iw, ih);

    if (ditherSettings.enabled) {
      const imgData = offCtx.getImageData(0, 0, iw, ih);
      const dithered = applyDithering(imgData, ditherSettings, iw, ih);
      offCtx.putImageData(dithered, 0, 0);
    }

    ctx.drawImage(offscreen, ix, iy);
  }, [image, ditherSettings]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-black"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Export button */}
      <div className="absolute top-4 right-4 z-10">
        <ExportButton canvasRef={exportCanvasRef} disabled={!image} />
      </div>

      {!image && (
        <div className="absolute inset-0 flex items-center justify-center">
          <label className="cursor-pointer flex flex-col items-center gap-4 p-12 border border-dashed border-[#1a1a1a] rounded hover:border-[#333] transition-colors group">
            <div className="w-14 h-14 rounded-full bg-[#0a0a0a] border border-[#151515] flex items-center justify-center group-hover:border-[#2a2a2a] transition-colors">
              <Upload className="w-5 h-5 text-[#333] group-hover:text-[#555] transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-[#555] text-[10px] mb-1 uppercase tracking-[0.15em]">
                Drop image or click to upload
              </p>
              <p className="text-[#2a2a2a] text-[9px] uppercase tracking-[0.15em]">JPG · PNG · WEBP</p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      )}

      {image && (
        <label className="absolute bottom-4 left-4 cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a]/90 border border-[#1f1f1f] rounded text-[10px] text-[#444] uppercase tracking-[0.12em] hover:text-[#777] hover:border-[#333] transition-colors backdrop-blur-sm">
          <ImageIcon className="w-3 h-3" />
          Replace
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      )}
    </div>
  );
}