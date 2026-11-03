import { useEffect, useState } from 'react';
import Particles from './Particles';
import { useIsMobile } from '../hooks/useIsMobile';

const METEORS = [
  { top: '-8%', left: '8%', duration: '9s', delay: '-3s' },
  { top: '-12%', left: '35%', duration: '11s', delay: '-9s' },
  { top: '12%', left: '-10%', duration: '10s', delay: '-6s' },
  { top: '28%', left: '4%', duration: '12s', delay: '-10s' },
  { top: '-14%', left: '54%', duration: '10s', delay: '-2s' },
  { top: '-6%', left: '78%', duration: '12s', delay: '-7s' },
  { top: '8%', left: '18%', duration: '11s', delay: '-5s' },
  { top: '22%', left: '-8%', duration: '9s', delay: '-8s' },
  { top: '-10%', left: '92%', duration: '13s', delay: '-11s' },
  { top: '36%', left: '-12%', duration: '11s', delay: '-4s' },
  { top: '-18%', left: '43%', duration: '8s', delay: '-6s' },
  { top: '4%', left: '3%', duration: '12s', delay: '-1s' },
  { top: '16%', left: '30%', duration: '10s', delay: '-9s' },
  { top: '30%', left: '-6%', duration: '13s', delay: '-12s' },
  { top: '-5%', left: '65%', duration: '9s', delay: '-4s' },
];

export default function SpaceBackground() {
  const isMobile = useIsMobile();
  const [scrolling, setScrolling] = useState(false);

  // On phones, pause the star field while the user scrolls to keep it smooth.
  useEffect(() => {
    if (!isMobile) return;
    let timer;
    const onScroll = () => {
      setScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScrolling(false), 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
    };
  }, [isMobile]);

  return (
    <>
      <Particles
        particleColors={['#ffffff', '#ffffff', '#ffffff']}
        particleCount={isMobile ? 280 : 660}
        pixelRatio={isMobile ? 1 : undefined}
        particleSpread={10}
        speed={0.01}
        particleBaseSize={40}
        glow={0.05}
        twinkle={0}
        sizeRandomness={2}
        drift="up"
        driftSpeed={0.6}
        alphaParticles
        cameraDistance={20}
        opacity={1}
        paused={isMobile && scrolling}
        className="particles-background"
        style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}
      />
      <div className="meteor-background" aria-hidden="true">
        {METEORS.map((m, i) => (
          <span
            key={i}
            className="meteor"
            style={{
              '--meteor-top': m.top,
              '--meteor-left': m.left,
              '--meteor-duration': m.duration,
              '--meteor-delay': m.delay,
            }}
          />
        ))}
      </div>
    </>
  );
}
