import { useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX, Subtitles } from 'lucide-react';
import type { Media } from '@/data/types';
import { useAutoplayAllowed, usePreferences } from '@/providers/PreferencesProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

let globalMuted = true;
const muteListeners = new Set<(m: boolean) => void>();
function setGlobalMuted(m: boolean) {
  globalMuted = m;
  muteListeners.forEach((l) => l(m));
}

/**
 * Vertical-first video: autoplays muted only when ≥60% visible and preferences allow,
 * pauses off-screen, exposes mute/captions/progress, honours reduced motion.
 */
export function VideoPlayer({ media, className, onDoubleTap, fit = 'cover', onView }: { media: Media; className?: string; onDoubleTap?: () => void; fit?: 'cover' | 'contain'; onView?: () => void }) {
  const { t } = useI18n();
  const { prefs } = usePreferences();
  const autoplay = useAutoplayAllowed();
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(globalMuted);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [captions, setCaptions] = useState(prefs.captions);
  const [failed, setFailed] = useState(false);
  const viewed = useRef(false);
  const lastTap = useRef(0);

  useEffect(() => {
    const l = (m: boolean) => setMuted(m);
    muteListeners.add(l);
    return () => { muteListeners.delete(l); };
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e!.intersectionRatio >= 0.6) {
        if (!viewed.current) { viewed.current = true; onView?.(); }
        if (autoplay) v.play().catch(() => setPlaying(false));
      } else {
        v.pause();
      }
    }, { threshold: [0, 0.6, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, [autoplay, onView]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    for (const tr of Array.from(v.textTracks)) tr.mode = captions ? 'showing' : 'hidden';
  }, [captions]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => setFailed(true));
    else v.pause();
  };

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) { onDoubleTap?.(); lastTap.current = 0; return; }
    lastTap.current = now;
    setTimeout(() => { if (lastTap.current === now) toggle(); }, 290);
  };

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-black', className)}>
      <video
        ref={ref}
        className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain')}
        src={failed ? undefined : media.url}
        poster={media.posterUrl ?? undefined}
        muted={muted}
        playsInline
        loop
        preload="metadata"
        aria-label={media.alt}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
      >
        {media.captionsUrl && <track kind="captions" src={media.captionsUrl} default={captions} srcLang="tr" label="Altyazı" />}
      </video>
      <button type="button" className="absolute inset-0" onClick={onTap} aria-label={playing ? t('video.pause') : t('video.play')} />
      {!playing && !failed && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur" aria-hidden>
          <Play className="ms-1 h-7 w-7 fill-white" />
        </span>
      )}
      {failed && (
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md bg-black/60 p-3 text-center text-sm text-white">{t('video.unavailable')}</div>
      )}
      <div className="absolute end-3 top-3 flex gap-2">
        {media.captionsUrl && (
          <button type="button" onClick={() => setCaptions((c) => !c)} aria-pressed={captions} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur" aria-label={t('video.captions')}>
            <Subtitles className="h-5 w-5" />
          </button>
        )}
        <button type="button" onClick={() => setGlobalMuted(!muted)} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur" aria-label={muted ? t('video.unmute') : t('video.mute')} aria-pressed={!muted}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/25" role="progressbar" aria-label={t('video.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
