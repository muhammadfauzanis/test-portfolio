import { useEffect, useRef } from 'react';

// Instanced WebGL2 star field. Each particle is a screen-aligned quad drawn
// with a soft circular falloff; particles drift upward and wrap around.
const DEPTH_STRETCH = 10;
const FOCAL = 1 / Math.tan((7.5 * Math.PI) / 180);
const NEAR = 0.1;
const FAR = 100;

const VERTEX = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec3 aPosition;
layout(location = 2) in vec4 aRandom;
layout(location = 3) in vec3 aColor;
uniform float uSpread;
uniform float uTime;
uniform float uCamera;
uniform float uAspect;
uniform vec2 uView;
uniform float uRatio;
uniform float uSize;
uniform float uRandomness;
uniform float uGlow;
uniform float uTwinkle;
uniform int uDrift;
uniform float uTravel;
out vec2 vLocal;
out float vRadius;
out float vAlpha;
out float vHalo;
out float vSeed;
out vec3 vColor;

vec3 bob(vec4 r, float t) {
  return vec3(
    sin(t * r.z + 6.28 * r.w) * mix(0.1, 1.5, r.x),
    sin(t * r.y + 6.28 * r.x) * mix(0.1, 1.5, r.w),
    sin(t * r.w + 6.28 * r.y) * mix(0.1, 1.5, r.z)
  );
}

