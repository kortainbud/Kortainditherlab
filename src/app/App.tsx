import React, { useState, useRef, useCallback } from 'react';
import { VisualCanvas } from './components/visual-canvas';
import { ShapeCanvas, ShapeSource } from './components/shape-canvas';
import { ControlPanel } from './components/control-panel';
import { DitherSettings } from './components/dither-engine';
import { ShapeType } from './components/shape-renderer';
import { Hexagon } from 'lucide-react';

type Tab = 'shape' | 'image';

const defaultDitherSettings: DitherSettings = {
  enabled: true,
  algorithm: 'bayer4x4',
  pixelScale: 2,
  colorMode: 'mono',
  fgColor: '#ffffff',
  bgColor: '#000000',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('image');
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [shapeSource, setShapeSource] = useState<ShapeSource>({ type: 'primitive', shape: 'sphere' });
  const [extrudeScale, setExtrudeScale] = useState(50);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(30);
  const [ditherSettings, setDitherSettings] = useState<DitherSettings>(defaultDitherSettings);

  const visualCanvasRef = useRef<HTMLCanvasElement>(null);
  const shapeCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageExportCanvasRef = useRef<HTMLCanvasElement>(null);
  const shapeExportCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleDitherChange = useCallback((partial: Partial<DitherSettings>) => {
    setDitherSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleShapeChange = useCallback((shape: ShapeType) => {
    setShapeSource({ type: 'primitive', shape });
  }, []);

  const handleResetShape = useCallback(() => {
    setShapeSource({ type: 'primitive', shape: 'sphere' });
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'shape', label: 'SHAPE' },
    { id: 'image', label: 'IMAGE' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-[#e0e0e0] overflow-hidden">
      {/* Hidden export canvases */}
      <canvas ref={imageExportCanvasRef} className="hidden" />
      <canvas ref={shapeExportCanvasRef} className="hidden" />

      {/* Top bar */}
      <div className="h-11 border-b border-[#111] flex items-center px-5 shrink-0 bg-[#050505]">
        <div className="flex items-center gap-2.5 mr-10">
          <Hexagon className="w-3.5 h-3.5 text-[#333]" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#555]">
            Kortain Dither Lab
          </span>
        </div>

        <div className="flex items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-[10px] uppercase tracking-[0.18em] transition-colors relative ${
                activeTab === tab.id
                  ? 'text-[#999]'
                  : 'text-[#2a2a2a] hover:text-[#555]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-3 right-3 h-[1px] bg-[#333]" />
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-5">
          {activeTab === 'image' && image && (
            <span className="text-[8px] text-[#2a2a2a] tracking-[0.15em] uppercase">
              {image.width} x {image.height}
            </span>
          )}
          {activeTab === 'shape' && (
            <span className="text-[8px] text-[#2a2a2a] tracking-[0.15em] uppercase">
              {shapeSource.type === 'primitive'
                ? shapeSource.shape
                : (shapeSource as any).name}
            </span>
          )}
          <span className="text-[8px] text-[#1a1a1a] tracking-[0.15em]">v1.0</span>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'shape' && (
          <ShapeCanvas
            shapeSource={shapeSource}
            ditherSettings={ditherSettings}
            canvasRef={shapeCanvasRef}
            exportCanvasRef={shapeExportCanvasRef}
            extrudeScale={extrudeScale}
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
          />
        )}
        {activeTab === 'image' && (
          <VisualCanvas
            image={image}
            ditherSettings={ditherSettings}
            onImageLoad={setImage}
            canvasRef={visualCanvasRef}
            exportCanvasRef={imageExportCanvasRef}
          />
        )}

        {/* Right panel */}
        <ControlPanel
          ditherSettings={ditherSettings}
          onDitherChange={handleDitherChange}
          activeTab={activeTab}
          shapeSource={shapeSource}
          onShapeChange={handleShapeChange}
          onFileLoad={setShapeSource}
          extrudeScale={extrudeScale}
          onExtrudeScaleChange={setExtrudeScale}
          onResetShape={handleResetShape}
          autoRotate={autoRotate}
          onAutoRotateChange={setAutoRotate}
          rotationSpeed={rotationSpeed}
          onRotationSpeedChange={setRotationSpeed}
        />
      </div>

      {/* Bottom bar */}
      <div className="h-6 border-t border-[#0e0e0e] flex items-center px-5 shrink-0 bg-[#030303]">
        <div className="flex items-center gap-3">
          <span className="text-[8px] text-[#1f1f1f] uppercase tracking-[0.12em]">
            {ditherSettings.enabled ? ditherSettings.algorithm : 'off'}
          </span>
          <span className="text-[#111]">·</span>
          <span className="text-[8px] text-[#1f1f1f] uppercase tracking-[0.12em]">
            {ditherSettings.colorMode}
          </span>
          <span className="text-[#111]">·</span>
          <span className="text-[8px] text-[#1f1f1f] uppercase tracking-[0.12em]">
            px {ditherSettings.pixelScale}
          </span>
        </div>
        <span className="ml-auto text-[8px] text-[#141414] uppercase tracking-[0.2em]">
          Kortain Dither Lab
        </span>
      </div>
    </div>
  );
}
