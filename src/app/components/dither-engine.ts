export type DitherAlgorithm =
  | 'bayer2x2'
  | 'bayer4x4'
  | 'bayer8x8'
  | 'halftone-dot'
  | 'halftone-line'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'blue-noise'
  | 'threshold'
  | 'white-noise';

export type ColorMode = 'mono' | 'duotone' | 'halftone' | 'grayscale' | 'thermal';

export type PaletteSize = 2 | 3 | 4;

export interface DitherSettings {
  enabled: boolean;
  algorithm: DitherAlgorithm;
  pixelScale: number;
  colorMode: ColorMode;
  fgColor: string;
  bgColor: string;
  paletteSize: PaletteSize;
  midColor: string;
  mid2Color: string;
}

const BAYER_2x2 = [[0, 2], [3, 1]];

const BAYER_4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const BAYER_8x8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getBlueNoise(size: number): number[][] {
  const texture: number[][] = [];
  const phi = (1 + Math.sqrt(5)) / 2;
  for (let y = 0; y < size; y++) {
    texture[y] = [];
    for (let x = 0; x < size; x++) {
      texture[y][x] = ((x * phi + y * phi * phi) % 1) * 255;
    }
  }
  return texture;
}

const blueNoise64 = getBlueNoise(64);

// Thermal palette - 9 stops from cold to hot
const THERMAL_STOPS: [number, number, number][] = [
  [10, 0, 40],
  [30, 0, 100],
  [90, 0, 160],
  [170, 20, 110],
  [220, 60, 30],
  [245, 130, 0],
  [255, 200, 20],
  [255, 250, 130],
  [255, 255, 255],
];

