import { useEffect, useRef } from 'react';

export function BackgroundVideo({ onReady }: { onReady: (ready: boolean) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current!;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      if (document.hidden || reducedMotion.matches) video.pause();
      else void video.play().catch(() => {});
    };
    const loaded = () => { onReady(true); sync(); };
    video.addEventListener('loadeddata', loaded);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pointerdown', sync);
    reducedMotion.addEventListener('change', sync);
    if (video.readyState >= 2) loaded();
    return () => {
      video.removeEventListener('loadeddata', loaded);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pointerdown', sync);
      reducedMotion.removeEventListener('change', sync);
      video.pause();
    };
  }, [onReady]);
  return <div className="video-backdrop" aria-hidden="true">
    <video
      ref={ref}
      className="background-video"
      src="/assets/media/dge-background-portrait.mp4"
      poster="/assets/figma/6101-6352-imgImage3.png"
      autoPlay muted loop playsInline preload="auto"
      disablePictureInPicture
      onError={() => onReady(false)}
    />
    <div className="background-veil" />
  </div>;
}
