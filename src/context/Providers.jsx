import { createContext, useContext, useEffect, useState } from 'react';
import { sfx } from '../lib/sfx';

const ThemeContext = createContext(null);
const SoundContext = createContext(null);

const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode); ignore.
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readStorage('portfolio-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    writeStorage('portfolio-theme', theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      sfx.switchTheme(next === 'dark');
      return next;
    });

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function SoundProvider({ children }) {
  const [soundEnabled, setSoundEnabled] = useState(() => readStorage('portfolio-sound') !== 'disabled');

  useEffect(() => {
    writeStorage('portfolio-sound', soundEnabled ? 'enabled' : 'disabled');
  }, [soundEnabled]);

  const value = {
    soundEnabled,
    toggleSound: () => setSoundEnabled((v) => !v),
    playSfx: (name, ...args) => {
      if (soundEnabled && sfx[name]) sfx[name](...args);
    },
  };

  // Play a click on every enabled button / link, like the reference site.
  const onClickCapture = (event) => {
    if (!soundEnabled || !(event.target instanceof Element)) return;
    const target = event.target.closest('button, a, [role="button"]');
    if (target && !target.disabled && target.getAttribute('aria-disabled') !== 'true') sfx.click();
  };

  return (
    <SoundContext.Provider value={value}>
      <div style={{ display: 'contents' }} onClickCapture={onClickCapture}>
        {children}
      </div>
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}

export function useTheme() {
  return useContext(ThemeContext);
}
