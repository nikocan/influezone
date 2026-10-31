import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import { Logo } from './Logo';

const Ctx = createContext<{ open: () => void }>({ open: () => {} });

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const value = useMemo(() => ({ open: () => setOpen(true) }), []);
  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal open={open} onOpenChange={setOpen} title={t('auth.promptTitle')} description={t('auth.promptBody')}>
        <div className="flex flex-col items-center gap-4 py-2">
          <Logo className="h-10" />
          <Button asChild block size="lg" onClick={() => setOpen(false)}><Link to="/auth/register">{t('auth.createAccount')}</Link></Button>
          <Button asChild block size="lg" variant="secondary" onClick={() => setOpen(false)}><Link to="/auth/sign-in">{t('auth.signIn')}</Link></Button>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

export const useAuthPrompt = () => useContext(Ctx);
