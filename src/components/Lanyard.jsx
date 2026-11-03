import { useEffect, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  Path,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Raycaster,
  RepeatWrapping,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CARD_SIZES = { portrait: [1.6, 2.4], landscape: [2.25, 1.6] };
const ANCHORS = { left: 0.27, center: 0.5, right: 0.73 };
const CARD_DEPTH = 0.018;
const CARD_BEVEL = 0.007;
const SEGMENTS = 4; // strap segments between anchor and card
const NODE_INV_MASS = 20;
const SUBSTEP = 1 / 960;
const ITERATIONS = 2;
const STRAP_POINTS = 72;
const FOV = 24;
const CLIP_WIDTH = 0.36;
const RING_RADIUS = 0.095;
const RING_TUBE = 0.0135;
const LOOP_RADIUS = 0.036;
const FACE_TEXTURE = 1024;
const STRAP_PROFILE = [0, 0.07, 0.93, 1];
const STRAP_NORMAL_ANGLES = [-0.95, -0.28, 0.28, 0.95];
const FLIP_IMPULSE = 9;

const FINISHES = {
  glossy: { roughness: 0.42, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, foil: 0, anisotropy: 0 },
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.6, foil: 0, anisotropy: 0 },
  holographic: { roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, foil: 1, anisotropy: 0 },
  metallic: { roughness: 0.36, metalness: 0.75, clearcoat: 0.5, clearcoatRoughness: 0.18, foil: 0, anisotropy: 0.7 },
};

const METALS = {
  silver: { color: '#d9dce2', roughness: 0.16 },
  gold: { color: '#e4b965', roughness: 0.2 },
  graphite: { color: '#4d4f55', roughness: 0.28 },
};

