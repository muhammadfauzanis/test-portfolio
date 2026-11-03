import { useCallback, useEffect, useRef } from 'react';

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_VARS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const GRADIENT_COLOR_INDEX = [0, 1, 2, 0, 1, 2, 1];

const parseHsl = (value) => {
  const m = value.match(/([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?/);
  return m
    ? { hue: Number.parseFloat(m[1]), saturation: Number.parseFloat(m[2]), lightness: Number.parseFloat(m[3]) }
    : { hue: 40, saturation: 80, lightness: 80 };
};

const glowVars = (color, intensity) => {
  const { hue, saturation, lightness } = parseHsl(color);
  const alphas = [100, 60, 50, 40, 30, 20, 10];
  const suffixes = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  return Object.fromEntries(
    alphas.map((a, i) => [`--glow-color${suffixes[i]}`, `hsl(${hue}deg ${saturation}% ${lightness}% / ${Math.min(a * intensity, 100)}%)`]),
  );
};

const gradientVars = (colors) => {
  const list = colors.length ? colors : ['#c084fc'];
  const vars = Object.fromEntries(
    GRADIENT_VARS.map((name, i) => {
      const c = list[Math.min(GRADIENT_COLOR_INDEX[i], list.length - 1)];
      return [name, `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`];
    }),
  );
  vars['--gradient-base'] = `linear-gradient(${list[0]} 0 100%)`;
  return vars;
};

const isLight = (hex) => {
  const h = hex.trim().replace('#', '');
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(h)) return false;
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return r * 0.2126 + g * 0.7152 + b * 0.0722 > 180;
};

// Card whose border lights up near the cursor with a conic, multi-color glow.
export default function BorderGlow({
  as: Tag = 'div',
  children,
  className = '',
  style,
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = '#120F17',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  fillOpacity = 0.5,
  ...rest
}) {
  const ref = useRef(null);

  const onPointerMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
    const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
    const proximity = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    const angle = dx === 0 && dy === 0 ? 0 : ((180 / Math.PI) * Math.atan2(dy, dx) + 450) % 360;
    el.style.setProperty('--edge-proximity', (proximity * 100).toFixed(3));
    el.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, []);

  useEffect(() => {
    if (!animated || !ref.current) return;
    const el = ref.current;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    const period = 5000;
    let frame = 0;
    const loop = (now) => {
      const t = ((now - start) % period) / period;
      el.classList.add('sweep-active');
      el.style.setProperty('--cursor-angle', `${110 + 360 * t}deg`);
      el.style.setProperty('--edge-proximity', '100');
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      el.classList.remove('sweep-active');
    };
  }, [animated]);

  return (
    <Tag
      ref={ref}
      onPointerMove={onPointerMove}
      className={`border-glow-card${isLight(backgroundColor) ? ' border-glow-card--light' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--card-bg': backgroundColor,
        '--edge-sensitivity': Math.min(Math.max(edgeSensitivity, 0), 79),
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--cone-spread': Math.min(Math.max(coneSpread, 0), 100),
        '--fill-opacity': Math.min(Math.max(fillOpacity, 0), 1),
        ...glowVars(glowColor, Math.max(0, glowIntensity)),
        ...gradientVars(colors),
        ...style,
      }}
      {...rest}
    >
      <span className="edge-light" aria-hidden="true" />
      <div className="border-glow-inner">{children}</div>
    </Tag>
  );
}
