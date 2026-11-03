import { lanyardAssets } from '../data/content';

const TIMEOUT = 15000;

const desktopAssets = [
  { label: 'Kartu depan', url: lanyardAssets.front },
  { label: 'Kartu belakang', url: lanyardAssets.back },
  { label: 'Tali kartu', url: lanyardAssets.strap },
];

const mobileAssets = [
  { label: 'Kartu depan', url: lanyardAssets.frontMobile },
  { label: 'Kartu belakang', url: lanyardAssets.backMobile },
  { label: 'Tali kartu', url: lanyardAssets.strap },
];

const loadImage = ({ label, url }, signal) =>
  new Promise((resolve) => {
    const img = new Image();
    let done = false;
    let timer;

    const finish = (error = null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve(error ? { error, label } : { label });
    };
    const onAbort = () => {
      img.src = '';
      finish(new DOMException('Pemuatan dibatalkan', 'AbortError'));
    };

    img.onload = async () => {
      try {
        await img.decode?.();
        finish();
      } catch (e) {
        img.naturalWidth > 0 ? finish() : finish(e);
      }
    };
    img.onerror = () => finish(new Error(`Gagal memuat ${label}`));

    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    timer = window.setTimeout(() => finish(new Error(`Waktu memuat ${label} habis`)), TIMEOUT);
    img.src = url;
  });

export async function preloadLanyardAssets(onProgress, signal, isMobile = false) {
  const list = isMobile ? mobileAssets : desktopAssets;
  let completed = 0;
  let loaded = 0;
  const failures = [];

  onProgress({ completed, loaded, total: list.length, failures: [...failures] });

  await Promise.all(
    list.map(async (asset) => {
      const result = await loadImage(asset, signal);
      if (signal.aborted) return;
      completed += 1;
      if (result.error) failures.push(result);
      else loaded += 1;
      onProgress({ completed, loaded, total: list.length, failures: [...failures] });
    }),
  );

  return { failures, loaded, total: list.length };
}
