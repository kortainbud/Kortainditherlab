// Lightweight 3D shape rendering using projected polygon meshes + Canvas 2D

export type ShapeType = 'sphere' | 'torus' | 'cube' | 'cylinder' | 'octahedron' | 'pyramid' | 'diamond' | 'cone';

interface Vec3 { x: number; y: number; z: number }
interface Mesh { verts: Vec3[]; faces: number[][] }

// ─── Mesh generators ───

function makeSphere(seg = 16): Mesh {
  const verts: Vec3[] = [];
  const faces: number[][] = [];
  for (let lat = 0; lat <= seg; lat++) {
    const theta = (lat / seg) * Math.PI;
    const st = Math.sin(theta), ct = Math.cos(theta);
    for (let lon = 0; lon <= seg; lon++) {
      const phi = (lon / seg) * Math.PI * 2;
      verts.push({ x: st * Math.cos(phi), y: ct, z: st * Math.sin(phi) });
    }
  }
  const w = seg + 1;
  for (let lat = 0; lat < seg; lat++) {
    for (let lon = 0; lon < seg; lon++) {
      const a = lat * w + lon, b = a + 1, c = a + w, d = c + 1;
      faces.push([a, c, d, b]);
    }
  }
  return { verts, faces };
}

function makeTorus(R = 0.7, r = 0.28, segR = 20, segr = 10): Mesh {
  const verts: Vec3[] = [];
  const faces: number[][] = [];
  for (let i = 0; i <= segR; i++) {
    const phi = (i / segR) * Math.PI * 2;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    for (let j = 0; j <= segr; j++) {
      const theta = (j / segr) * Math.PI * 2;
      const ct = Math.cos(theta), st = Math.sin(theta);
      verts.push({
        x: (R + r * ct) * cp,
        y: r * st,
        z: (R + r * ct) * sp,
      });
    }
  }
  const w = segr + 1;
  for (let i = 0; i < segR; i++) {
    for (let j = 0; j < segr; j++) {
      const a = i * w + j, b = a + 1, c = a + w, d = c + 1;
      faces.push([a, c, d, b]);
    }
  }
  return { verts, faces };
}

function makeCube(): Mesh {
  const s = 0.8;
  const verts: Vec3[] = [
    { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
    { x: s, y: s, z: -s },  { x: -s, y: s, z: -s },
    { x: -s, y: -s, z: s },  { x: s, y: -s, z: s },
    { x: s, y: s, z: s },   { x: -s, y: s, z: s },
  ];
  const faces = [
    [0, 1, 2, 3], [5, 4, 7, 6], [1, 5, 6, 2],
    [4, 0, 3, 7], [3, 2, 6, 7], [4, 5, 1, 0],
  ];
  return { verts, faces };
}

function makeCylinder(seg = 20): Mesh {
  const verts: Vec3[] = [];
  const faces: number[][] = [];
  const r = 0.6, h = 0.8;
  // Top and bottom rings
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    verts.push({ x: r * Math.cos(a), y: h, z: r * Math.sin(a) });
  }
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    verts.push({ x: r * Math.cos(a), y: -h, z: r * Math.sin(a) });
  }
  const w = seg + 1;
  for (let i = 0; i < seg; i++) {
    faces.push([i, i + 1, i + 1 + w, i + w]);
  }
  // Top cap
  const topCenter = verts.length;
  verts.push({ x: 0, y: h, z: 0 });
  for (let i = 0; i < seg; i++) faces.push([topCenter, i, i + 1]);
  // Bottom cap
  const botCenter = verts.length;
  verts.push({ x: 0, y: -h, z: 0 });
  for (let i = 0; i < seg; i++) faces.push([botCenter, i + 1 + w, i + w]);
  return { verts, faces };
}

function makeOctahedron(): Mesh {
  const s = 1.0;
  const verts: Vec3[] = [
    { x: 0, y: s, z: 0 }, { x: 0, y: -s, z: 0 },
    { x: s, y: 0, z: 0 }, { x: -s, y: 0, z: 0 },
    { x: 0, y: 0, z: s }, { x: 0, y: 0, z: -s },
  ];
  const faces = [
    [0, 4, 2], [0, 2, 5], [0, 5, 3], [0, 3, 4],
    [1, 2, 4], [1, 5, 2], [1, 3, 5], [1, 4, 3],
  ];
  return { verts, faces };
}