// Holographic foil shader chunks (only active for the "holographic" finish).
const FOIL_VERTEX_DECL = `
varying vec2 vFoilUv;
varying vec3 vFoilX;
varying vec3 vFoilY;
`;
const FOIL_VERTEX = `
vFoilUv = uv;
vFoilX = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
vFoilY = normalize((modelViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
`;
const FOIL_FRAGMENT_DECL = `
uniform float foilStrength;
uniform float foilAspect;
uniform vec3 foilKey;
uniform vec3 foilFill;
uniform vec3 foilTop;
varying vec2 vFoilUv;
varying vec3 vFoilX;
varying vec3 vFoilY;

float foilHash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float foilBump(float t, float center, float width) {
  float x = (t - center) / width;
  return max(0.0, 1.0 - x * x);
}
vec3 foilSpectrum(float t) {
  return vec3(
    foilBump(t, 0.82, 0.32) + 0.4 * foilBump(t, 0.02, 0.12),
    foilBump(t, 0.5, 0.26),
    foilBump(t, 0.18, 0.24)
  );
}
vec3 foilGrating(float u, float spacing) {
  vec3 color = vec3(0.0);
  for (int m = 1; m <= 2; m++) {
    float order = float(m);
    float t = (spacing * abs(u) / order - 0.38) / 0.32;
    color += foilSpectrum(t) / order;
  }
  return color;
}
vec3 foilShard(vec2 p) {
  vec2 base = floor(p);
  float best = 9.0;
  float edge = 9.0;
  vec2 id = base;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 cell = base + vec2(float(i), float(j));
      vec2 site = cell + vec2(foilHash(cell), foilHash(cell + 7.31)) * 0.9 + 0.05;
      float d = length(site - p);
      if (d < best) { edge = best; best = d; id = cell; }
      else if (d < edge) { edge = d; }
    }
  }
  return vec3(foilHash(id + 3.17), foilHash(id + 11.73), edge - best);
}
`;
const FOIL_FRAGMENT = `
if (foilStrength > 0.0) {
  vec3 foilView = normalize(vViewPosition);
  vec3 foilNormal = normalize(normal);
  vec2 foilP = vec2(vFoilUv.x, vFoilUv.y * foilAspect);
  vec3 shard = foilShard(foilP * 26.0);
  vec2 ray = foilP - vec2(-1.6, 2.6 * foilAspect);
  float angle = atan(ray.y, ray.x) + (shard.x - 0.5) * 0.16;
  vec3 grating = normalize(vFoilX * cos(angle) + vFoilY * sin(angle));
  float spacing = 1.7 * (0.95 + shard.y * 0.1);
  vec3 rainbow = foilGrating(dot(foilKey + foilView, grating), spacing);
  rainbow += 0.6 * foilGrating(dot(foilTop + foilView, grating), spacing);
  rainbow *= 0.8 + 0.2 * smoothstep(0.0, 0.04, shard.z);
  rainbow = max(rainbow - 0.35 * min(rainbow.r, min(rainbow.g, rainbow.b)), 0.0);
  vec2 grid = foilP * 64.0;
  vec2 cell = floor(grid);
  vec2 jitter = vec2(foilHash(cell + 1.7), foilHash(cell + 9.2));
  float flake = smoothstep(0.32, 0.06, length(fract(grid) - jitter * 0.6 - 0.2)) * step(0.45, foilHash(cell + 4.4));
  vec3 facet = normalize(foilNormal + (vFoilX * (jitter.x - 0.5) + vFoilY * (jitter.y - 0.5)) * 0.8);
  float glint = pow(max(dot(reflect(-foilKey, facet), foilView), 0.0), 28.0);
  glint += 0.7 * pow(max(dot(reflect(-foilTop, facet), foilView), 0.0), 28.0);
  float fine = 1.0 - smoothstep(0.35, 0.9, max(fwidth(grid.x), fwidth(grid.y)));
  vec3 sparkle = flake * glint * fine * (vec3(0.7) + foilGrating(dot(foilKey + foilView, grating) + jitter.x * 0.4, spacing));
  float ink = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float foil = foilStrength * (0.08 + 0.92 * smoothstep(0.04, 0.7, ink));
  float facing = clamp(dot(foilNormal, foilView), 0.0, 1.0);
  float tint = clamp(dot(rainbow, vec3(0.4)), 0.0, 1.0);
  outgoingLight = outgoingLight * (1.0 - foil * (0.3 + 0.32 * tint)) + (rainbow * 0.62 * (0.4 + 0.6 * facing) + sparkle * 1.6) * foil;
}
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

const parseColor = (value, fallback) => {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return fallback;
    ctx.fillStyle = '#000000';
    ctx.fillStyle = value;
    const css = ctx.fillStyle;
    if (css.startsWith('#')) {
      const n = parseInt(css.slice(1), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    const parts = css.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return fallback;
    return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255];
  } catch {
    return fallback;
  }
};

const luminance = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const rgba = (c, a = 1) => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;

const seeded = (seed) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const roundedRect = (path, x, y, w, h, radius) => {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const k = r * 0.4477;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.bezierCurveTo(x + w - k, y, x + w, y + k, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.bezierCurveTo(x + w, y + h - k, x + w - k, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.bezierCurveTo(x + k, y + h, x, y + h - k, x, y + h - r);
  path.lineTo(x, y + r);
  path.bezierCurveTo(x, y + k, x + k, y, x + r, y);
};

const loadImage = (cache, url) => {
  if (!url) return Promise.resolve(null);
  const cached = cache.get(url);
  if (cached) return cached;
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  cache.set(url, promise);
  return promise;
};

const cardLayout = (orientation, cornerRadius) => {
  const [width, height] = CARD_SIZES[orientation] || CARD_SIZES.portrait;
  const radius = lerp(0.03, Math.min(width, height) * 0.2, clamp(cornerRadius, 0, 1));
  const slot = { width: 0.34, height: 0.07, y: height / 2 - 0.13 };
  const ringY = height / 2 - 0.055;
  return { width, height, radius, slot, ringY, hangY: ringY + RING_RADIUS };
};

const cardGeometry = (layout) => {
  const { width, height, radius, slot } = layout;
  const shape = new Shape();
  roundedRect(shape, -width / 2 + CARD_BEVEL, -height / 2 + CARD_BEVEL, width - CARD_BEVEL * 2, height - CARD_BEVEL * 2, Math.max(radius - CARD_BEVEL, 0.005));
  const hole = new Path();
  roundedRect(hole, -slot.width / 2 - CARD_BEVEL, slot.y - slot.height / 2 - CARD_BEVEL, slot.width + CARD_BEVEL * 2, slot.height + CARD_BEVEL * 2, slot.height / 2 + CARD_BEVEL);
  shape.holes.push(hole);

  const body = new ExtrudeGeometry(shape, {
    depth: CARD_DEPTH,
    bevelEnabled: true,
    bevelThickness: CARD_BEVEL,
    bevelSize: CARD_BEVEL,
    bevelSegments: 5,
    curveSegments: 24,
  });
  body.translate(0, 0, -CARD_DEPTH / 2);

  const face = new ShapeGeometry(shape, 24);
  const pos = face.getAttribute('position');
  const uv = face.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + width / 2) / width, (pos.getY(i) + height / 2) / height);
  uv.needsUpdate = true;
  return { body, face };
};

const clipGeometry = (strapWidth) => {
  const shape = new Shape();
  const w = strapWidth * 1.16;
  roundedRect(shape, -w / 2 + 0.014, -0.061, w - 0.028, 0.122, 0.024);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 6,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -0.01);
  return geometry;
};

const strapGeometry = (points) => {
  const across = STRAP_PROFILE.length;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(points * across * 3), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(points * across * 3), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(points * across * 2), 2));
  const index = [];
  for (let i = 0; i < points - 1; i++)
    for (let j = 0; j < across - 1; j++) {
      const a = i * across + j;
      index.push(a, a + across, a + 1, a + 1, a + across, a + across + 1);
    }
  geometry.setIndex(index);
  return geometry;
};

// Small studio of emissive panels baked into a PMREM environment map.
const studioEnvironment = (renderer) => {
  const scene = new Scene();
  scene.background = new Color(0.035, 0.035, 0.04);
  const plane = new PlaneGeometry(1, 1);
  const materials = [];
  const panel = (intensity, position, scale, roll = 0) => {
    const material = new MeshBasicMaterial({ color: new Color(intensity, intensity, intensity), side: DoubleSide });
    materials.push(material);
    const mesh = new Mesh(plane, material);
    mesh.position.set(...position);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    mesh.rotateZ(roll);
    scene.add(mesh);
  };
  panel(2.6, [0, 4.5, 8], [9, 4]);
  panel(6, [-5.5, 0.5, 7], [0.9, 14]);
  panel(4, [5, -0.5, 8], [0.6, 14]);
  panel(3.5, [0, -1, 9], [24, 0.35], Math.PI / 3);
  panel(2.5, [1, 2.5, 9], [24, 0.2], Math.PI / 3);
  panel(1.4, [0, 6, -6], [12, 4]);
  panel(0.5, [0, -7, 1], [16, 6]);
  panel(0.9, [8, 0, -2], [4, 10]);
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  plane.dispose();
  materials.forEach((m) => m.dispose());
  return target;
};

const canvasTexture = (canvas, anisotropy) => {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
};

// Fine noise normal map that gives the printed card a subtle paper grain.
const grainNormalMap = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new CanvasTexture(canvas);
  const rand = seeded(7);
  const noise = Float32Array.from({ length: 128 * 128 }, () => rand());
  const blurred = (x, y) => {
    let sum = 0;
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) sum += noise[((y + j + 128) % 128) * 128 + ((x + i + 128) % 128)];
    return (sum / 9) * 1.6;
  };
  const image = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const dx = blurred((x - 1 + 128) % 128, y) - blurred((x + 1) % 128, y);
      const dy = blurred(x, (y - 1 + 128) % 128) - blurred(x, (y + 1) % 128);
      const len = Math.hypot(dx, dy, 1);
      const o = (y * 128 + x) * 4;
      image.data[o] = ((dx / len) * 0.5 + 0.5) * 255;
      image.data[o + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      image.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      image.data[o + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(5, 7);
  return texture;
};

// Woven fabric normal map for the strap.
const weaveNormalMap = () => {
  const rand = seeded(19);
  const noise = Float32Array.from({ length: 128 * 128 }, () => rand());
  const ridge = (v) => Math.sqrt(Math.max(0, 1 - 4 * v * v));
  const height = (x, y) => {
    const px = ((x % 128) + 128) % 128;
    const py = ((y % 128) + 128) % 128;
    const gx = (px / 128) * 8;
    const gy = (py / 128) * 8;
    const cx = Math.floor(gx);
    const cy = Math.floor(gy);
    const u = gx - cx - 0.5;
    const v = gy - cy - 0.5;
    const even = (cx + cy) % 2 === 0;
    const a = ridge(u) * (0.55 + 0.45 * Math.cos(v * Math.PI * (even ? 1 : 0.6)));
    const b = ridge(v) * (0.55 + 0.45 * Math.cos(u * Math.PI * (even ? 0.6 : 1)));
    return (even ? Math.max(a, b * 0.7) : Math.max(b, a * 0.7)) + noise[py * 128 + px] * 0.08;
  };
  const data = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const dx = (height(x - 1, y) - height(x + 1, y)) * 1.6;
      const dy = (height(x, y - 1) - height(x, y + 1)) * 1.6;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * 128 + x) * 4;
      data[o] = ((dx / len) * 0.5 + 0.5) * 255;
      data[o + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[o + 3] = 255;
    }
  const texture = new DataTexture(data, 128, 128);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
};

const drawFitted = (ctx, img, w, h, fit) => {
  const scale = (fit === 'contain' ? Math.min : Math.max)(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
};

const paintFace = (canvas, img, color, fit, padding) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = rgba(color);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!img) return;
  const px = canvas.width * padding;
  const py = canvas.height * padding;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, canvas.width - px * 2, canvas.height - py * 2);
  ctx.clip();
  ctx.translate(px, py);
  drawFitted(ctx, img, canvas.width - px * 2, canvas.height - py * 2, fit);
  ctx.restore();
};

// Paints the strap texture (image rotated to run along the strap) and returns
// its length/width ratio so UVs can tile it correctly.
const paintStrap = (canvas, img, color) => {
  const length = img ? Math.max(64, Math.round((img.width / img.height) * 192)) : 384;
  canvas.width = 192;
  canvas.height = length;
  const ctx = canvas.getContext('2d');
  if (!ctx) return length / 192;
  ctx.fillStyle = rgba(color);
  ctx.fillRect(0, 0, 192, length);
  if (img) {
    ctx.save();
    ctx.translate(192, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, 0, 0, length, 192);
    ctx.restore();
    return length / 192;
  }
  const ink = luminance(color) > 0.5 ? [0, 0, 0] : [1, 1, 1];
  ctx.fillStyle = rgba(ink, 0.05);
  for (let y = 0; y < length; y += 4) ctx.fillRect(0, y, 192, 1);
  ctx.fillStyle = rgba(ink, 0.2);
  for (let y = 0; y < length; y += 14) {
    ctx.fillRect(192 * 0.075, y, 2, 8);
    ctx.fillRect(192 * 0.925 - 2, y, 2, 8);
  }
  return length / 192;
};

// ---------------------------------------------------------------------------
// Physics: a short position-based rope (SEGMENTS nodes) holding a rigid card.
// ---------------------------------------------------------------------------
const createRig = () => {
  const vectors = () => Array.from({ length: SEGMENTS + 1 }, () => new Vector3());
  return {
    nodes: vectors(),
    previous: vectors(),
    velocities: vectors(),
    lengths: new Float64Array(SEGMENTS),
    impulses: new Float64Array(SEGMENTS),
    rest: 1,
    anchor: new Vector3(),
    body: {
      position: new Vector3(),
      previous: new Vector3(),
      velocity: new Vector3(),
      quaternion: new Quaternion(),
      previousQuaternion: new Quaternion(),
      angular: new Vector3(),
      mass: 1,
      inverseInertia: new Vector3(1, 1, 1),
      hang: new Vector3(),
    },
    grab: null,
    turn: 0,
    twist: 0,
    twistRaw: 0,
    calm: 0,
  };
};

const tmp = {
  a: new Vector3(),
  b: new Vector3(),
  c: new Vector3(),
  d: new Vector3(),
  e: new Vector3(),
  f: new Vector3(),
  g: new Vector3(),
  pin: new Vector3(),
  q: new Quaternion(),
  r: new Quaternion(),
};

const applyInverseInertia = (body, v, out) => {
  tmp.r.copy(body.quaternion).invert();
  out.copy(v).applyQuaternion(tmp.r);
  out.set(out.x * body.inverseInertia.x, out.y * body.inverseInertia.y, out.z * body.inverseInertia.z);
  return out.applyQuaternion(body.quaternion);
};

const integrateRotation = (q, w) => {
  const { x, y, z, w: qw } = q;
  q.x += 0.5 * (w.x * qw + w.y * z - w.z * y);
  q.y += 0.5 * (w.y * qw + w.z * x - w.x * z);
  q.z += 0.5 * (w.z * qw + w.x * y - w.y * x);
  q.w += 0.5 * (-w.x * x - w.y * y - w.z * z);
  q.normalize();
};

const effectiveInverseMass = (body, arm, dir) => {
  const cross = tmp.c.crossVectors(arm, dir);
  return 1 / body.mass + cross.dot(applyInverseInertia(body, cross, tmp.d));
};

const applyImpulse = (body, arm, impulse) => {
  body.position.addScaledVector(impulse, 1 / body.mass);
  integrateRotation(body.quaternion, applyInverseInertia(body, tmp.e.crossVectors(arm, impulse), tmp.f));
};

const solveSegment = (rig, i, dt, p) => {
  const { nodes, body } = rig;
  const a = nodes[i];
  const invA = i === 0 ? 0 : NODE_INV_MASS;
  const toCard = i === SEGMENTS - 1;
  const arm = tmp.g;
  let b = nodes[i + 1];
  if (toCard) {
    arm.copy(body.hang).applyQuaternion(body.quaternion);
    b = tmp.b.copy(body.position).add(arm);
  }
  const delta = tmp.a.subVectors(b, a);
  const len = delta.length();
  const stretch = len - rig.rest;
  if (stretch <= 0 || len < 1e-9) return;
  const dir = delta.divideScalar(len);
  const invB = toCard ? effectiveInverseMass(body, arm, dir) : NODE_INV_MASS;
  const rate = (len - rig.lengths[i]) / dt;
  const target =
    (p.hold * Math.tanh((p.stiffness * stretch) / p.hold) + p.spring * stretch + p.bandDamping * Math.max(0, rate)) * dt * dt -
    rig.impulses[i];
  if (target <= 0) return;
  const impulse = Math.min(stretch / (invA + invB), target);
  rig.impulses[i] += impulse;
  if (invA) a.addScaledVector(dir, impulse * invA);
  if (toCard) applyImpulse(body, arm, dir.multiplyScalar(-impulse));
  else b.addScaledVector(dir, -impulse * invB);
};

const solveGrab = (body, grab, pin) => {
  const arm = tmp.g.copy(grab.local).applyQuaternion(body.quaternion);
  const delta = tmp.a.copy(pin).sub(body.position).sub(arm);
  const len = delta.length();
  if (len < 1e-9) return;
  const dir = delta.divideScalar(len);
  const impulse = len / effectiveInverseMass(body, arm, dir);
  applyImpulse(body, arm, dir.multiplyScalar(impulse));
};

const resetRig = (rig, layout, swingIn) => {
  const { nodes, previous, velocities, body, anchor } = rig;
  nodes[0].copy(anchor);
  for (let i = 1; i <= SEGMENTS; i++) {
    nodes[i].copy(nodes[i - 1]);
    if (swingIn) nodes[i].x += rig.rest;
    else nodes[i].y -= rig.rest;
  }
  body.quaternion.identity();
  if (swingIn) body.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
  body.hang.set(0, layout.hangY, 0);
  const arm = tmp.a.copy(body.hang).applyQuaternion(body.quaternion);
  body.position.copy(nodes[SEGMENTS]).sub(arm);
  body.previous.copy(body.position);
  body.previousQuaternion.copy(body.quaternion);
  body.velocity.set(0, 0, 0);
  body.angular.set(0, 0, 0);
  if (swingIn) {
    body.velocity.set(-4.5, -1.5, 0);
    body.angular.z = -5.5;
  }
  for (let i = 0; i <= SEGMENTS; i++) {
    previous[i].copy(nodes[i]);
    velocities[i].set(0, 0, 0);
  }
  rig.lengths.fill(rig.rest);
  rig.turn = 0;
  rig.twist = 0;
  rig.twistRaw = 0;
  rig.calm = 0;
};

const configureRig = (rig, layout, strapLength) => {
  rig.rest = strapLength / SEGMENTS;
  const { width, height } = layout;
  const depth = 0.032;
  const body = rig.body;
  body.mass = 1;
  body.inverseInertia.set(12 / (height * height + depth * depth), 12 / (width * width + depth * depth), 12 / (width * width + height * height));
  body.hang.set(0, layout.hangY, 0);
};

const stepRig = (rig, dt, p, time) => {
  const steps = Math.max(1, Math.ceil(dt / SUBSTEP - 1e-6));
  const h = dt / steps;
  const { nodes, previous, velocities, body } = rig;
  const windX = p.breeze * (Math.sin(time * 0.53) * 0.7 + Math.sin(time * 1.31 + 1.7) * 0.3) * 3;
  const windZ = p.breeze * Math.sin(time * 0.37 + 0.6) * 2;
  const grab = rig.grab;
  const pin = tmp.pin;
  const nodeDamp = Math.exp(-p.nodeDrag * h);
  const linearDamp = Math.exp(-p.linearDrag * h);
  const angularDamp = Math.exp(-p.angularDrag * h);

  for (let step = 0; step < steps; step++) {
    for (let i = 1; i < SEGMENTS; i++) {
      const v = velocities[i];
      v.y -= p.gravity * h;
      v.x += windX * h;
      v.z += windZ * h;
      previous[i].copy(nodes[i]);
      nodes[i].addScaledVector(v, h);
    }
    body.previous.copy(body.position);
    body.previousQuaternion.copy(body.quaternion);
    const q = body.quaternion;

    // While grabbed, softly hold the orientation the card had when picked up.
    if (grab) {
      const diff = tmp.q.copy(grab.rotation).multiply(tmp.r.copy(q).invert());
      if (diff.w < 0) diff.set(-diff.x, -diff.y, -diff.z, -diff.w);
      const torque = tmp.a.set(diff.x, diff.y, diff.z).multiplyScalar(2 * p.grip);
      torque.addScaledVector(body.angular, -p.gripDamping);
      body.angular.addScaledVector(applyInverseInertia(body, torque, tmp.b), h);
    }

    // Track the accumulated twist around the card's vertical axis.
    const up = tmp.a.set(0, 1, 0).applyQuaternion(q);
    const reference = tmp.b.set(-up.x * up.z, -up.y * up.z, 1 - up.z * up.z);
    if (reference.lengthSq() > 0.001) {
      const facing = tmp.d.set(0, 0, 1).applyQuaternion(q);
      const angle = Math.atan2(tmp.e.crossVectors(reference, facing).dot(up), reference.dot(facing));
      let delta = angle - rig.twistRaw;
      if (delta > Math.PI) delta -= Math.PI * 2;
      else if (delta < -Math.PI) delta += Math.PI * 2;
      rig.twist += delta;
      rig.twistRaw = angle;
    }
    if (!grab) {
      const spin = body.angular.dot(up);
      body.angular.addScaledVector(up, (p.twist * (rig.turn - rig.twist) - p.twistDamping * spin) * h);
    }

    body.velocity.y -= p.gravity * h;
    body.velocity.x += windX * 0.35 * h;
    body.velocity.z += windZ * 0.35 * h;
    body.position.addScaledVector(body.velocity, h);
    integrateRotation(body.quaternion, tmp.f.copy(body.angular).multiplyScalar(h));
    rig.impulses.fill(0);
    if (grab) pin.lerpVectors(grab.from, grab.target, (step + 1) / steps);

    for (let it = 0; it < ITERATIONS; it++) {
      for (let i = 0; i < SEGMENTS; i++) solveSegment(rig, i, h, p);
      if (grab) solveGrab(body, grab, pin);
    }

    for (let i = 1; i < SEGMENTS; i++) {
      const v = velocities[i].subVectors(nodes[i], previous[i]).divideScalar(h).multiplyScalar(nodeDamp);
      v.multiplyScalar(1 / (1 + p.nodeAir * v.length() * h));
    }

    body.velocity.subVectors(body.position, body.previous).divideScalar(h);
    const dq = tmp.q.copy(body.previousQuaternion).invert().premultiply(body.quaternion);
    body.angular.set(dq.x, dq.y, dq.z).multiplyScalar((2 / h) * (dq.w < 0 ? -1 : 1));

    // Air drag: the card resists moving broadside more than edge-on.
    const normal = tmp.a.set(0, 0, 1).applyQuaternion(body.quaternion);
    const normalSpeed = body.velocity.dot(normal);
    const planar = tmp.b.copy(body.velocity).addScaledVector(normal, -normalSpeed);
    planar.multiplyScalar(1 / (1 + p.air * planar.length() * h));
    body.velocity
      .copy(planar)
      .addScaledVector(normal, normalSpeed / (1 + p.broadside * Math.abs(normalSpeed) * h))
      .multiplyScalar(linearDamp);
    body.angular.multiplyScalar(angularDamp / (1 + p.spinAir * body.angular.length() * h));
    if (body.velocity.lengthSq() > 3600) body.velocity.setLength(60);
    if (body.angular.lengthSq() > 1600) body.angular.setLength(40);

    nodes[SEGMENTS].copy(body.hang).applyQuaternion(body.quaternion).add(body.position);
    for (let i = 0; i < SEGMENTS; i++) rig.lengths[i] = nodes[i].distanceTo(nodes[i + 1]);
  }

  if (grab) grab.from.copy(grab.target);
  let energy = body.velocity.lengthSq() + body.angular.lengthSq() * 0.3;
  for (let i = 1; i < SEGMENTS; i++) energy += velocities[i].lengthSq() * 0.05;
  rig.calm = energy < 2e-4 ? rig.calm + dt : 0;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Lanyard({
  frontImage,
  backImage,
  imageFit = 'cover',
  imagePadding = 0,
  cardColor = '#ffffff',
  orientation = 'portrait',
  finish = 'glossy',
  cornerRadius = 0.3,
  size = 0.6,
  anchor = 'center',
  strapLength = 0.5,
  strapImage,
  strapColor = '#111111',
  strapWidth = 0.65,
  metal = 'silver',
  gravity = 1,
  damping = 0.5,
  elasticity = 0.5,
  breeze = 0.5,
  interactive = true,
  autoFlip = false,
  intro = true,
  className = '',
  style,
}) {
  const containerRef = useRef(null);
  const propsRef = useRef(null);
  const syncRef = useRef(null);

  propsRef.current = {
    frontImage,
    backImage,
    imageFit: imageFit === 'contain' ? 'contain' : 'cover',
    imagePadding: clamp(imagePadding, 0, 0.45),
    cardColor,
    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
    finish,
    cornerRadius,
    size,
    anchor,
    strapLength,
    strapImage,
    strapColor,
    strapWidth,
    metal,
    gravity,
    damping,
    elasticity,
    breeze,
    interactive,
    autoFlip,
    intro,
  };

  useEffect(() => {
    syncRef.current?.();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    const canvas = renderer.domElement;
    canvas.className = 'lanyard-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new Scene();
    const environment = studioEnvironment(renderer);
    scene.environment = environment.texture;
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 200);
    const root = new Group();
    scene.add(root);
    const keyLight = new DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(-2.5, 4, 6);
    const fillLight = new DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(3, -1, 4);
    scene.add(keyLight, fillLight);

    const imageCache = new Map();
    const images = { front: null, back: null, strap: null };
    const frontCanvas = document.createElement('canvas');
    const backCanvas = document.createElement('canvas');
    const strapCanvas = document.createElement('canvas');
    let frontTexture = canvasTexture(frontCanvas, anisotropy);
    let backTexture = canvasTexture(backCanvas, anisotropy);
    const strapTexture = canvasTexture(strapCanvas, anisotropy);
    strapTexture.wrapS = ClampToEdgeWrapping;
    strapTexture.wrapT = RepeatWrapping;
    const grain = grainNormalMap();
    const weave = weaveNormalMap();

    const foilUniforms = {
      foilStrength: { value: 0 },
      foilAspect: { value: 1.4 },
      foilKey: { value: new Vector3() },
      foilFill: { value: new Vector3() },
      foilTop: { value: new Vector3() },
    };
    const withFoil = (shader) => {
      Object.assign(shader.uniforms, foilUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${FOIL_VERTEX_DECL}`)
        .replace('#include <project_vertex>', `#include <project_vertex>\n${FOIL_VERTEX}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${FOIL_FRAGMENT_DECL}`)
        .replace('#include <opaque_fragment>', `${FOIL_FRAGMENT}\n#include <opaque_fragment>`);
    };

    const frontMaterial = new MeshPhysicalMaterial({ map: frontTexture, normalMap: grain, normalScale: new Vector2(0.06, 0.06) });
    const backMaterial = new MeshPhysicalMaterial({ map: backTexture, normalMap: grain, normalScale: new Vector2(0.06, 0.06) });
    frontMaterial.onBeforeCompile = withFoil;
    backMaterial.onBeforeCompile = withFoil;
    const edgeMaterial = new MeshPhysicalMaterial();
    const metalMaterial = new MeshStandardMaterial({ metalness: 1 });
    const strapMaterial = new MeshPhysicalMaterial({
      map: strapTexture,
      normalMap: weave,
      normalScale: new Vector2(0.7, 0.7),
      roughness: 0.68,
      sheen: 1,
      sheenRoughness: 0.42,
      sheenColor: new Color(0.32, 0.32, 0.34),
      side: DoubleSide,
    });

    const card = new Group();
    const cardBody = new Mesh(undefined, edgeMaterial);
    const cardFront = new Mesh(undefined, frontMaterial);
    const cardBack = new Mesh(undefined, backMaterial);
    const ring = new Mesh(new TorusGeometry(RING_RADIUS, RING_TUBE, 18, 72), metalMaterial);
    ring.rotation.y = Math.PI / 2 - 0.7;
    card.add(cardBody, cardFront, cardBack, ring);
    root.add(card);

    const strapGeo = strapGeometry(STRAP_POINTS);
    const strap = new Mesh(strapGeo, strapMaterial);
    strap.frustumCulled = false;
    root.add(strap);

    const clip = new Group();
    const clipBody = new Mesh(clipGeometry(CLIP_WIDTH), metalMaterial);
    clipBody.position.y = 0.107;
    const clipLoop = new Mesh(new TorusGeometry(LOOP_RADIUS, 0.0105, 14, 40), metalMaterial);
    clip.add(clipBody, clipLoop);
    root.add(clip);

    const rig = createRig();
    const curvePoints = [];
    const clipTop = new Vector3();
    const clipBottom = new Vector3();
    const curve = new CatmullRomCurve3(curvePoints, false, 'centripetal');
    const viewport = { width: 1, height: 1 };
    let layout = cardLayout('portrait', 0.3);
    let applied = {};
    let strapScale = CLIP_WIDTH;
    let strapAspect = 2;
    let frame = 0;
    let lastTime = performance.now();
    let clock = 0;
    let introStart = null;
    let introOffset = 0;
    let nextAutoFlip = 6 + Math.random() * 6;
    let autoFlipping = false;
    let visible = true;
    let alive = true;
    let initialized = false;
    let hovering = false;
    let press = null;
    let imageRequest = 0;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const paintFaces = () => {
      const p = propsRef.current;
      const color = parseColor(p.cardColor, [1, 1, 1]);
      const w = FACE_TEXTURE;
      const h = Math.round((FACE_TEXTURE * layout.height) / layout.width);
      if (frontCanvas.width !== w || frontCanvas.height !== h) {
        frontCanvas.width = w;
        frontCanvas.height = h;
        backCanvas.width = w;
        backCanvas.height = h;
        frontTexture.dispose();
        backTexture.dispose();
      }
      paintFace(frontCanvas, images.front, color, p.imageFit, p.imagePadding);
      paintFace(backCanvas, images.back || images.front, color, p.imageFit, p.imagePadding);
      frontTexture.needsUpdate = true;
      backTexture.needsUpdate = true;
      wake();
    };

    const paintStrapTexture = () => {
      const p = propsRef.current;
      strapAspect = paintStrap(strapCanvas, images.strap, parseColor(p.strapColor, [0.07, 0.07, 0.07]));
      weave.repeat.set(2, 2 * strapAspect);
      strapTexture.dispose();
      strapTexture.needsUpdate = true;
      wake();
    };

    const frame3d = () => {
      const p = propsRef.current;
      const aspect = viewport.width / viewport.height;
      let viewHeight = layout.height / clamp(p.size, 0.15, 0.9);
      const minWidth = layout.width / 0.72;
      if (viewHeight * aspect < minWidth) viewHeight = minWidth / aspect;
      const viewWidth = viewHeight * aspect;
      camera.aspect = aspect;
      camera.position.set(0, 0, viewHeight / 2 / Math.tan((FOV * Math.PI) / 360));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      foilUniforms.foilKey.value.set(-2.5, 4, 6).normalize().transformDirection(camera.matrixWorldInverse);
      foilUniforms.foilFill.value.set(3, -1, 4).normalize().transformDirection(camera.matrixWorldInverse);
      foilUniforms.foilTop.value.set(0.5, 4.5, 8).normalize().transformDirection(camera.matrixWorldInverse);

      const anchorX = ((ANCHORS[p.anchor] ?? 0.5) - 0.5) * viewWidth;
      if (!initialized && p.intro && !reducedMotion) {
        introOffset = viewWidth * 1.15;
        root.position.x = introOffset;
      }
      const top = viewHeight / 2 + 0.05;
      const cardTop = viewHeight / 2 - viewHeight * lerp(0.12, 0.42, clamp(p.strapLength, 0, 1)) + (layout.hangY - layout.height / 2);
      rig.anchor.set(anchorX, top, 0);
      configureRig(rig, layout, top - cardTop);
      rig.nodes[0].copy(rig.anchor);
      rig.previous[0].copy(rig.anchor);
    };

    const sync = () => {
      const p = propsRef.current;
      if (p.intro && !applied.intro && !reducedMotion) {
        initialized = false;
        introStart = null;
      }
      const layoutKey = `${p.orientation}|${p.cornerRadius}`;
      if (layoutKey !== applied.layoutKey) {
        layout = cardLayout(p.orientation, p.cornerRadius);
        const geo = cardGeometry(layout);
        cardBody.geometry.dispose();
        cardFront.geometry.dispose();
        cardBack.geometry.dispose();
        cardBody.geometry = geo.body;
        cardFront.geometry = geo.face;
        cardBack.geometry = geo.face.clone();
        cardFront.position.z = 0.0166;
        cardBack.rotation.y = Math.PI;
        cardBack.position.z = -0.0166;
        ring.position.set(0, layout.ringY, 0);
        applied.framingKey = '';
      }
      const framingKey = `${layoutKey}|${p.size}|${p.anchor}|${p.strapLength}|${p.intro}|${viewport.width}|${viewport.height}`;
      if (framingKey !== applied.framingKey) {
        frame3d();
        if (initialized) {
          if (layoutKey !== applied.layoutKey) resetRig(rig, layout, false);
        } else {
          resetRig(rig, layout, p.intro && !reducedMotion);
          initialized = true;
        }
      }
      const imageKey = `${p.frontImage}|${p.backImage}|${p.strapImage}`;
      if (imageKey !== applied.imageKey) {
        const request = ++imageRequest;
        Promise.all([loadImage(imageCache, p.frontImage), loadImage(imageCache, p.backImage), loadImage(imageCache, p.strapImage)]).then(
          ([front, back, strapImg]) => {
            if (!alive || request !== imageRequest) return;
            images.front = front;
            images.back = back;
            images.strap = strapImg;
            paintFaces();
            paintStrapTexture();
          },
        );
      }
      const faceKey = `${layoutKey}|${p.cardColor}|${p.imageFit}|${p.imagePadding}`;
      if (faceKey !== applied.faceKey) paintFaces();
      if (p.strapColor !== applied.strapColor) paintStrapTexture();

      const look = FINISHES[p.finish] || FINISHES.glossy;
      const color = parseColor(p.cardColor, [1, 1, 1]);
      [frontMaterial, backMaterial].forEach((m) => {
        m.roughness = look.roughness;
        m.metalness = look.metalness;
        m.clearcoat = look.clearcoat;
        m.clearcoatRoughness = look.clearcoatRoughness;
        m.anisotropy = look.anisotropy;
      });
      foilUniforms.foilStrength.value = look.foil;
      foilUniforms.foilAspect.value = layout.height / layout.width;
      edgeMaterial.color.setRGB(color[0] * 0.92, color[1] * 0.92, color[2] * 0.92, SRGBColorSpace);
      edgeMaterial.roughness = Math.min(look.roughness, 0.35);
      edgeMaterial.metalness = look.metalness;
      edgeMaterial.clearcoat = 1;
      edgeMaterial.clearcoatRoughness = 0.08;
      const metalLook = METALS[p.metal] || METALS.silver;
      metalMaterial.color.set(metalLook.color);
      metalMaterial.roughness = metalLook.roughness;
      strapScale = CLIP_WIDTH * clamp(p.strapWidth, 0.4, 2);
      if (strapScale !== applied.strapScale) {
        clipBody.geometry.dispose();
        clipBody.geometry = clipGeometry(strapScale);
      }
      canvas.style.touchAction = p.interactive ? 'pan-y' : 'auto';
      applied = { layoutKey, framingKey, imageKey, faceKey, strapColor: p.strapColor, strapScale, intro: p.intro };
      wake();
    };

    // --- Strap mesh: a smooth ribbon through the rope nodes into the clip ---
    const samples = Array.from({ length: STRAP_POINTS }, () => new Vector3());
    const sides = Array.from({ length: STRAP_POINTS }, () => new Vector3());
    const normalDirs = STRAP_NORMAL_ANGLES.map((a) => [Math.cos(a), Math.sin(a)]);
    const work = {
      tangent: new Vector3(),
      toCamera: new Vector3(),
      basis: new Matrix4(),
      up: new Vector3(),
      across: new Vector3(),
      facing: new Vector3(),
      end: new Vector3(),
    };
    const last = STRAP_POINTS - 1;

    const updateStrap = () => {
      const end = rig.nodes[SEGMENTS];
      const clipReach = 0.236;
      let lastNode = 3;
      while (lastNode > 0 && rig.nodes[lastNode].distanceTo(end) < clipReach * 1.1) lastNode--;
      const up = work.up.subVectors(rig.nodes[lastNode], end);
      if (up.lengthSq() < 1e-8) up.set(0, 1, 0).applyQuaternion(rig.body.quaternion);
      up.normalize();
      clipTop.copy(end).addScaledVector(up, clipReach);
      clipBottom.copy(end).addScaledVector(up, 0.0885);
      curvePoints.length = 0;
      for (let i = 0; i <= lastNode; i++) curvePoints.push(rig.nodes[i]);
      curvePoints.push(clipTop, clipBottom);
      curve.updateArcLengths();
      for (let i = 0; i < STRAP_POINTS; i++) curve.getPointAt(i / last, samples[i]);

      const total = curve.getLength();
      const strapPortion = 1 - clipTop.distanceTo(clipBottom) / Math.max(total, 0.001);
      const position = strapGeo.getAttribute('position');
      const normal = strapGeo.getAttribute('normal');
      const uv = strapGeo.getAttribute('uv');
      const across = STRAP_PROFILE.length;
      const restLength = rig.rest * SEGMENTS;
      const uvLength = restLength / (strapScale * strapAspect);
      const width = strapScale / Math.max(1, total / Math.max(restLength, 0.001)) ** 0.35;
      const { tangent, toCamera, across: side, facing } = work;

      for (let i = 0; i < STRAP_POINTS; i++) {
        tangent.subVectors(samples[Math.min(last, i + 1)], samples[Math.max(0, i - 1)]);
        if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0);
        tangent.normalize();
        toCamera.subVectors(camera.position, samples[i]).normalize();
        const flat = sides[i].crossVectors(toCamera, tangent);
        if (flat.lengthSq() < 1e-10) flat.copy(i > 0 ? sides[i - 1] : tmp.a.set(1, 0, 0));
        flat.normalize();
        if (i > 0 && flat.dot(sides[i - 1]) < 0) flat.negate();

        const twist = -rig.twist * Math.min(1, i / last / strapPortion) ** 1.3;
        facing.crossVectors(tangent, flat);
        side.copy(flat).multiplyScalar(Math.cos(twist)).addScaledVector(facing, Math.sin(twist));
        facing.crossVectors(tangent, side);

        const point = samples[i];
        const v = (1 - i / last) * uvLength;
        for (let j = 0; j < across; j++) {
          const idx = i * across + j;
          const offset = (STRAP_PROFILE[j] - 0.5) * width;
          const [c, s] = normalDirs[j];
          position.setXYZ(idx, point.x + side.x * offset, point.y + side.y * offset, point.z + side.z * offset);
          normal.setXYZ(idx, facing.x * c + side.x * s, facing.y * c + side.y * s, facing.z * c + side.z * s);
          uv.setXY(idx, STRAP_PROFILE[j], v);
        }
      }
      work.end.copy(side);
      position.needsUpdate = true;
      normal.needsUpdate = true;
      uv.needsUpdate = true;

      side.copy(work.end).addScaledVector(up, -work.end.dot(up)).normalize();
      facing.crossVectors(side, up).normalize();
      work.basis.makeBasis(side, up, facing);
      clip.quaternion.setFromRotationMatrix(work.basis);
      clip.position.copy(end);
    };

    const render = () => {
      card.position.copy(rig.body.position);
      card.quaternion.copy(rig.body.quaternion);
      updateStrap();
      renderer.render(scene, camera);
    };

    const physicsParams = () => {
      const p = propsRef.current;
      const g = 40 * clamp(p.gravity, 0, 3);
      const base = Math.max(g, 20);
      const e = clamp(p.elasticity, 0, 1);
      const d = clamp(p.damping, 0, 1);
      return {
        gravity: g,
        hold: base * lerp(2.2, 5.5, e),
        stiffness: base * 10 * SEGMENTS,
        spring: base * lerp(0.1, 0.4, e) * SEGMENTS,
        bandDamping: base * lerp(0.3, 0.08, e) * SEGMENTS,
        linearDrag: 0.25 * 16 ** d,
        angularDrag: 0.5 * 12 ** d,
        air: 0.15,
        broadside: 0.5,
        spinAir: 0.03,
        nodeDrag: 2,
        nodeAir: 0.2,
        twist: 30,
        twistDamping: 3,
        grip: 40,
        gripDamping: 6,
        breeze: reducedMotion ? 0 : clamp(p.breeze, 0, 1),
      };
    };

    // Spin the card half a turn (or back) around its vertical axis.
    const flip = (point, strength = FLIP_IMPULSE) => {
      const body = rig.body;
      const axis = tmp.a.set(0, 1, 0).applyQuaternion(body.quaternion);
      let direction = rig.turn > 0 ? -1 : 1;
      if (rig.turn === 0) {
        const view = tmp.c.subVectors(point, camera.position).normalize();
        direction = tmp.b.subVectors(point, body.position).cross(view).dot(axis) < 0 ? -1 : 1;
      }
      rig.turn = rig.turn === 0 ? Math.PI * direction : 0;
      body.angular.addScaledVector(axis, strength * direction);
    };

    const tick = (now) => {
      frame = 0;
      if (!alive) return;
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastTime) / 1000));
      lastTime = now;
      clock += dt;

      if (introOffset > 0) {
        if (introStart === null) introStart = now;
        const t = clamp((now - introStart) / 100, 0, 1);
        const eased = 1 - (1 - t) ** 3;
        root.position.x = introOffset * (1 - eased);
        if (t === 1) introOffset = 0;
      }

      const params = physicsParams();
      if (propsRef.current.autoFlip && !reducedMotion && !rig.grab) {
        if (autoFlipping && rig.twist * Math.sign(rig.turn) >= Math.PI * 0.85) {
          autoFlipping = false;
          flip(rig.body.position, 3.5);
          nextAutoFlip = clock + 8 + Math.random() * 12;
        } else if (!autoFlipping && rig.turn === 0 && clock >= nextAutoFlip) {
          flip(rig.body.position, 3.5);
          autoFlipping = rig.turn !== 0;
        }
      }

      stepRig(rig, dt, params, clock);
      const b = rig.body;
      if (!Number.isFinite(b.position.x + b.position.y + b.position.z + b.quaternion.w)) {
        rig.grab = null;
        resetRig(rig, layout, false);
      }
      render();

      const keepAlive = propsRef.current.autoFlip && !reducedMotion;
      const resting = rig.calm > 1.2 && !rig.grab && params.breeze === 0 && !keepAlive;
      if (visible && !resting) frame = requestAnimationFrame(tick);
    };

    function wake() {
      if (!frame && visible && alive) {
        rig.calm = 0;
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    // --- Pointer interaction: drag to swing, tap to flip ---
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const aim = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
    };
    const hitCard = () => {
      card.updateMatrixWorld();
      return raycaster.intersectObjects([cardBody, cardFront, cardBack], false)[0] || null;
    };
    const setCursor = (c) => {
      if (canvas.style.cursor !== c) canvas.style.cursor = c;
    };

    const onPointerDown = (e) => {
      if (!propsRef.current.interactive || e.button > 0) return;
      aim(e);
      const hit = hitCard();
      if (!hit) return;
      rig.grab = {
        local: hit.point.clone().sub(rig.body.position).applyQuaternion(rig.body.quaternion.clone().invert()),
        rotation: rig.body.quaternion.clone(),
        reach: hit.distance,
        from: hit.point.clone(),
        target: hit.point.clone(),
      };
      press = { x: e.clientX, y: e.clientY, time: performance.now(), point: hit.point.clone() };
      canvas.setPointerCapture?.(e.pointerId);
      setCursor('grabbing');
      e.preventDefault();
      wake();
    };
    const onPointerMove = (e) => {
      if (!propsRef.current.interactive) return;
      aim(e);
      if (rig.grab) {
        if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) press = null;
        raycaster.ray.at(rig.grab.reach, rig.grab.target);
        wake();
      } else if (e.pointerType !== 'touch') {
        hovering = !!hitCard();
        setCursor(hovering ? 'grab' : '');
      }
    };
    const onPointerUp = (e) => {
      if (!rig.grab) return;
      rig.grab = null;
      if (press && e.type === 'pointerup' && performance.now() - press.time < 450) flip(press.point);
      press = null;
      canvas.releasePointerCapture?.(e.pointerId);
      setCursor(hovering && e.pointerType !== 'touch' ? 'grab' : '');
      wake();
    };
    const onTouchStart = (e) => {
      if (!propsRef.current.interactive || e.touches.length !== 1) return;
      aim(e.touches[0]);
      if (hitCard()) e.preventDefault();
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('lostpointercapture', onPointerUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });

    const resize = () => {
      viewport.width = Math.max(1, container.clientWidth);
      viewport.height = Math.max(1, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(viewport.width, viewport.height, false);
      sync();
      render();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    intersection.observe(container);
    const onVisibility = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener('visibilitychange', onVisibility);
    syncRef.current = sync;
    resize();

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      syncRef.current = null;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('lostpointercapture', onPointerUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      [cardBody, cardFront, cardBack, ring, clipBody, clipLoop, strap].forEach((m) => m.geometry?.dispose());
      [frontMaterial, backMaterial, edgeMaterial, metalMaterial, strapMaterial].forEach((m) => m.dispose());
      [frontTexture, backTexture, strapTexture, grain, weave].forEach((t) => t.dispose());
      environment.dispose();
      renderer.dispose();
      canvas.parentNode?.removeChild(canvas);
    };
  }, []);

  return <div ref={containerRef} className={`lanyard ${className}`.trim()} style={style} />;
}
