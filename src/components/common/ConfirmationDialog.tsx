import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';

export function ConfirmationDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, danger, loading, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; confirmLabel: ReactNode; onConfirm: () => void; danger?: boolean; loading?: boolean; children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description} variant="dialog">
      {children}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
