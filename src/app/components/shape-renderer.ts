// Per-pixel raytraced shape rendering with metallic/specular lighting
// Uses SDF raymarching with orbiting lights for dynamic look

export type ShapeType = 'sphere' | 'torus' | 'cube' | 'cylinder' | 'octahedron' | 'pyramid' | 'diamond' | 'cone';

// ─── Rotation matrix (trackball-style, accumulated) ───

export type RotMatrix = [number, number, number, number, number, number, number, number, number];

export function identityMatrix(): RotMatrix {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

export function multiplyMatrix(a: RotMatrix, b: RotMatrix): RotMatrix {
  return [
    a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
    a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8],
  ];
}

/** Build a rotation matrix from an axis (must be unit) and angle in radians */
export function axisAngleMatrix(ax: number, ay: number, az: number, angle: number): RotMatrix {
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  return [
    t*ax*ax + c,    t*ax*ay - s*az, t*ax*az + s*ay,
    t*ax*ay + s*az, t*ay*ay + c,    t*ay*az - s*ax,
    t*ax*az - s*ay, t*ay*az + s*ax, t*az*az + c,
  ];
}

function applyMatrix(m: RotMatrix, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0]*x + m[1]*y + m[2]*z,
    m[3]*x + m[4]*y + m[5]*z,
    m[6]*x + m[7]*y + m[8]*z,
  ];
}

// ─── Vector helpers ───

function dot3(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  return ax*bx + ay*by + az*bz;
}
function len3(x: number, y: number, z: number): number {
  return Math.sqrt(x*x + y*y + z*z);
}
function normalize3(x: number, y: number, z: number): [number, number, number] {
  const l = len3(x, y, z) || 1;
  return [x/l, y/l, z/l];
}
function reflect3(ix: number, iy: number, iz: number, nx: number, ny: number, nz: number): [number, number, number] {
  const d = 2 * dot3(ix, iy, iz, nx, ny, nz);
  return [ix - d*nx, iy - d*ny, iz - d*nz];
}

// ─── SDF functions ───

function sdfSphere(px: number, py: number, pz: number): number {
  return len3(px, py, pz) - 1.0;
}

function sdfTorus(px: number, py: number, pz: number, R: number, r: number): number {
  const qx = Math.sqrt(px*px + pz*pz) - R;
  return Math.sqrt(qx*qx + py*py) - r;
}

