// Simple OBJ parser that extracts vertices and faces
export interface ParsedModel {
  vertices: [number, number, number][];
  faces: number[][];
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    scale: number;
  };
}

export function parseOBJ(text: string): ParsedModel {
  const vertices: [number, number, number][] = [];
  const faces: number[][] = [];

  const lines = text.split('\n');
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === 'v' && parts.length >= 4) {
      vertices.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ]);
    } else if (parts[0] === 'f') {
      const face: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        // OBJ faces can be v, v/vt, v/vt/vn, v//vn
        const idx = parseInt(parts[i].split('/')[0]);
        face.push(idx - 1); // OBJ is 1-indexed
      }
      if (face.length >= 3) faces.push(face);
    }
  }

  // Calculate bounds
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const v of vertices) {
    for (let i = 0; i < 3; i++) {
      if (v[i] < min[i]) min[i] = v[i];
      if (v[i] > max[i]) max[i] = v[i];
    }
  }
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const dx = max[0] - min[0];
  const dy = max[1] - min[1];
  const dz = max[2] - min[2];
  const scale = 2 / Math.max(dx, dy, dz, 0.001);

  return { vertices, faces, bounds: { min, max, center, scale } };
}

// Render OBJ model to canvas with flat shading
export function renderOBJToCanvas(
  ctx: CanvasRenderingContext2D,
  model: ParsedModel,
  width: number,
  height: number,
  rotAngle: number,
  extrudeScale: number
): ImageData {
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;
  const depthBuffer = new Float32Array(width * height).fill(Infinity);

  // Fill black
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
  }

  const { vertices, faces, bounds } = model;
  const s = bounds.scale * (extrudeScale / 50); // normalize extrude around 50 = default
  const cx = bounds.center[0];
  const cy = bounds.center[1];
  const cz = bounds.center[2];

  // Rotation
  const ct = Math.cos(rotAngle);
  const st = Math.sin(rotAngle);
  const cx2 = Math.cos(rotAngle * 0.6);
  const sx2 = Math.sin(rotAngle * 0.6);

  const lightDir = [0.5, 0.8, -0.6];
  const ll = Math.sqrt(lightDir[0] ** 2 + lightDir[1] ** 2 + lightDir[2] ** 2);
  lightDir[0] /= ll; lightDir[1] /= ll; lightDir[2] /= ll;

  // Transform vertices
  const transformed: [number, number, number][] = vertices.map((v) => {
    let x = (v[0] - cx) * s;
    let y = (v[1] - cy) * s;
    let z = (v[2] - cz) * s;

    // Y rotation
    const rx = x * ct + z * st;
    const rz = -x * st + z * ct;
    x = rx;
    z = rz;

    // X rotation
    const ry = y * cx2 - z * sx2;
    z = y * sx2 + z * cx2;
    y = ry;

    return [x, y, z];
  });

  // Project and render faces with depth sorting
  const aspect = width / height;
  const faceDepths: { idx: number; z: number }[] = faces.map((face, idx) => {
    let avgZ = 0;
    for (const vi of face) {
      if (vi >= 0 && vi < transformed.length) avgZ += transformed[vi][2];
    }
    avgZ /= face.length;
    return { idx, z: avgZ };
  });

  faceDepths.sort((a, b) => a.z - b.z); // painter's algorithm (back to front)

  for (const { idx } of faceDepths) {
    const face = faces[idx];
    if (face.length < 3) continue;

    const v0 = transformed[face[0]];
    const v1 = transformed[face[1]];
    const v2 = transformed[face[2]];
    if (!v0 || !v1 || !v2) continue;

    // Face normal
    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1];
    const ny = e1[2] * e2[0] - e1[0] * e2[2];
    const nz = e1[0] * e2[1] - e1[1] * e2[0];
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nl < 0.0001) continue;
    const nnx = nx / nl, nny = ny / nl, nnz = nz / nl;

    // Backface culling
    if (nnz > 0) continue;

    // Diffuse lighting
    const diffuse = Math.max(0, nnx * lightDir[0] + nny * lightDir[1] + nnz * lightDir[2]);
    const brightness = Math.min(255, Math.round((diffuse * 0.8 + 0.15) * 255));

    // Project vertices to screen
    const projected: [number, number][] = [];
    for (const vi of face) {
      const v = transformed[vi];
      if (!v) continue;
      const d = 3.5 - v[2]; // camera distance
      const px = (v[0] / (d * aspect)) * 0.5 + 0.5;
      const py = (-v[1] / d) * 0.5 + 0.5;
      projected.push([Math.round(px * width), Math.round(py * height)]);
    }

    // Rasterize triangle fan
    for (let i = 1; i < projected.length - 1; i++) {
      fillTriangle(data, width, height, projected[0], projected[i], projected[i + 1], brightness);
    }
  }

  return imgData;
}

function fillTriangle(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  brightness: number
) {
  const minX = Math.max(0, Math.min(p0[0], p1[0], p2[0]));
  const maxX = Math.min(w - 1, Math.max(p0[0], p1[0], p2[0]));
  const minY = Math.max(0, Math.min(p0[1], p1[1], p2[1]));
  const maxY = Math.min(h - 1, Math.max(p0[1], p1[1], p2[1]));

  const area = edgeFunction(p0, p1, p2);
  if (Math.abs(area) < 1) return;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px: [number, number] = [x, y];
      const w0 = edgeFunction(p1, p2, px);
      const w1 = edgeFunction(p2, p0, px);
      const w2 = edgeFunction(p0, p1, px);

      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) {
        const idx = (y * w + x) * 4;
        data[idx] = brightness;
        data[idx + 1] = brightness;
        data[idx + 2] = brightness;
        data[idx + 3] = 255;
      }
    }
  }
}

function edgeFunction(a: [number, number], b: [number, number], c: [number, number]): number {
  return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
}

// Parse SVG and render to canvas as raster
export function renderSVGToCanvas(
  svgText: string,
  width: number,
  height: number,
  extrudeScale: number
): Promise<ImageData> {
  return new Promise((resolve) => {
    const scaleFactor = extrudeScale / 50; // 50 = 1x, 100 = 2x, 1 = tiny
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      const scale = Math.min(width / img.width, height / img.height) * 0.7 * scaleFactor;
      const iw = img.width * scale;
      const ih = img.height * scale;
      const ix = (width - iw) / 2;
      const iy = (height - ih) / 2;
      ctx.drawImage(img, ix, iy, iw, ih);

      const imgData = ctx.getImageData(0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(imgData);
    };
    img.onerror = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.src = url;
  });
}