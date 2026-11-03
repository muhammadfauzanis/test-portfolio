import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Award, CodeXml, Cpu, ExternalLink, Trophy, X } from 'lucide-react';
import SmartImage from './SmartImage';
import BorderGlow from './BorderGlow';
import LiquidMetalBorder from './LiquidMetalBorder';
import { awards, certificates, projects, skills } from '../data/content';

gsap.registerPlugin(ScrollTrigger);

const TABS = [
  { id: 'projects', label: 'Projects', icon: CodeXml },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'awards', label: 'Achievements', icon: Trophy },
  { id: 'skills', label: 'Tech Stack', icon: Cpu },
];

function CertificateGrid({ items, kind, onOpen }) {
  const noun = kind === 'awards' ? 'piagam' : 'sertifikat';
  return (
    <div className="portfolio-certificates-grid">
      {items.map((item) => (
        <article
          key={item.id}
          className="portfolio-cert-card"
          role="button"
          tabIndex={0}
          aria-label={`Lihat ${noun} ${item.title}`}
          onClick={() => onOpen(item)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpen(item);
            }
          }}
        >
          <div className="portfolio-cert-preview">
            <SmartImage className="portfolio-cert-preview-image" src={item.image} alt={`Preview ${item.title}`} loading="lazy" />
            <span className="portfolio-cert-preview-overlay">
              Lihat {noun}
              <ExternalLink size={18} aria-hidden="true" />
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function Portfolio({ onOpenProject }) {
  const sectionRef = useRef(null);
  const previousTab = useRef(null);
  const [tab, setTab] = useState('projects');
  const [viewer, setViewer] = useState(null);

  // Stagger the cards of the newly selected tab in.
  useEffect(() => {
    const prev = previousTab.current;
    previousTab.current = tab;
    if (!prev || prev === tab) return;
    const section = sectionRef.current;
    const view = section?.querySelector(`.portfolio-${tab}-view`);
    const selector =
      tab === 'projects' ? '.portfolio-project-card' : tab === 'skills' ? '.portfolio-skill-card' : '.portfolio-cert-card';
    const cards = view?.querySelectorAll(selector);
    if (!cards?.length) return;
    const desktop = !window.matchMedia('(max-width: 767px)').matches;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 28, scale: 0.94, ...(desktop ? { filter: 'blur(5px)' } : {}) },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          ...(desktop ? { filter: 'blur(0px)' } : {}),
          duration: 0.52,
          stagger: { each: 0.065, from: 'start' },
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility,filter',
        },
      );
      const media = view.querySelectorAll('.portfolio-card-thumbnail-image, .portfolio-skill-logo, .portfolio-cert-preview-image');
      if (media.length)
        gsap.fromTo(
          media,
          { scale: 0.86, autoAlpha: 0 },
          {
            scale: 1,
            autoAlpha: 1,
            duration: 0.58,
            stagger: { each: 0.055, from: 'start' },
            ease: 'back.out(1.4)',
            clearProps: 'transform,opacity,visibility',
          },
        );
      const activeBtn = section.querySelector('.portfolio-tab-btn.is-active');
      if (activeBtn) gsap.fromTo(activeBtn, { scale: 0.95 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' });
    }, section);
    return () => ctx.revert();
  }, [tab]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => window.cancelAnimationFrame(frame);
  }, [tab]);

  // Lock scroll + close on Escape while the certificate viewer is open.
  useEffect(() => {
    if (!viewer) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setViewer(null);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, [viewer]);

  return (
    <section ref={sectionRef} className="portfolio-root-section" id="Portofolio" aria-labelledby="portfolio-section-heading">
      <div className="portfolio-container-inner">
        <h2 className="section-display-title" id="portfolio-section-heading">
          Portfolio
        </h2>
        <div className="portfolio-tab-bar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`portfolio-tab-btn ${tab === id ? 'is-active' : ''}`}>
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {tab === 'projects' && (
          <div className="portfolio-projects-view">
            <div className="portfolio-cards-grid">
              {projects.map((project) => (
                <article key={project.id} className="portfolio-project-card">
                  <LiquidMetalBorder className="portfolio-project-metal-border" />
                  <div className="portfolio-project-card-content">
                    <div className="portfolio-card-thumbnail" style={{ background: project.image ? '#000' : project.gradient }}>
                      {project.image && (
                        <SmartImage
                          className="portfolio-card-thumbnail-image"
                          src={project.image}
                          mobileSrc={project.mobileImage}
                          alt={`Thumbnail ${project.title}`}
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="portfolio-card-body">
                      <h3 className="portfolio-card-title">{project.title}</h3>
                      <p className="portfolio-card-desc">{project.description}</p>
                      <button
                        type="button"
                        className="portfolio-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProject(project.id);
                        }}
                      >
                        <span>Details</span>
                        <ArrowRight size={20} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === 'skills' && (
          <div className="portfolio-skills-view">
            <div className="portfolio-skills-grid">
              {skills.map((skill) => (
                <BorderGlow
                  key={skill.name}
                  as="article"
                  className="portfolio-skill-card"
                  edgeSensitivity={0}
                  glowColor="40 80 80"
                  backgroundColor="#0e1625"
                  borderRadius={20}
                  glowRadius={28}
                  glowIntensity={2.2}
                  coneSpread={23}
                  colors={['#c084fc', '#f472b6', '#38bdf8']}
                >
                  <div className="portfolio-skill-card-content">
                    <div className="portfolio-skill-mark">
                      <SmartImage className={`portfolio-skill-logo ${skill.logoClass || ''}`} src={skill.logo} alt="" loading="lazy" />
                    </div>
                    <h3 className="portfolio-skill-name">{skill.name}</h3>
                  </div>
                </BorderGlow>
              ))}
            </div>
          </div>
        )}

        {tab === 'certificates' && (
          <div className="portfolio-certificates-view">
            <CertificateGrid items={certificates} kind="certificates" onOpen={setViewer} />
          </div>
        )}

        {tab === 'awards' && (
          <div className="portfolio-awards-view">
            <CertificateGrid items={awards} kind="awards" onOpen={setViewer} />
          </div>
        )}
      </div>

      {viewer &&
        createPortal(
          <div className="portfolio-cert-viewer-backdrop" onClick={() => setViewer(null)}>
            <button type="button" className="portfolio-cert-viewer-close" onClick={() => setViewer(null)} aria-label="Tutup sertifikat">
              <X size={30} />
            </button>
            <div className="portfolio-cert-viewer" role="dialog" aria-modal="true" aria-label={viewer.title} onClick={(e) => e.stopPropagation()}>
              <SmartImage className="portfolio-cert-viewer-image" src={viewer.image} mobileSrc={viewer.mobileImage} alt={viewer.title} />
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
