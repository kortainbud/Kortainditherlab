import React, { useState, useRef, useEffect } from 'react';
import { Code, Check, ExternalLink } from 'lucide-react';

interface EmbedButtonProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  disabled?: boolean;
}

function fallbackCopy(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      resolve();
    } catch {
      reject(new Error('Copy failed'));
    } finally {
      document.body.removeChild(ta);
    }
  });
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    await fallbackCopy(text);
  }
}

/** Snapshot the canvas into a full base64 PNG data URL */
function snapshotCanvas(canvas: HTMLCanvasElement): string | null {
  if (canvas.width < 1 || canvas.height < 1) return null;
  // Re-draw to a fresh canvas to guarantee a clean read
  const clone = document.createElement('canvas');
  clone.width = canvas.width;
  clone.height = canvas.height;
  const ctx = clone.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(canvas, 0, 0);
  try {
    return clone.toDataURL('image/png');
  } catch {
    return null;
  }
}

export function EmbedButton({ canvasRef, disabled }: EmbedButtonProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [statusLabel, setStatusLabel] = useState('');
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

  function flash(label: string, ok: boolean) {
    setStatus(ok ? 'copied' : 'error');
    setStatusLabel(label);
    setOpen(false);
    setTimeout(() => setStatus('idle'), 2200);
  }

  /** HTML <img> tag with the full image baked in as a base64 data URL */
  const handleHtmlEmbed = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = snapshotCanvas(canvas);
    if (!dataUrl) return flash('No image', false);

    const html = `<img src="${dataUrl}" alt="Kortain Dither" width="${canvas.width}" height="${canvas.height}" style="image-rendering:pixelated;display:block;" />`;

    try {
      await copyText(html);
      flash('HTML copied', true);
    } catch {
      flash('Copy failed', false);
    }
  };

  /** Raw data:image/png;base64,... URL — can be pasted into src, CSS url(), etc. */
  const handleDataUrl = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = snapshotCanvas(canvas);
    if (!dataUrl) return flash('No image', false);

    try {
      await copyText(dataUrl);
      flash('URL copied', true);
    } catch {
      flash('Copy failed', false);
    }
  };

  /** Open a preview in a new tab so the user can verify it works */
  const handlePreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = snapshotCanvas(canvas);
    if (!dataUrl) return flash('No image', false);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kortain Dither Lab - Embed Preview</title>
  <style>
    body { margin: 0; background: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    img  { image-rendering: pixelated; max-width: 90vw; max-height: 90vh; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="Kortain Dither" width="${canvas.width}" height="${canvas.height}" />
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] uppercase tracking-[0.12em] transition-all border ${
          disabled
            ? 'bg-[#080808] border-[#111] text-[#222] cursor-not-allowed'
            : status === 'copied'
            ? 'bg-[#0f1a1f] border-[#1a3a1a] text-[#5acd5a]'
            : status === 'error'
            ? 'bg-[#1f0f0f] border-[#3a1a1a] text-[#cd5a5a]'
            : 'bg-[#0e0e0e] border-[#1f1f1f] text-[#666] hover:text-[#999] hover:border-[#333]'
        }`}
      >
        {status === 'copied' ? (
          <>
            <Check className="w-3 h-3" />
            {statusLabel}
          </>
        ) : status === 'error' ? (
          <>
            <Code className="w-3 h-3" />
            {statusLabel}
          </>
        ) : (
          <>
            <Code className="w-3 h-3" />
            Embed
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 bg-[#0c0c0c] border border-[#1f1f1f] rounded overflow-hidden z-50 min-w-[200px] shadow-xl shadow-black/60">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#151515]">
            <span className="text-[8px] text-[#444] uppercase tracking-[0.2em]">Embed to your site</span>
          </div>

          {/* HTML embed — full <img> tag with baked-in base64 image */}
          <button
            onClick={handleHtmlEmbed}
            className="w-full text-left px-3 py-2.5 text-[10px] text-[#777] hover:bg-[#151515] hover:text-[#bbb] transition-colors"
          >
            <span className="uppercase tracking-[0.1em] block">Copy HTML Tag</span>
            <span className="text-[8px] text-[#333] block mt-0.5 font-mono">
              {'<img src="data:image/png;base64,..." />'}
            </span>
          </button>

          {/* Data URL — raw base64 string */}
          <button
            onClick={handleDataUrl}
            className="w-full text-left px-3 py-2.5 text-[10px] text-[#777] hover:bg-[#151515] hover:text-[#bbb] transition-colors"
          >
            <span className="uppercase tracking-[0.1em] block">Copy Image URL</span>
            <span className="text-[8px] text-[#333] block mt-0.5 font-mono">
              data:image/png;base64,...
            </span>
          </button>

          <div className="border-t border-[#151515]" />

          {/* Preview — opens in a new tab so they can verify */}
          <button
            onClick={handlePreview}
            className="w-full text-left px-3 py-2.5 text-[10px] text-[#555] hover:bg-[#151515] hover:text-[#999] transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="uppercase tracking-[0.1em]">Preview in new tab</span>
          </button>
        </div>
      )}
    </div>
  );
}
