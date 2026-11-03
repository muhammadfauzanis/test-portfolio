import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const MIN_DURATION = 3000;
const EXIT_DURATION = 700;
const INITIAL_STATUS = { completed: 0, loaded: 0, total: 3, failures: [] };

export default function WelcomeScreen({ onComplete, onExitAnimationStart }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const completeTimer = useRef(0);
  const exitTimer = useRef(0);
  const finished = useRef(false);
  const unlockScroll = useRef(null);

  // Lock page scroll while the loader is visible.
  useLayoutEffect(() => {
    const { body, documentElement: html } = document;
    const saved = {
      htmlOverflow: html.style.overflow,
      htmlScrollBehavior: html.style.scrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
    };
    let locked = true;
    const prevent = (e) => e.preventDefault();
    const onKeyDown = (e) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('button, a, input, textarea, select, [contenteditable="true"]')
      )
        return;
      if (['ArrowDown', 'ArrowUp', ' ', 'End', 'Home', 'PageDown', 'PageUp'].includes(e.key)) e.preventDefault();
    };

    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.overflow = 'hidden';
    Object.assign(body.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', overflow: 'hidden' });
    document.addEventListener('wheel', prevent, { passive: false });
    document.addEventListener('touchmove', prevent, { passive: false });
    document.addEventListener('keydown', onKeyDown);

    const unlock = () => {
      if (!locked) return;
      locked = false;
      document.removeEventListener('wheel', prevent);
      document.removeEventListener('touchmove', prevent);
      document.removeEventListener('keydown', onKeyDown);
      html.style.overflow = saved.htmlOverflow;
      html.style.scrollBehavior = saved.htmlScrollBehavior;
      body.style.position = saved.bodyPosition;
      body.style.top = saved.bodyTop;
      body.style.left = saved.bodyLeft;
      body.style.width = saved.bodyWidth;
      body.style.height = saved.bodyHeight;
      body.style.overflow = saved.bodyOverflow;
      window.scrollTo(0, 0);
    };
    unlockScroll.current = unlock;
    return () => {
      unlock();
      unlockScroll.current = null;
    };
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    unlockScroll.current?.();
    setLeaving(true);
    exitTimer.current = window.setTimeout(onExitAnimationStart, 200);
    completeTimer.current = window.setTimeout(onComplete, EXIT_DURATION);
  }, [onComplete, onExitAnimationStart]);

  useEffect(() => {
    const controller = new AbortController();
    const start = performance.now();
    finished.current = false;

    const ticker = window.setInterval(() => {
      const elapsed = performance.now() - start;
      setProgress(Math.min(Math.floor((elapsed / MIN_DURATION) * 95), 95));
    }, 50);

    const minDelay = new Promise((resolve) => {
      const t = window.setTimeout(resolve, MIN_DURATION);
      controller.signal.addEventListener(
        'abort',
        () => {
          window.clearTimeout(t);
          resolve();
        },
        { once: true },
      );
    });

    import('../lib/preloadAssets')
      .then(({ preloadLanyardAssets }) =>
        Promise.all([
          preloadLanyardAssets(setStatus, controller.signal, window.matchMedia('(max-width: 767px)').matches),
          minDelay,
        ]).then(([result]) => result),
      )
      .then((result) => {
        if (controller.signal.aborted) return;
        setStatus({ completed: result.total, loaded: result.loaded, total: result.total, failures: result.failures });
        setProgress(100);
        if (result.failures.length > 0)
          console.warn('Sebagian aset lanyard gagal dimuat; halaman tetap dilanjutkan.', result.failures);
        finish();
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('Gagal memeriksa aset lanyard:', error);
        setStatus((s) => ({ ...s, failures: [...s.failures, { label: 'portfolio assets', error }] }));
        setProgress(100);
        finish();
      });

    return () => {
      controller.abort();
      window.clearInterval(ticker);
      window.clearTimeout(completeTimer.current);
      window.clearTimeout(exitTimer.current);
    };
  }, [attempt, finish]);

  const retry = () => {
    window.clearTimeout(completeTimer.current);
    window.clearTimeout(exitTimer.current);
    finished.current = false;
    setLeaving(false);
    setProgress(0);
    setStatus(INITIAL_STATUS);
    setAttempt((n) => n + 1);
  };

  return (
    <div className={`welcome-screen-root${leaving ? ' is-leaving' : ''}`}>
      <div className="welcome-loader">
        <span
          className="welcome-loader-number"
          role="status"
          aria-live="polite"
          aria-label={`Memuat aset portfolio ${progress}%`}
        >
          {progress}
          <span>%</span>
        </span>
        <div className="welcome-progress-track" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <span className="welcome-loader-count">Memuat assets...</span>
        {status.failures.length > 0 && (
          <div className="welcome-loader-error" role="alert">
            <span>{status.failures.length} aset gagal dimuat.</span>
            <div>
              <button type="button" onClick={retry}>
                Coba lagi
              </button>
              <button type="button" onClick={finish}>
                Lanjutkan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