function thermalColor(lum: number): [number, number, number] {
  const t = (lum / 255) * (THERMAL_STOPS.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  const a = THERMAL_STOPS[Math.min(i, THERMAL_STOPS.length - 1)];
  const b = THERMAL_STOPS[Math.min(i + 1, THERMAL_STOPS.length - 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

function getOrderedThreshold(algo: DitherAlgorithm, x: number, y: number): number {
  switch (algo) {
    case 'bayer2x2':
      return (BAYER_2x2[y % 2][x % 2] / 4) * 255;
    case 'bayer4x4':
      return (BAYER_4x4[y % 4][x % 4] / 16) * 255;
    case 'bayer8x8':
      return (BAYER_8x8[y % 8][x % 8] / 64) * 255;
    case 'halftone-dot': {
      const cx = (x % 8) - 4;
      const cy = (y % 8) - 4;
      return (Math.sqrt(cx * cx + cy * cy) / 5.66) * 255;
    }
    case 'halftone-line':
      return (Math.sin((y * Math.PI) / 4) * 0.5 + 0.5) * 255;
    case 'blue-noise':
      return blueNoise64[y % 64][x % 64];
    case 'threshold':
      return 127;
    case 'white-noise':
      return Math.random() * 255;
    default:
      return 127;
  }
}

// ─── Build sorted palette from settings ───

type RGB = [number, number, number];

/** Build palette sorted from darkest to brightest */
function buildPalette(settings: DitherSettings): RGB[] {
  const fg = hexToRgb(settings.fgColor);
  const bg = hexToRgb(settings.bgColor);
  const paletteSize = settings.paletteSize ?? 2;

  if (paletteSize === 2) {
    const colors = [bg, fg];
    colors.sort((a, b) => getLuminance(...a) - getLuminance(...b));
    return colors;
  }

  if (paletteSize === 3) {
    const mid = hexToRgb(settings.midColor || '#888888');
    const colors = [bg, mid, fg];
    colors.sort((a, b) => getLuminance(...a) - getLuminance(...b));
    return colors;
  }

  // paletteSize === 4
  const mid = hexToRgb(settings.midColor || '#888888');
  const mid2 = hexToRgb(settings.mid2Color || '#444444');
  const colors = [bg, mid2, mid, fg];
  colors.sort((a, b) => getLuminance(...a) - getLuminance(...b));
  return colors;
}

/** Given a normalized value 0–1, pick the color from a palette */
function samplePalette(palette: RGB[], t: number): RGB {
  const n = palette.length;
  if (n === 1) return palette[0];
  const scaled = t * (n - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = palette[Math.min(i, n - 1)];
  const b = palette[Math.min(i + 1, n - 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

// Multi-level dithering: quantize luminance into N levels using dither threshold
function ditherQuantize(lum: number, threshold: number, levels: number): number {
  const step = 255 / (levels - 1);
  const base = Math.floor(lum / step);
  const remainder = (lum - base * step) / step;
  const t = threshold / 255;
  const quantized = remainder > t ? Math.min(base + 1, levels - 1) : base;
  return quantized * step;
}

// ─── Per-pixel color application ───

function applyColorToPixel(
  out: Uint8ClampedArray,
  idx: number,
  lum: number,
  threshold: number,
  palette: RGB[],
  mode: ColorMode,
) {
  const n = palette.length; // number of palette colors

  switch (mode) {
    case 'mono':
    case 'halftone': {
      // Binary threshold: pick nearest palette stop
      const q = ditherQuantize(lum, threshold, n);
      const c = samplePalette(palette, q / 255);
      out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
      break;
    }
    case 'duotone': {
      // Smooth quantized dithering across palette
      const levels = Math.max(n, 4);
      const q = ditherQuantize(lum, threshold, levels) / 255;
      const c = samplePalette(palette, q);
      out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
      break;
    }
    case 'grayscale': {
      const levels = Math.max(n, 5);
      const q = ditherQuantize(lum, threshold, levels) / 255;
      const c = samplePalette(palette, q);
      out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
      break;
    }
    case 'thermal': {
      const q = ditherQuantize(lum, threshold, 6);
      const tc = thermalColor(q);
      out[idx] = tc[0]; out[idx + 1] = tc[1]; out[idx + 2] = tc[2];
      break;
    }
  }
  out[idx + 3] = 255;
}

// For error-diffusion: value is already quantized
function applyColorToPixelErrorDiffusion(
  out: Uint8ClampedArray,
  idx: number,
  quantizedLum: number,
  palette: RGB[],
  mode: ColorMode,
) {
  const t = Math.max(0, Math.min(1, quantizedLum / 255));

  switch (mode) {
    case 'mono':
    case 'halftone': {
      // Snap to nearest palette color
      const c = samplePalette(palette, t);
      out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
      break;
    }
    case 'duotone':
    case 'grayscale': {
      const c = samplePalette(palette, t);
      out[idx] = c[0]; out[idx + 1] = c[1]; out[idx + 2] = c[2];
      break;
    }
    case 'thermal': {
      const tc = thermalColor(quantizedLum);
      out[idx] = tc[0]; out[idx + 1] = tc[1]; out[idx + 2] = tc[2];
      break;
    }
  }
  out[idx + 3] = 255;
}

// ─── Main dithering entry point ───

export function applyDithering(
  imageData: ImageData,
  settings: DitherSettings,
  width: number,
  height: number
): ImageData {
  const src = new Uint8ClampedArray(imageData.data);
  const result = new ImageData(new Uint8ClampedArray(src.length), width, height);
  const out = result.data;
  const palette = buildPalette(settings);
  const scale = Math.max(1, settings.pixelScale);

  // Pixelate
  if (scale > 1) {
    for (let y = 0; y < height; y += scale) {
      for (let x = 0; x < width; x += scale) {
        let rS = 0, gS = 0, bS = 0, cnt = 0;
        for (let dy = 0; dy < scale && y + dy < height; dy++) {
          for (let dx = 0; dx < scale && x + dx < width; dx++) {
            const i = ((y + dy) * width + (x + dx)) * 4;
            rS += src[i]; gS += src[i + 1]; bS += src[i + 2]; cnt++;
          }
        }
        const ar = rS / cnt, ag = gS / cnt, ab = bS / cnt;
        for (let dy = 0; dy < scale && y + dy < height; dy++) {
          for (let dx = 0; dx < scale && x + dx < width; dx++) {
            const i = ((y + dy) * width + (x + dx)) * 4;
            src[i] = ar; src[i + 1] = ag; src[i + 2] = ab;
          }
        }
      }
    }
  }

  const algo = settings.algorithm;
  const n = palette.length;

  // Error diffusion
  if (algo === 'floyd-steinberg' || algo === 'atkinson') {
    const errors = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      errors[i] = getLuminance(src[idx], src[idx + 1], src[idx + 2]);
    }

    // Quantization levels: palette size for mono/halftone, more for smoother modes
    const levels = settings.colorMode === 'mono' || settings.colorMode === 'halftone'
      ? n
      : settings.colorMode === 'thermal'
        ? 6
        : Math.max(n + 1, settings.colorMode === 'grayscale' ? 5 : 4);

    const step = 255 / (levels - 1);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const oldVal = Math.max(0, Math.min(255, errors[i]));
        const newVal = Math.round(oldVal / step) * step;
        const error = oldVal - newVal;
        errors[i] = newVal;

        if (algo === 'floyd-steinberg') {
          if (x + 1 < width) errors[i + 1] += error * 7 / 16;
          if (y + 1 < height) {
            if (x - 1 >= 0) errors[i + width - 1] += error * 3 / 16;
            errors[i + width] += error * 5 / 16;
            if (x + 1 < width) errors[i + width + 1] += error / 16;
          }
        } else {
          const d = error / 8;
          if (x + 1 < width) errors[i + 1] += d;
          if (x + 2 < width) errors[i + 2] += d;
          if (y + 1 < height) {
            if (x - 1 >= 0) errors[i + width - 1] += d;
            errors[i + width] += d;
            if (x + 1 < width) errors[i + width + 1] += d;
          }
          if (y + 2 < height) errors[i + width * 2] += d;
        }
      }
    }

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      applyColorToPixelErrorDiffusion(out, idx, errors[i], palette, settings.colorMode);
    }
  } else {
    // Ordered dithering
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const lum = getLuminance(src[idx], src[idx + 1], src[idx + 2]);
        const threshold = getOrderedThreshold(algo, x, y);
        applyColorToPixel(out, idx, lum, threshold, palette, settings.colorMode);
      }
    }
  }

  return result;
}