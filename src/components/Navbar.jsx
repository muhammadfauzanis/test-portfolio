import { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { Menu, Send, Volume2, VolumeX, X } from 'lucide-react';
import GlassSurface from './GlassSurface';
import { useSound } from '../context/Providers';
import { site } from '../data/content';

const LINKS = [
  { name: 'Home', href: '#Home' },
  { name: 'About', href: '#About' },
  { name: 'Portfolio', section: 'Portofolio', href: '#Portofolio' },
  { name: 'Contact', href: '#Contact' },
];
const SECTIONS = ['Home', 'About', 'Portofolio', 'Contact'];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('Home');
  const [menuOpen, setMenuOpen] = useState(false);
  const { soundEnabled, toggleSound } = useSound();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const threshold = window.innerHeight * 0.38;
      let current = SECTIONS[0];
      SECTIONS.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) current = id;
      });
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Pop the active pill in, then let it breathe with a soft blue glow.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const pill = document.querySelector('.navbar-link-item.is-active .navbar-active-pill');
    if (!pill) return;
    const enter = gsap.fromTo(pill, { autoAlpha: 0, scale: 0.82 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2)' });
    const pulse = gsap.to(pill, {
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), 0 0 28px rgba(59,130,246,.36)',
      duration: 1.5,
      delay: 0.55,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    return () => {
      enter.kill();
      pulse.kill();
      gsap.set(pill, { clearProps: 'all' });
    };
  }, [active]);

  const go = (event, href) => {
    event.preventDefault();
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  const isActive = (link) => active === (link.section || link.name);

  return (
    <header className={`navbar-root ${scrolled ? 'navbar-scrolled' : ''}`}>
      <GlassSurface
        className="navbar-container"
        width="var(--navbar-width)"
        height="auto"
        borderRadius={999}
        blur={14}
        distortionScale={-70}
        displace={0.25}
        greenOffset={4}
        blueOffset={8}
        backgroundOpacity={scrolled ? 0.12 : 0.08}
      >
        <nav className="navbar-links">
          {LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => go(e, link.href)}
              className={`navbar-link-item ${isActive(link) ? 'is-active' : ''}`}
            >
              <span>{link.name}</span>
              {isActive(link) && <span className="navbar-active-pill" />}
            </a>
          ))}
        </nav>
        <span className="navbar-mobile-brand" aria-label={site.brand}>
          {site.brand}
        </span>
        <div className="navbar-actions">
          <span className="navbar-actions-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={toggleSound}
            className="navbar-icon-btn"
            title={soundEnabled ? 'Matikan Suara SFX' : 'Nyalakan Suara SFX'}
            aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? <Volume2 size={16} className="text-blue-400" /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            className="navbar-mobile-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </GlassSurface>

      <div className={`navbar-mobile-menu ${menuOpen ? 'is-open' : ''}`}>
        <GlassSurface
          className="navbar-mobile-glass"
          width="100%"
          height="auto"
          borderRadius={20}
          blur={14}
          distortionScale={-70}
          displace={0.25}
          greenOffset={4}
          blueOffset={8}
          backgroundOpacity={0.08}
        >
          <div className="navbar-mobile-inner">
            {LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => go(e, link.href)}
                className={`navbar-mobile-link ${isActive(link) ? 'is-active' : ''}`}
              >
                <span>{link.name}</span>
                {isActive(link) && <span className="navbar-mobile-indicator" />}
              </a>
            ))}
            <div className="navbar-mobile-footer">
              <a href="#Contact" onClick={(e) => go(e, '#Contact')} className="navbar-mobile-cta">
                <span>Hubungi Saya</span>
                <Send size={14} />
              </a>
            </div>
          </div>
        </GlassSurface>
      </div>
    </header>
  );
}
