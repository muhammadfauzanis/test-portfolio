let audioContext = null;
const CLICK_VOLUME = 0.25;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioContext = new Ctx();
  }
  if (audioContext && audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function tone({ type, from, to, gain, duration, start = 0 }) {
  try {
    const ctx = getContext();
    if (!ctx) return;
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch {
    // Audio is a nice-to-have; ignore failures.
  }
}

export const sfx = {
  hover: () => tone({ type: 'sine', from: 800, to: 400, gain: 0.04, duration: 0.04 }),
  click: () => tone({ type: 'triangle', from: 1200, to: 600, gain: CLICK_VOLUME, duration: 0.08 }),
  switchTheme: (dark) =>
    tone({ type: 'sine', from: dark ? 400 : 700, to: dark ? 800 : 350, gain: 0.07, duration: 0.15 }),
  warp: () => tone({ type: 'sawtooth', from: 180, to: 1200, gain: 0.08, duration: 0.35 }),
  success: () =>
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone({ type: 'sine', from: freq, gain: 0.06, duration: 0.25, start: i * 0.08 }),
    ),
};
