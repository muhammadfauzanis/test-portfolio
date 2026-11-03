import { Award, CodeXml, Trophy } from 'lucide-react';
import SmartImage from './SmartImage';
import LiquidMetalBorder from './LiquidMetalBorder';
import { education, experience, stats } from '../data/content';

const STAT_ICONS = { projects: CodeXml, certificates: Award, awards: Trophy };

function ExperienceCard({ item }) {
  return (
    <article className="experience-card">
      <div className="experience-logo">
        <SmartImage src={item.logo} alt={`Logo ${item.name}`} />
      </div>
      <div className="experience-card-copy">
        <h3>{item.name}</h3>
        <p>{item.detail}</p>
        {item.date && <span className="experience-date">{item.date}</span>}
      </div>
    </article>
  );
}

export default function Experience() {
  return (
    <section className="experience-section" aria-labelledby="experience-section-heading">
      <div className="experience-container">
        <div className="experience-columns">
          <div className="experience-group">
            <h2>Education</h2>
            {education.map((item) => (
              <ExperienceCard key={item.name} item={item} />
            ))}
          </div>
          <div className="experience-group">
            <h2>Experience</h2>
            {experience.map((item) => (
              <ExperienceCard key={item.name} item={item} />
            ))}
          </div>
        </div>

        <div className="experience-stats" aria-label="Portfolio statistics">
          {stats.map(({ key, label, detail, value }) => {
            const Icon = STAT_ICONS[key];
            return (
              <article key={key} className="experience-stat-card">
                <LiquidMetalBorder />
                <div className="experience-stat-top">
                  <span className="experience-stat-icon">
                    <Icon size={24} aria-hidden="true" />
                  </span>
                  <strong>{value}</strong>
                </div>
                <h3>{label}</h3>
                <p>{detail}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
