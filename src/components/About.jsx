import { useEffect, useRef } from 'react';
import { ArrowUpRight, CodeXml, FileText } from 'lucide-react';
import SmartImage from './SmartImage';
import { about } from '../data/content';

export default function About() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const hideTimer = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        stage.classList.toggle('is-in-view', entry.isIntersecting);
        if (!entry.isIntersecting) {
          clearTimeout(hideTimer.current);
          stage.classList.remove('spider-hovered');
          delete stage.dataset.spiderVisible;
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      clearTimeout(hideTimer.current);
    };
  }, []);

  // A circular "lens" follows the cursor and reveals the alternate photo.
  const onPointerMove = (e) => {
    const stage = stageRef.current;
    const portrait = stage?.querySelector('.about-portrait');
    if (!stage || !portrait) return;
    clearTimeout(hideTimer.current);
    const rect = portrait.getBoundingClientRect();
    stage.style.setProperty('--hover-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    stage.style.setProperty('--hover-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
    stage.classList.add('spider-hovered');
    stage.dataset.spiderVisible = 'true';
  };

  const onPointerLeave = () => {
    const stage = stageRef.current;
    if (!stage) return;
    delete stage.dataset.spiderVisible;
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => stage.classList.remove('spider-hovered'), 7000);
  };

  return (
    <section ref={sectionRef} className="about-root-section" id="About" aria-labelledby="about-section-heading">
      <h2 className="section-display-title" id="about-section-heading">
        About Me
      </h2>
      <div className="about-container-inner">
        <div className="about-intro">
          <h2 className="about-title" id="about-title">
            <span className="about-title-greeting">{about.greeting}</span>
            <span>
              {about.firstLine}
              <br />
              {about.secondLine}
            </span>
          </h2>
          <a href="#Contact" className="about-action about-action-primary">
            <FileText size={17} />
            <span>Hubungi Saya</span>
          </a>
        </div>

        <div
          ref={stageRef}
          className="about-portrait-stage"
          aria-label="Portrait with hover reveal effect"
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <div className="about-portrait-glow" />
          <div className="about-portrait">
            <SmartImage className="about-person-image" src={about.portrait} alt="Foto profil (placeholder)" />
            <SmartImage
              className="about-spider-image"
              src={about.portraitAlt}
              mobileSrc={about.portraitAltMobile}
              alt=""
              aria-hidden="true"
            />
          </div>
          <span className="about-portrait-orbit about-portrait-orbit-one" />
          <span className="about-portrait-orbit about-portrait-orbit-two" />
          <span className="about-portrait-spark" />
        </div>

        <div className="about-bio">
          <p>
            {about.bioLead}
            <strong>{about.bioStrong}</strong>
            {about.bioRest}
          </p>
          <p>{about.bio2}</p>
          <a href="#Portofolio" className="about-action about-action-secondary">
            <CodeXml size={17} />
            <span>Lihat Projek</span>
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