function sdfBox(px: number, py: number, pz: number, sx: number, sy: number, sz: number): number {
  const dx = Math.abs(px) - sx;
  const dy = Math.abs(py) - sy;
  const dz = Math.abs(pz) - sz;
  const outside = len3(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
  const inside = Math.min(Math.max(dx, dy, dz), 0);
  return outside + inside;
}

function sdfCylinder(px: number, py: number, pz: number, r: number, h: number): number {
  const d = Math.sqrt(px*px + pz*pz) - r;
  const dy = Math.abs(py) - h;
  const outside = len3(Math.max(d, 0), Math.max(dy, 0), 0);
  const inside = Math.min(Math.max(d, dy), 0);
  return outside + inside;
}

function sdfOctahedron(px: number, py: number, pz: number, s: number): number {
  const ax = Math.abs(px), ay = Math.abs(py), az = Math.abs(pz);
  const m = ax + ay + az - s;
  let qx: number, qy: number, qz: number;
  if (3.0 * ax < m) { qx = ax; qy = ay; qz = az; }
  else if (3.0 * ay < m) { qx = ay; qy = az; qz = ax; }
  else if (3.0 * az < m) { qx = az; qy = ax; qz = ay; }
  else return m * 0.57735027;
  const k = Math.min(Math.max(0.5 * (qz - qy + s), 0.0), s);
  return Math.sqrt(qx * qx + (qy - s + k) * (qy - s + k) + (qz - k) * (qz - k));
}

function sdfCone(px: number, py: number, pz: number, r: number, h: number): number {
  const py2 = py - h * 0.3;
  const q = Math.sqrt(px*px + pz*pz);
  const tip = h * 0.7;
  const base = -h * 0.3;
  const totalH = tip - base;
  const t = (tip - py2) / totalH;
  const coneR = r * Math.max(t, 0);
  const dRadial = q - coneR;
  if (py2 > tip) return len3(q, py2 - tip, 0);
  if (py2 < base) return Math.max(q - r, base - py2);
  const slope = Math.sqrt(r*r + totalH*totalH);
  return dRadial * totalH / slope;
}

function sdfPyramid(px: number, py: number, pz: number, h: number): number {
  const ax = Math.abs(px), az = Math.abs(pz);
  const bx = az > ax ? az : ax;
  const shifted = py + 0.3;
  const s = Math.max(-shifted, 0.0);
  const d = Math.max(bx - 0.85, 0.0);
  if (shifted < -0.3) return Math.sqrt(s * s + d * d);
  const wx = bx - 0.85 * Math.max(1.0 - shifted / h, 0.0);
  const wy = shifted - h;
  if (wx > 0 && wy > 0) return Math.sqrt(wx * wx + wy * wy);
  if (wy > 0) return wy;
  const slopeLen = Math.sqrt(h * h + 0.85 * 0.85);
  const dist = (wx * h + wy * 0.85) / slopeLen;
  return Math.max(dist, -shifted - 0.3);
}

function sdfDiamond(px: number, py: number, pz: number): number {
  const ax = Math.abs(px), ay = Math.abs(py), az = Math.abs(pz);
  const s = 0.75, h = 1.15;
  const m = ax / s + ay / h + az / s - 1.0;
  return m * Math.min(s, h) * 0.57735;
}

// ─── SDF lookup ───

type SDFFn = (px: number, py: number, pz: number) => number;

function getShapeSDF(shape: ShapeType): SDFFn {
  switch (shape) {
    case 'sphere': return sdfSphere;
    case 'torus': return (px, py, pz) => sdfTorus(px, py, pz, 0.7, 0.3);
    case 'cube': return (px, py, pz) => sdfBox(px, py, pz, 0.75, 0.75, 0.75);
    case 'cylinder': return (px, py, pz) => sdfCylinder(px, py, pz, 0.6, 0.85);
    case 'octahedron': return (px, py, pz) => sdfOctahedron(px, py, pz, 1.0);
    case 'pyramid': return (px, py, pz) => sdfPyramid(px, py, pz, 1.1);
    case 'diamond': return sdfDiamond;
    case 'cone': return (px, py, pz) => sdfCone(px, py, pz, 0.7, 1.0);
  }
}

// ─── Normal calculation ───

function calcNormal(sdf: SDFFn, px: number, py: number, pz: number): [number, number, number] {
  const e = 0.001;
  const nx = sdf(px+e, py, pz) - sdf(px-e, py, pz);
  const ny = sdf(px, py+e, pz) - sdf(px, py-e, pz);
  const nz = sdf(px, py, pz+e) - sdf(px, py, pz-e);
  return normalize3(nx, ny, nz);
}

// ─── Environment map ───

function envMap(rx: number, ry: number, rz: number): [number, number, number] {
  const t = ry * 0.5 + 0.5;

  // Bright sky dome
  const sky = Math.pow(Math.max(ry, 0), 1.5) * 0.8;

  // Ground bounce
  const ground = Math.pow(Math.max(-ry, 0), 2.0) * 0.2;

  // Two broad side panels for studio feel
  const side1 = Math.pow(Math.max(1.0 - Math.abs(rx - 0.7) - Math.abs(rz + 0.5), 0), 2.0) * 0.4;
  const side2 = Math.pow(Math.max(1.0 - Math.abs(rx + 0.6) - Math.abs(rz - 0.3), 0), 2.0) * 0.3;

  const base = t * 0.2 + 0.08;
  const intensity = base + sky + ground + side1 + side2;

  return [
    Math.min(intensity * 1.03, 1.0),
    Math.min(intensity, 1.0),
    Math.min(intensity * 0.97, 1.0),
  ];
}

// ─── Main render function ───

export function renderShape(
  _ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  width: number,
  height: number,
  rotMatrix: RotMatrix,
  camDist: number = 3.5,
  time: number = 0,
): ImageData {
  const sdf = getShapeSDF(shape);
  const aspect = width / height;
  const fov = 1.8;

  // ─── Orbiting lights ───
  // Key light orbits slowly around the object
  const keyOrbitSpeed = 0.4;
  const keyAngle = time * keyOrbitSpeed;
  const keyElevation = 0.65 + Math.sin(time * 0.23) * 0.15; // gently bobs up/down
  const [lx, ly, lz] = normalize3(
    Math.cos(keyAngle) * 0.9,
    keyElevation,
    Math.sin(keyAngle) * 0.9 - 0.3,
  );

  // Fill light orbits opposite, slower
  const fillAngle = time * 0.25 + Math.PI;
  const fillElev = 0.3 + Math.sin(time * 0.17) * 0.2;
  const [l2x, l2y, l2z] = normalize3(
    Math.cos(fillAngle) * 0.7,
    fillElev,
    Math.sin(fillAngle) * 0.7,
  );

  // Rim/back light — orbits at a different rate for visual interest
  const rimAngle = time * 0.33 + 2.0;
  const [l3x, l3y, l3z] = normalize3(
    Math.cos(rimAngle) * 0.5,
    -0.3 + Math.sin(time * 0.19) * 0.15,
    Math.sin(rimAngle) * 0.5 + 0.6,
  );

  // Transpose = inverse for orthogonal rotation matrix
  const invRot: RotMatrix = [
    rotMatrix[0], rotMatrix[3], rotMatrix[6],
    rotMatrix[1], rotMatrix[4], rotMatrix[7],
    rotMatrix[2], rotMatrix[5], rotMatrix[8],
  ];

  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const u = (px / width - 0.5) * fov * aspect;
      const v = -(py / height - 0.5) * fov;

      const [rdx, rdy, rdz] = normalize3(u, v, -1);
      const rox = 0, roy = 0, roz = camDist;

      // Raymarch
      let t = 0;
      let hit = false;
      const maxDist = 20;
      const maxSteps = 80;

      for (let i = 0; i < maxSteps; i++) {
        const wx = rox + rdx * t;
        const wy = roy + rdy * t;
        const wz = roz + rdz * t;

        const [ox, oy, oz] = applyMatrix(rotMatrix, wx, wy, wz);
        const d = sdf(ox, oy, oz);
        if (d < 0.001) {
          hit = true;
          break;
        }
        t += d;
        if (t > maxDist) break;
      }

      const idx = (py * width + px) * 4;

      if (hit) {
        const hx = rox + rdx * t;
        const hy = roy + rdy * t;
        const hz = roz + rdz * t;

        // Normal in object space → world space
        const [ohx, ohy, ohz] = applyMatrix(rotMatrix, hx, hy, hz);
        const [onx, ony, onz] = calcNormal(sdf, ohx, ohy, ohz);
        const [nx, ny, nz] = applyMatrix(invRot, onx, ony, onz);

        // View direction
        const [vx, vy, vz] = normalize3(-rdx, -rdy, -rdz);

        // ─── Lighting ───

        // Key light (bright, orbiting)
        const diff1 = Math.max(0, dot3(nx, ny, nz, lx, ly, lz));
        const [h1x, h1y, h1z] = normalize3(lx + vx, ly + vy, lz + vz);
        const spec1 = Math.pow(Math.max(0, dot3(nx, ny, nz, h1x, h1y, h1z)), 80) * 1.4;

        // Fill light (softer, orbiting opposite)
        const diff2 = Math.max(0, dot3(nx, ny, nz, l2x, l2y, l2z));
        const [h2x, h2y, h2z] = normalize3(l2x + vx, l2y + vy, l2z + vz);
        const spec2 = Math.pow(Math.max(0, dot3(nx, ny, nz, h2x, h2y, h2z)), 40) * 0.5;

        // Rim light (subtle backlight glow)
        const rim = Math.max(0, dot3(nx, ny, nz, l3x, l3y, l3z));
        const [h3x, h3y, h3z] = normalize3(l3x + vx, l3y + vy, l3z + vz);
        const spec3 = Math.pow(Math.max(0, dot3(nx, ny, nz, h3x, h3y, h3z)), 32) * 0.35;

        // Fresnel
        const NdotV = Math.max(0, dot3(nx, ny, nz, vx, vy, vz));
        const fresnel = 0.08 + 0.92 * Math.pow(1 - NdotV, 4);

        // Environment reflection
        const [rx, ry, rz] = reflect3(-vx, -vy, -vz, nx, ny, nz);
        const [envR, envG, envB] = envMap(rx, ry, rz);

        // Hemisphere ambient — brighter
        const ambient = 0.12 + ny * 0.04;

        // Combine
        const metallic = 0.55;

        const diffuse = diff1 * 0.7 + diff2 * 0.35 + rim * 0.2 + ambient;
        const specular = spec1 + spec2 + spec3;

        const r = ((1 - metallic) * diffuse + metallic * envR * fresnel * 1.3 + specular) * 255;
        const g = ((1 - metallic) * diffuse + metallic * envG * fresnel * 1.3 + specular) * 255;
        const b = ((1 - metallic) * diffuse + metallic * envB * fresnel * 1.3 + specular) * 255;

        pixels[idx]     = Math.min(255, Math.max(0, r));
        pixels[idx + 1] = Math.min(255, Math.max(0, g));
        pixels[idx + 2] = Math.min(255, Math.max(0, b));
        pixels[idx + 3] = 255;
      } else {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      }
    }
  }

  return new ImageData(pixels, width, height);
}
