import React, { useState, useRef, useEffect } from 'react';
import { Download, Check, X } from 'lucide-react';

interface ExportButtonProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  disabled?: boolean;
}

export function ExportButton({ canvasRef, disabled }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleExport = (scale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const label = `${scale}x`;

    // Create scaled canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width * scale;
    exportCanvas.height = canvas.height * scale;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    const link = document.createElement('a');
    link.download = `kortain-${Date.now()}-${label}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    setExported(label);
    setOpen(false);
    setTimeout(() => setExported(null), 1800);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] uppercase tracking-[0.12em] transition-all border ${
          disabled
            ? 'bg-[#080808] border-[#111] text-[#222] cursor-not-allowed'
            : exported
            ? 'bg-[#0f1f0f] border-[#1a3a1a] text-[#5acd5a]'
            : 'bg-[#0e0e0e] border-[#1f1f1f] text-[#666] hover:text-[#999] hover:border-[#333]'
        }`}
      >
        {exported ? (
          <>
            <Check className="w-3 h-3" />
            {exported}
          </>
        ) : (
          <>
            <Download className="w-3 h-3" />
            Export
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 bg-[#0c0c0c] border border-[#1f1f1f] rounded overflow-hidden z-50 min-w-[120px] shadow-xl shadow-black/60">
          <div className="px-3 py-2 border-b border-[#151515]">
            <span className="text-[8px] text-[#444] uppercase tracking-[0.2em]">Resolution</span>
          </div>
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => handleExport(s)}
              className="w-full text-left px-3 py-2 text-[10px] text-[#777] uppercase tracking-[0.12em] hover:bg-[#151515] hover:text-[#bbb] transition-colors flex items-center justify-between"
            >
              <span>{s}x</span>
              <span className="text-[8px] text-[#333]">PNG</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
