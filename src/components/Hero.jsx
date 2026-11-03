import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ArrowRight, Send } from 'lucide-react';
import { socialIcons } from './SocialIcons';
import { useIsMobile } from '../hooks/useIsMobile';
import { hero, lanyardAssets, socials } from '../data/content';

const Lanyard = lazy(() => import('./Lanyard'));

function LanyardCard({ introFinished }) {
  const isMobile = useIsMobile();
  return (
    <section className={`lanyard-card-container${isMobile ? ' is-mobile' : ''}`} aria-label="Interactive 3D Lanyard">
      <div className="lanyard-viewport">
        <Suspense fallback={null}>
          <Lanyard
            frontImage={isMobile ? lanyardAssets.frontMobile : lanyardAssets.front}
            backImage={isMobile ? lanyardAssets.backMobile : lanyardAssets.back}
            strapImage={lanyardAssets.strap}
            cardColor="#04010e09"
            imagePadding={0.035}
            strapColor="#111827"
            finish="glossy"
            anchor={isMobile ? 'center' : 'right'}
            orientation="portrait"
            size={0.62}
            cornerRadius={0.25}
            strapLength={0.59}
            strapWidth={0.62}
            gravity={1.2}
            damping={0.35}
            elasticity={0.7}
            breeze={0.1}
            interactive
            autoFlip
            metal="silver"
            intro={introFinished}
          />
        </Suspense>
      </div>
    </section>
  );
}

function useTypewriter(words) {
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const step = useCallback(() => {
    const word = words[wordIndex];
    if (typing) {
      if (charIndex < word.length) {
        setText((t) => t + word[charIndex]);
        setCharIndex((i) => i + 1);
      } else {
        setTimeout(() => setTyping(false), 2000);
      }
    } else if (charIndex > 0) {
      setText((t) => t.slice(0, -1));
      setCharIndex((i) => i - 1);
    } else {
      setWordIndex((i) => (i + 1) % words.length);
      setTyping(true);
    }
  }, [words, wordIndex, charIndex, typing]);

  useEffect(() => {
    const timer = setTimeout(step, typing ? 90 : 45);
    return () => clearTimeout(timer);
  }, [step, typing]);

  return text;
}

export default function Hero({ lanyardIntroStarted }) {
  const typed = useTypewriter(hero.roles);

  return (
    <section className="hero-root-section" id="Home">
      <LanyardCard introFinished={lanyardIntroStarted} />
      <div className="hero-container-inner">
        <div className="hero-text-col">
          <div className="hero-heading-group">
            <h1 className="hero-h1-gradient">{hero.headingGradient}</h1>
            <h1 className="hero-h1-white">{hero.headingWhite}</h1>
          </div>
          <div className="hero-typewriter-row">
            <span className="hero-typewriter-text">{typed}</span>
            <span className="hero-typewriter-cursor" />
          </div>
          <p className="hero-description-copy">{hero.description}</p>
          <div className="hero-action-row">
            <a href="#Portofolio" className="hero-btn-primary">
              <span>Lihat Projek</span>
              <ArrowRight size={16} />
            </a>
            <a href="#Contact" className="hero-btn-secondary">
              <span>Hubungi Saya</span>
              <Send size={15} />
            </a>
          </div>
          <div className="hero-find-me-wrap">
            <span className="hero-find-me-label">Find me</span>
            <div className="hero-social-buttons">
              {socials.map((s) => {
                const Icon = socialIcons[s.key];
                return (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-social-icon-btn"
                    aria-label={s.label}
                    title={s.label}
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