function makePyramid(): Mesh {
  const s = 0.85, h = 1.1;
  const verts: Vec3[] = [
    { x: 0, y: h, z: 0 },
    { x: -s, y: -0.5, z: -s }, { x: s, y: -0.5, z: -s },
    { x: s, y: -0.5, z: s },  { x: -s, y: -0.5, z: s },
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],
    [1, 4, 3, 2],
  ];
  return { verts, faces };
}

function makeDiamond(): Mesh {
  const s = 0.75, h = 1.15;
  const verts: Vec3[] = [
    { x: 0, y: h, z: 0 }, { x: 0, y: -h, z: 0 },
    { x: s, y: 0, z: 0 }, { x: 0, y: 0, z: s },
    { x: -s, y: 0, z: 0 }, { x: 0, y: 0, z: -s },
  ];
  const faces = [
    [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 2],
    [1, 3, 2], [1, 4, 3], [1, 5, 4], [1, 2, 5],
  ];
  return { verts, faces };
}

function makeCone(seg = 20): Mesh {
  const verts: Vec3[] = [];
  const faces: number[][] = [];
  const r = 0.7, h = 1.1;
  // Apex
  verts.push({ x: 0, y: h, z: 0 });
  // Base ring
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    verts.push({ x: r * Math.cos(a), y: -0.4, z: r * Math.sin(a) });
  }
  for (let i = 0; i < seg; i++) {
    faces.push([0, i + 1, i + 2]);
  }
  // Base cap
  const center = verts.length;
  verts.push({ x: 0, y: -0.4, z: 0 });
  for (let i = 0; i < seg; i++) {
    faces.push([center, i + 2, i + 1]);
  }
  return { verts, faces };
}

function getMesh(shape: ShapeType): Mesh {
  switch (shape) {
    case 'sphere': return makeSphere(14);
    case 'torus': return makeTorus();
    case 'cube': return makeCube();
    case 'cylinder': return makeCylinder(18);
    case 'octahedron': return makeOctahedron();
    case 'pyramid': return makePyramid();
    case 'diamond': return makeDiamond();
    case 'cone': return makeCone(18);
  }
}

// ─── Transform + Render ───

function rotateY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
}
function rotateX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function len(v: Vec3): number {
  return Math.sqrt(dot(v, v));
}
function norm(v: Vec3): Vec3 {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  width: number,
  height: number,
  rotY: number,
  rotX: number,
): ImageData {
  const mesh = getMesh(shape);
  const aspect = width / height;
  const camDist = 3.5;
  const lightDir = norm({ x: 0.5, y: 0.8, z: -0.6 });

  // Transform verts
  const transformed = mesh.verts.map((v) => {
    let tv = rotateY(v, rotY);
    tv = rotateX(tv, rotX);
    return tv;
  });

  // Project to screen
  const projected = transformed.map((v) => {
    const d = camDist - v.z;
    return {
      sx: (v.x / (d * aspect)) * 0.5 + 0.5,
      sy: (-v.y / d) * 0.5 + 0.5,
      z: v.z,
    };
  });

  // Create offscreen canvas for polygon rendering
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d')!;
  offCtx.fillStyle = '#000';
  offCtx.fillRect(0, 0, width, height);

  // Sort faces back-to-front
  const facesWithDepth = mesh.faces.map((face, i) => {
    let avgZ = 0;
    for (const vi of face) avgZ += transformed[vi].z;
    avgZ /= face.length;
    return { face, z: avgZ };
  });
  facesWithDepth.sort((a, b) => a.z - b.z);

  for (const { face } of facesWithDepth) {
    if (face.length < 3) continue;

    const v0 = transformed[face[0]];
    const v1 = transformed[face[1]];
    const v2 = transformed[face[2]];
    const n = norm(cross(sub(v1, v0), sub(v2, v0)));

    // Backface culling
    if (n.z > 0) continue;

    const diffuse = Math.max(0, dot(n, lightDir));
    const brightness = Math.min(255, Math.round((diffuse * 0.78 + 0.12) * 255));
    const hex = brightness.toString(16).padStart(2, '0');

    offCtx.beginPath();
    const p0 = projected[face[0]];
    offCtx.moveTo(p0.sx * width, p0.sy * height);
    for (let i = 1; i < face.length; i++) {
      const p = projected[face[i]];
      offCtx.lineTo(p.sx * width, p.sy * height);
    }
    offCtx.closePath();
    offCtx.fillStyle = `#${hex}${hex}${hex}`;
    offCtx.fill();
  }

  return offCtx.getImageData(0, 0, width, height);
}
