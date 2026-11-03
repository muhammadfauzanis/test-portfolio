import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const REVEAL_OFFSET = 120;
const BODY_DELAY = 90;

const SECTIONS = [
  ['.about-root-section', '.section-display-title', '.about-intro, .about-portrait-stage, .about-bio'],
  ['.experience-section', '.experience-group h2', '.experience-card, .experience-stat-card'],
  ['.spotify-section', '.spotify-copy h2', '.spotify-card'],
  [
    '.portfolio-root-section',
    '.section-display-title',
    '.portfolio-tab-bar, .portfolio-projects-view, .portfolio-skills-view, .portfolio-certificates-view, .portfolio-awards-view',
  ],
  ['.contact-root-section', '.section-display-title', '.contact-panel'],
];

// Fade/slide (and on desktop, un-blur) headings then bodies in as each section scrolls into view.
const revealSection = (section, headingSelector, bodySelector, blur) => {
  const headings = section.querySelectorAll(headingSelector);
  const bodies = section.querySelectorAll(bodySelector);
  if (!headings.length && !bodies.length) return;
  const from = { autoAlpha: 0, y: 24, ...(blur ? { filter: 'blur(6px)' } : {}) };
  const to = { autoAlpha: 1, y: 0, ...(blur ? { filter: 'blur(0px)' } : {}) };
  const trigger = headings[0] || section;
  const animate = (targets, extraOffset = 0, stagger = 0.12) => {
    if (!targets.length) return;
    gsap.fromTo(targets, from, {
      ...to,
      duration: 0.65,
      stagger,
      ease: 'power3.out',
      scrollTrigger: {
        trigger,
        start: `top bottom-=${REVEAL_OFFSET + extraOffset}`,
        toggleActions: 'play none none reverse',
      },
    });
  };
  animate(headings, 0, 0.08);
  animate(bodies, BODY_DELAY);
};

export function useScrollReveal(containerRef, enabled) {
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const blur = !isMobile;

    const ctx = gsap.context(() => {
      if (!isMobile)
        gsap.utils.toArray('.gsap-ambient-orb', container).forEach((orb, i) => {
          gsap.to(orb, {
            x: i % 2 === 0 ? 28 : -24,
            y: i === 1 ? -34 : 26,
            scale: i === 2 ? 1.12 : 1.06,
            autoAlpha: i === 1 ? 0.72 : 0.9,
            duration: 7 + i * 1.8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: i * -1.4,
          });
        });

      SECTIONS.forEach(([sectionSel, headingSel, bodySel]) => {
        const section = container.querySelector(sectionSel);
        if (section) revealSection(section, headingSel, bodySel, blur);
      });

      const comments = container.querySelector('.contact-comments-panel');
      if (comments)
        gsap.fromTo(
          comments,
          { autoAlpha: 0, y: 24, ...(blur ? { filter: 'blur(6px)' } : {}) },
          {
            autoAlpha: 1,
            y: 0,
            ...(blur ? { filter: 'blur(0px)' } : {}),
            duration: 0.65,
            ease: 'power3.out',
            scrollTrigger: { trigger: comments, start: 'top bottom-=210', toggleActions: 'play none none reverse' },
          },
        );
    }, container);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [containerRef, enabled]);
}
