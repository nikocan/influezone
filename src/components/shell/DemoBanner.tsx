import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, X } from 'lucide-react';
import { dataMode } from '@/lib/env';
import { useI18n } from '@/i18n/I18nProvider';

/** Persistent, explicit label that the app is showing local sample data. */
export function DemoBanner({ compact }: { compact?: boolean } = {}) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('sf.demoBanner') === '0');
  if (dataMode !== 'demo') return null;
  if (hidden || compact) {
    return (
      <Link to="/settings/about" className={`fixed ${compact ? 'top-4 end-16' : 'bottom-[76px] end-3 md:bottom-4'} z-40 inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-[11px] font-bold text-black shadow`} aria-label={t('demo.bannerTitle')}>
        <FlaskConical className="h-3.5 w-3.5" aria-hidden /> {t('demo.short')}
      </Link>
    );
  }
  return (
    <div role="note" className="relative z-40 flex items-center gap-2 bg-warning px-3 py-1.5 text-[12px] font-medium text-black">
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 truncate"><strong>{t('demo.bannerTitle')}</strong> · {t('demo.bannerBody')} <Link to="/settings/about" className="underline">{t('common.learnMore')}</Link></p>
      <button onClick={() => { sessionStorage.setItem('sf.demoBanner', '0'); setHidden(true); }} className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/10" aria-label={t('common.close')}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
