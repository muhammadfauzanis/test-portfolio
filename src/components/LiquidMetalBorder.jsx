import { useEffect, useRef } from 'react';
import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders';

// Animated chrome border rendered with Paper Shaders' liquid-metal shader.
export default function LiquidMetalBorder({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mount = new ShaderMount(
      el,
      liquidMetalFragmentShader,
      {
        u_repetition: 4,
        u_softness: 0.5,
        u_shiftRed: 0.3,
        u_shiftBlue: 0.3,
        u_distortion: 0,
        u_contour: 0,
        u_angle: 45,
        u_scale: 8,
        u_shape: 0,
        u_offsetX: 0.1,
        u_offsetY: -0.1,
      },
      undefined,
      reduced.matches ? 0 : 0.6,
    );
    const onChange = (e) => mount.setSpeed(e.matches ? 0 : 0.6);
    reduced.addEventListener('change', onChange);
    return () => {
      reduced.removeEventListener('change', onChange);
      mount.dispose();
    };
  }, []);

  return <div ref={ref} className={`liquid-metal-border${className ? ` ${className}` : ''}`} aria-hidden="true" />;
}
