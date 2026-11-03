import { useEffect } from 'react';
import { ArrowLeft, ChevronRight, CodeXml } from 'lucide-react';
import BorderGlow from './BorderGlow';
import SmartImage from './SmartImage';

export default function ProjectDetail({ project, onBack }) {
  // Tech chips glow toward the cursor; hue shifts across the screen width.
  useEffect(() => {
    const root = document.documentElement;
    const onMove = (e) => {
      root.style.setProperty('--tech-glow-x', `${e.clientX.toFixed(2)}px`);
      root.style.setProperty('--tech-glow-y', `${e.clientY.toFixed(2)}px`);
      root.style.setProperty('--tech-glow-hue', `${210 + (e.clientX / window.innerWidth) * 100}`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      root.style.removeProperty('--tech-glow-x');
      root.style.removeProperty('--tech-glow-y');
      root.style.removeProperty('--tech-glow-hue');
    };
  }, []);

  return (
    <main className="project-detail-page">
      <div className="project-detail-inner">
        <div className="project-detail-breadcrumbs">
          <button type="button" className="project-detail-back" onClick={onBack}>
            <ArrowLeft size={20} aria-hidden="true" />
            <span>Back</span>
          </button>
          <span className="project-detail-crumb-muted">Projects</span>
          <ChevronRight size={18} aria-hidden="true" className="project-detail-crumb-chevron" />
          <span className="project-detail-crumb-current">{project.title}</span>
        </div>

        <div className="project-detail-layout">
          <div className="project-detail-copy">
            <h1 className="project-detail-title">{project.title}</h1>
            <p className="project-detail-description">{project.longDesc}</p>
            <div className="project-detail-tech">
              <h2>
                <CodeXml size={20} aria-hidden="true" /> Technologies Used
              </h2>
              <div className="project-detail-tech-list">
                {project.tags.map((tag) => (
                  <span key={tag} className="project-detail-tech-chip" data-glow>
                    <CodeXml size={18} aria-hidden="true" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {project.image ? (
            <BorderGlow
              className="project-detail-preview-glow"
              edgeSensitivity={8}
              glowColor="205 90 75"
              backgroundColor="#050814"
              borderRadius={20}
              glowRadius={28}
              glowIntensity={1.5}
              coneSpread={23}
              colors={['#38bdf8', '#6366f1', '#c084fc']}
            >
              <div className="project-detail-preview has-image" style={{ background: project.gradient }}>
                <SmartImage src={project.image} mobileSrc={project.mobileImage} alt={`Tampilan ${project.title}`} />
              </div>
            </BorderGlow>
          ) : (
            <div className="project-detail-preview" style={{ background: project.gradient }}>
              <div className="project-detail-preview-placeholder">
                <div className="project-detail-preview-window">
                  <span />
                  <span />
                  <span />
                </div>
                <CodeXml size={54} aria-hidden="true" />
                <span>{project.categoryLabel}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
