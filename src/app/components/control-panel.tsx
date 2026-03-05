import React, { useCallback } from 'react';
import { DitherAlgorithm, DitherSettings, ColorMode } from './dither-engine';
import { ShapeType } from './shape-renderer';
import { SHAPES, ShapeSource } from './shape-canvas';
import { parseOBJ } from './obj-parser';
import { ChevronDown, RotateCcw, RotateCw, FileUp } from 'lucide-react';

interface ControlPanelProps {
  ditherSettings: DitherSettings;
  onDitherChange: (settings: Partial<DitherSettings>) => void;
  activeTab: 'shape' | 'image';
  shapeSource?: ShapeSource;
  onShapeChange?: (shape: ShapeType) => void;
  onFileLoad?: (source: ShapeSource) => void;
  extrudeScale?: number;
  onExtrudeScaleChange?: (v: number) => void;
  onResetShape?: () => void;
  autoRotate?: boolean;
  onAutoRotateChange?: (v: boolean) => void;
  rotationSpeed?: number;
  onRotationSpeedChange?: (v: number) => void;
  zoom?: number;
  onZoomChange?: (v: number) => void;
}

function SliderControl({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#444] text-[9px] w-20 shrink-0 uppercase tracking-[0.1em]">{label}</span>
      <div className="flex-1 relative h-5 flex items-center">
        <div className="w-full h-[2px] bg-[#151515] rounded-full overflow-hidden">
          <div className="h-full bg-[#2a2a2a] rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-2 h-2 rounded-full bg-[#666] pointer-events-none"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
      <span className="text-[#333] text-[9px] w-6 text-right tabular-nums">{value}</span>
    </div>
  );
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 border ${
        enabled ? 'bg-[#2a2a2a] border-[#444]' : 'bg-[#0c0c0c] border-[#1a1a1a]'
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full absolute top-[2px] transition-all ${
          enabled ? 'translate-x-[15px] bg-[#aaa]' : 'translate-x-[3px] bg-[#333]'
        }`}
      />
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-[#121212] pb-2 mb-3">
      <span className="text-[#444] text-[8px] uppercase tracking-[0.25em]">{title}</span>
    </div>
  );
}

const ALGORITHMS: { value: DitherAlgorithm; label: string }[] = [
  { value: 'bayer2x2', label: 'Bayer 2x2' },
  { value: 'bayer4x4', label: 'Bayer 4x4' },
  { value: 'bayer8x8', label: 'Bayer 8x8' },
  { value: 'halftone-dot', label: 'Halftone Dot' },
  { value: 'halftone-line', label: 'Halftone Line' },
  { value: 'floyd-steinberg', label: 'Floyd-Steinberg' },
  { value: 'atkinson', label: 'Atkinson' },
  { value: 'blue-noise', label: 'Blue Noise' },
  { value: 'threshold', label: 'Threshold' },
  { value: 'white-noise', label: 'White Noise' },
];

const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: 'mono', label: 'Mono' },
  { value: 'duotone', label: 'Duotone' },
  { value: 'halftone', label: 'Halftone' },
  { value: 'grayscale', label: 'Grayscale' },
  { value: 'thermal', label: 'Thermal' },
];

export function ControlPanel({
  ditherSettings,
  onDitherChange,
  activeTab,
  shapeSource,
  onShapeChange,
  onFileLoad,
  extrudeScale,
  onExtrudeScaleChange,
  onResetShape,
  autoRotate,
  onAutoRotateChange,
  rotationSpeed,
  onRotationSpeedChange,
  zoom,
  onZoomChange,
}: ControlPanelProps) {
  const isCustomModel = shapeSource && shapeSource.type !== 'primitive';

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onFileLoad) return;
      const ext = file.name.toLowerCase().split('.').pop();

      if (ext === 'obj') {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          const model = parseOBJ(text);
          onFileLoad({ type: 'obj', model, name: file.name });
        };
        reader.readAsText(file);
      } else if (ext === 'svg') {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          onFileLoad({ type: 'svg', svgText: text, name: file.name });
        };
        reader.readAsText(file);
      } else if (ext === 'gif' || ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            onFileLoad({ type: 'gif', image: img, name: file.name });
          };
          img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      // Reset the input so the same file can be re-selected
      e.target.value = '';
    },
    [onFileLoad]
  );

  return (
    <div className="w-[270px] bg-[#060606] border-l border-[#111] overflow-y-auto h-full">
      <div className="p-4 space-y-5">

        {/* Shape controls (only on shape tab) */}
        {activeTab === 'shape' && (
          <>
            {/* Import file */}
            <div>
              <SectionHeader title="Import" />
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-dashed border-[#1a1a1a] rounded text-[9px] text-[#444] uppercase tracking-[0.12em] hover:text-[#777] hover:border-[#333] transition-colors">
                <FileUp className="w-3 h-3" />
                {isCustomModel
                  ? (shapeSource as any).name
                  : 'Upload OBJ / SVG / GIF'}
                <input
                  type="file"
                  accept=".obj,.svg,.gif,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
              {isCustomModel && onResetShape && (
                <button
                  onClick={onResetShape}
                  className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] uppercase tracking-[0.12em] text-[#3a3a3a] hover:text-[#666] transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset
                </button>
              )}
            </div>

            {/* Shape selector */}
            <div>
              <SectionHeader title="Primitives" />
              <div className="grid grid-cols-2 gap-1">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onShapeChange?.(s.id)}
                    className={`px-2 py-[7px] text-[9px] uppercase tracking-[0.1em] rounded transition-all text-center ${
                      shapeSource?.type === 'primitive' && shapeSource.shape === s.id
                        ? 'bg-[#161616] text-[#aaa] border border-[#303030]'
                        : 'bg-[#090909] text-[#3a3a3a] border border-[#121212] hover:border-[#222] hover:text-[#666]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div>
              <SectionHeader title="Rotation" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <RotateCw className="w-3 h-3 text-[#333]" />
                    <span className="text-[#555] text-[9px] uppercase tracking-[0.12em]">Auto Rotate</span>
                  </div>
                  <ToggleSwitch
                    enabled={autoRotate ?? true}
                    onChange={(v) => onAutoRotateChange?.(v)}
                  />
                </div>
                {autoRotate && rotationSpeed !== undefined && onRotationSpeedChange && (
                  <SliderControl
                    label="Speed"
                    value={rotationSpeed}
                    min={1}
                    max={100}
                    onChange={onRotationSpeedChange}
                  />
                )}
              </div>
            </div>

            {/* Extrude */}
            {extrudeScale !== undefined && onExtrudeScaleChange && (
              <div>
                <SectionHeader title="Transform" />
                <div className="space-y-3">
                  <SliderControl
                    label="Extrude"
                    value={extrudeScale}
                    min={1}
                    max={100}
                    onChange={onExtrudeScaleChange}
                  />
                  {zoom !== undefined && onZoomChange && (
                    <SliderControl
                      label="Zoom"
                      value={zoom}
                      min={1}
                      max={100}
                      onChange={onZoomChange}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Dithering */}
        <div>
          <SectionHeader title="Dithering" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#555] text-[9px] uppercase tracking-[0.12em]">Enable</span>
              <ToggleSwitch
                enabled={ditherSettings.enabled}
                onChange={(v) => onDitherChange({ enabled: v })}
              />
            </div>

            {ditherSettings.enabled && (
              <>
                <div>
                  <span className="text-[#3a3a3a] text-[8px] uppercase tracking-[0.15em] block mb-1.5">
                    Algorithm
                  </span>
                  <div className="relative">
                    <select
                      value={ditherSettings.algorithm}
                      onChange={(e) => onDitherChange({ algorithm: e.target.value as DitherAlgorithm })}
                      className="w-full bg-[#0a0a0a] border border-[#161616] text-[#888] text-[10px] px-2.5 py-[7px] rounded appearance-none cursor-pointer hover:border-[#222] transition-colors pr-7 focus:outline-none focus:border-[#2a2a2a]"
                    >
                      {ALGORITHMS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#333] pointer-events-none" />
                  </div>
                </div>

                <SliderControl
                  label="Pixel Scale"
                  value={ditherSettings.pixelScale}
                  min={1}
                  max={50}
                  onChange={(v) => onDitherChange({ pixelScale: v })}
                />
              </>
            )}
          </div>
        </div>

        {/* Color Mode */}
        <div>
          <SectionHeader title="Color Mode" />
          <div className="space-y-1">
            {COLOR_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => onDitherChange({ colorMode: m.value })}
                className={`w-full text-left px-3 py-[7px] text-[9px] uppercase tracking-[0.1em] rounded transition-all ${
                  ditherSettings.colorMode === m.value
                    ? 'bg-[#161616] text-[#aaa] border border-[#303030]'
                    : 'bg-[#090909] text-[#3a3a3a] border border-[#111] hover:border-[#222] hover:text-[#555]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* FG / BG Colors */}
        <div>
          <SectionHeader title="Colors" />
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="text-[#3a3a3a] text-[8px] uppercase tracking-[0.15em] w-8">FG</span>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="color"
                  value={ditherSettings.fgColor}
                  onChange={(e) => onDitherChange({ fgColor: e.target.value })}
                  className="w-7 h-7 bg-transparent border border-[#1a1a1a] rounded cursor-pointer hover:border-[#2a2a2a] transition-colors"
                />
                <span className="text-[#444] text-[9px] tracking-wider">{ditherSettings.fgColor}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#3a3a3a] text-[8px] uppercase tracking-[0.15em] w-8">BG</span>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="color"
                  value={ditherSettings.bgColor}
                  onChange={(e) => onDitherChange({ bgColor: e.target.value })}
                  className="w-7 h-7 bg-transparent border border-[#1a1a1a] rounded cursor-pointer hover:border-[#2a2a2a] transition-colors"
                />
                <span className="text-[#444] text-[9px] tracking-wider">{ditherSettings.bgColor}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}