void main() {
  vec3 pos = aPosition * uSpread;
  pos.z *= ${DEPTH_STRETCH.toFixed(1)};
  vec3 wobble = bob(aRandom, uTime);
  vec3 world = pos + wobble;
  float edge = 1.0;
  if (uDrift == 1 || uDrift == 2) {
    float span = uSpread * 2.0 + 3.0;
    float k = mod(aRandom.w * span + wobble.y + (uDrift == 1 ? uTravel : -uTravel), span);
    world.y = k - span * 0.5;
    edge = smoothstep(0.0, span * 0.12, k) * smoothstep(span, span * 0.88, k);
  }
  vec3 view = world - vec3(0.0, 0.0, uCamera);
  float dist = length(view);
  float ahead = -view.z;
  if (ahead < ${NEAR.toFixed(2)} || ahead > ${FAR.toFixed(1)}) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  edge *= smoothstep(1.0, 4.0, ahead);
  vec2 ndc = vec2(view.x * ${FOCAL.toFixed(6)} / uAspect, view.y * ${FOCAL.toFixed(6)}) / ahead;
  vec2 screen = (ndc * 0.5 + 0.5) * uView;

  float diameter = uRandomness <= 0.0 ? uSize : uSize * (1.0 + uRandomness * (aRandom.x - 0.5)) / dist;
  float device = diameter * uRatio;
  float radius = max(diameter, 1.0 / uRatio) * 0.5;
  float coverage = min(1.0, device * device);
  float halo = uGlow > 0.0 ? radius * 2.5 + 2.0 : 0.0;
  float extent = radius + halo + 1.5;

  float twinkle = 1.0 - uTwinkle * 0.6 * (0.5 + 0.5 * sin(uTime * (6.0 + aRandom.y * 14.0) + aRandom.w * 40.0));
  float far = smoothstep(${FAR.toFixed(1)}, ${(FAR * 0.9).toFixed(1)}, ahead);

  vLocal = aCorner * extent;
  vRadius = radius;
  vHalo = halo;
  vSeed = aRandom.y;
  vAlpha = min(1.0, coverage * twinkle) * far * edge;
  vColor = aColor;
  gl_Position = vec4((screen + aCorner * extent) / uView * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform float uGlow;
uniform float uRatio;
uniform float uTime;
uniform float uSoft;
uniform float uShimmer;
uniform float uOpacity;
in vec2 vLocal;
in float vRadius;
in float vAlpha;
in float vHalo;
in float vSeed;
in vec3 vColor;
out vec4 outColor;

void main() {
  float soft = 0.7 / uRatio + vRadius * uSoft;
  float d = length(vLocal);
  float shape = 1.0 - smoothstep(vRadius - soft, vRadius + soft, d);
  float halo = vHalo > 0.0 ? exp(-d / (vHalo * 0.35)) * uGlow * 0.4 : 0.0;
  float alpha = clamp(shape + halo * (1.0 - shape), 0.0, 1.0) * vAlpha * uOpacity * (1.0 - uSoft);
  if (alpha < 0.002) discard;
  vec2 uv = vLocal / max(vRadius * 2.0, 0.0001) + 0.5;
  vec3 color = clamp(vColor + uShimmer * 0.2 * sin(uv.yxx + uTime + vSeed * 6.28), 0.0, 1.0);
  outColor = vec4(color * alpha, alpha);
}`;

const DRIFT = { none: 0, up: 1, down: 2 };

const compile = (gl, vertex, fragment) => {
  const make = (type, src) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  const vs = make(gl.VERTEX_SHADER, vertex);
  const fs = make(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

// Deterministic PRNG so the star layout is stable between reloads.
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

const parseColor = (ctx, color) => {
  if (!ctx) return [1, 1, 1];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
};

export default function Particles({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors = ['#ffffff'],
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  pixelRatio,
  glow = 0.5,
  twinkle = 0.3,
  drift = 'none',
  driftSpeed = 1,
  alphaParticles = false,
  opacity = 1,
  paused = false,
  className = '',
  style,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const settings = useRef(null);
  settings.current = {
    count: Math.max(1, Math.round(particleCount)),
    spread: Math.max(0.1, particleSpread),
    speed,
    colors: particleColors.length ? particleColors : ['#ffffff'],
    size: Math.max(0, particleBaseSize),
    randomness: Math.max(0, sizeRandomness),
    camera: Math.max(1, cameraDistance),
    dpr: pixelRatio,
    glow: Math.max(0, glow),
    twinkle: Math.min(1, Math.max(0, twinkle)),
    drift: DRIFT[drift] ?? 0,
    driftSpeed,
    soft: alphaParticles,
    opacity: Math.min(1, Math.max(0, opacity)),
    paused,
  };
  const kick = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!container || !canvas || !gl) return;
    const prog = compile(gl, VERTEX, FRAGMENT);
    if (!prog) return;

    const corners = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const positions = gl.createBuffer();
    const randoms = gl.createBuffer();
    const colors = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const instanced = (buffer, location, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(location, 1);
    };
    instanced(positions, 1, 3);
    instanced(randoms, 2, 4);
    instanced(colors, 3, 3);
    gl.bindVertexArray(null);

    const colorCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const view = { width: 1, height: 1, ratio: 1 };
    const clock = { time: 0, travel: 0 };
    const geometry = { key: '', count: 0 };
    let frame = 0;
    let last = 0;
    let visible = true;

    const buildGeometry = (s) => {
      const key = `${s.count}|${s.colors.join(',')}`;
      if (key === geometry.key) return;
      geometry.key = key;
      const rand = seeded(1);
      const pos = new Float32Array(s.count * 3);
      const rnd = new Float32Array(s.count * 4);
      const col = new Float32Array(s.count * 3);
      const palette = s.colors.map((c) => parseColor(colorCtx, c));
      for (let i = 0; i < s.count; i++) {
        let x, y, z, len;
        do {
          x = rand() * 2 - 1;
          y = rand() * 2 - 1;
          z = rand() * 2 - 1;
          len = x * x + y * y + z * z;
        } while (len > 1 || len === 0);
        const r = Math.cbrt(rand());
        pos.set([x * r, y * r, z * r], i * 3);
        rnd.set([rand(), rand(), rand(), rand()], i * 4);
        col.set(palette[Math.floor(rand() * palette.length)], i * 3);
      }
      geometry.count = s.count;
      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, randoms);
      gl.bufferData(gl.ARRAY_BUFFER, rnd, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, colors);
      gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
    };

    const draw = () => {
      const s = settings.current;
      buildGeometry(s);
      const u = prog.uniforms;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog.program);
      gl.bindVertexArray(vao);
      gl.uniform1f(u.uSpread, s.spread);
      gl.uniform1f(u.uTime, clock.time);
      gl.uniform1f(u.uCamera, s.camera);
      gl.uniform1f(u.uAspect, view.width / view.height);
      gl.uniform2f(u.uView, view.width, view.height);
      gl.uniform1f(u.uRatio, view.ratio);
      gl.uniform1f(u.uSize, s.size);
      gl.uniform1f(u.uRandomness, s.randomness);
      gl.uniform1f(u.uGlow, s.glow);
      gl.uniform1f(u.uTwinkle, s.twinkle);
      gl.uniform1i(u.uDrift, s.drift);
      gl.uniform1f(u.uTravel, clock.travel);
      gl.uniform1f(u.uSoft, s.soft ? 0.2 : 0);
      gl.uniform1f(u.uShimmer, 1);
      gl.uniform1f(u.uOpacity, s.opacity);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, geometry.count);
      gl.bindVertexArray(null);
    };

    const tick = (now) => {
      frame = 0;
      if (!visible || document.hidden) return;
      const s = settings.current;
      const dt = last ? Math.min(0.05, Math.max(0.0005, (now - last) / 1000)) : 1 / 60;
      last = now;
      if (s.paused) {
        draw();
        last = 0;
        return;
      }
      const motion = reducedMotion ? 0 : 1;
      clock.time += dt * s.speed * motion;
      clock.travel += dt * s.driftSpeed * motion * 0.9;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      const s = settings.current;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      const dpr = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
      view.width = w;
      view.height = h;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      view.ratio = canvas.width / w;
      draw();
      start();
    };

    const onVisibility = () => {
      last = 0;
      start();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) {
        last = 0;
        start();
      }
    });
    intersection.observe(container);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    let dpr = settings.current.dpr;
    kick.current = () => {
      if (settings.current.dpr !== dpr) {
        dpr = settings.current.dpr;
        resize();
      } else {
        if (!frame) draw();
        start();
      }
    };

    return () => {
      cancelAnimationFrame(frame);
      kick.current = null;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(prog.program);
      [corners, positions, randoms, colors].forEach((b) => gl.deleteBuffer(b));
      gl.deleteVertexArray(vao);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  useEffect(() => {
    kick.current?.();
  });

  return (
    <div ref={containerRef} className={`particles-container${className ? ` ${className}` : ''}`} style={style}>
      <canvas ref={canvasRef} className="particles-canvas" aria-hidden="true" />
    </div>
  );
}
