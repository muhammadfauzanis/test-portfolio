import { useEffect, useRef, useState } from 'react';
import { SoundProvider, ThemeProvider } from './context/Providers';
import { useScrollReveal } from './hooks/useScrollReveal';
import WelcomeScreen from './components/WelcomeScreen';
import SpaceBackground from './components/SpaceBackground';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Experience from './components/Experience';
import Spotify from './components/Spotify';
import Portfolio from './components/Portfolio';
import Contact from './components/Contact';
import Footer from './components/Footer';
import ProjectDetail from './components/ProjectDetail';
import { projects } from './data/content';

const INTRO_KEY = 'portfolio-intro-finished';

const introAlreadySeen = () => {
  try {
    return sessionStorage.getItem(INTRO_KEY) === 'true';
  } catch {
    return false;
  }
};

function HomePage({ onOpenProject }) {
  const containerRef = useRef(null);
  const [introDone, setIntroDone] = useState(introAlreadySeen);
  const [lanyardIntro, setLanyardIntro] = useState(introDone);

  useScrollReveal(containerRef, introDone);

  return (
    <div ref={containerRef} className="home-page-container">
      <div className="gsap-ambient" aria-hidden="true">
        <span className="gsap-ambient-orb gsap-ambient-orb-one" />
        <span className="gsap-ambient-orb gsap-ambient-orb-two" />
        <span className="gsap-ambient-orb gsap-ambient-orb-three" />
      </div>
      <SpaceBackground />
      <div className="home-ui-scale">
        {!introDone && (
          <WelcomeScreen
            onComplete={() => {
              try {
                sessionStorage.setItem(INTRO_KEY, 'true');
              } catch {
                // Ignore storage failures.
              }
              setIntroDone(true);
            }}
            onExitAnimationStart={() => setLanyardIntro(true)}
          />
        )}
        <Navbar />
        <main>
          <Hero lanyardIntroStarted={lanyardIntro} />
          <About />
          <Experience />
          <Spotify />
          <Portfolio onOpenProject={onOpenProject} />
          <Contact />
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Minimal history-based routing: "/" and "/project/:id".
export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openProject = (id) => {
    window.history.pushState({ fromPortfolio: true }, '', `/project/${encodeURIComponent(id)}`);
    setPath(window.location.pathname);
    window.scrollTo(0, 0);
  };

  const back = () => {
    if (window.history.state?.fromPortfolio) {
      window.history.back();
      return;
    }
    window.history.pushState({}, '', '/#Portofolio');
    setPath('/');
    window.requestAnimationFrame(() => document.getElementById('Portofolio')?.scrollIntoView());
  };

  const match = path.match(/^\/project\/([^/]+)\/?$/);
  const projectId = match ? decodeURIComponent(match[1]) : null;
  const project = projects.find((p) => p.id === projectId);

  return (
    <ThemeProvider>
      <SoundProvider>
        {project ? <ProjectDetail project={project} onBack={back} /> : <HomePage onOpenProject={openProject} />}
      </SoundProvider>
    </ThemeProvider>
  );
}
