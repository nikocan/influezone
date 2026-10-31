import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn, uid } from '@/lib/utils';

type Variant = 'success' | 'error' | 'info';
interface ToastItem { id: string; title: string; description?: string; variant: Variant; action?: { label: string; onClick: () => void } }
type ToastFn = (t: Omit<ToastItem, 'id' | 'variant'> & { variant?: Variant }) => void;

const Ctx = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = (id: string) => setItems((s) => s.filter((x) => x.id !== id));
  const toast = useCallback<ToastFn>((t) => {
    const id = uid('t');
    setItems((s) => [...s.slice(-2), { ...t, id, variant: t.variant ?? 'info' }]);
    setTimeout(() => dismiss(id), 4500);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" role="region" aria-live="polite" aria-label="Notifications">
        {items.map((t) => {
          const I = Icon[t.variant];
          return (
            <div key={t.id} role={t.variant === 'error' ? 'alert' : 'status'} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md bg-fg px-4 py-3 text-bg shadow-xl animate-fade-in">
              <I className={cn('mt-0.5 h-5 w-5 shrink-0', t.variant === 'success' && 'text-success', t.variant === 'error' && 'text-danger')} aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{t.title}</p>
                {t.description && <p className="opacity-80">{t.description}</p>}
              </div>
              {t.action && <button className="text-sm font-semibold text-primary-soft underline" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>}
              <button onClick={() => dismiss(t.id)} aria-label="×" className="opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
