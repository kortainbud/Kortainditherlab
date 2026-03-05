import React, { useState, useRef, useEffect } from 'react';
import { Code, Check, Copy } from 'lucide-react';

interface EmbedButtonProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  disabled?: boolean;
}

export function EmbedButton({ canvasRef, disabled }: EmbedButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const handleCopy = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const embedCode = `<img src="${dataUrl}" alt="Kortain Dither" style="image-rendering: pixelated; width: ${canvas.width}px; height: ${canvas.height}px;" />`;

    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setOpen(false);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    navigator.clipboard.writeText(dataUrl).then(() => {
      setCopied(true);
      setOpen(false);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] uppercase tracking-[0.12em] transition-all border ${
          disabled
            ? 'bg-[#080808] border-[#111] text-[#222] cursor-not-allowed'
            : copied
            ? 'bg-[#0f1a1f] border-[#1a2a3a] text-[#5aaacd]'
            : 'bg-[#0e0e0e] border-[#1f1f1f] text-[#666] hover:text-[#999] hover:border-[#333]'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-3 h-3" />
            Copied
          </>
        ) : (
          <>
            <Code className="w-3 h-3" />
            Embed
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 bg-[#0c0c0c] border border-[#1f1f1f] rounded overflow-hidden z-50 min-w-[160px] shadow-xl shadow-black/60">
          <div className="px-3 py-2 border-b border-[#151515]">
            <span className="text-[8px] text-[#444] uppercase tracking-[0.2em]">Copy as</span>
          </div>
          <button
            onClick={handleCopy}
            className="w-full text-left px-3 py-2 text-[10px] text-[#777] uppercase tracking-[0.12em] hover:bg-[#151515] hover:text-[#bbb] transition-colors flex items-center gap-2"
          >
            <Copy className="w-2.5 h-2.5" />
            HTML Embed
          </button>
          <button
            onClick={handleCopyDataUrl}
            className="w-full text-left px-3 py-2 text-[10px] text-[#777] uppercase tracking-[0.12em] hover:bg-[#151515] hover:text-[#bbb] transition-colors flex items-center gap-2"
          >
            <Copy className="w-2.5 h-2.5" />
            Data URL
          </button>
        </div>
      )}
    </div>
  );
}
