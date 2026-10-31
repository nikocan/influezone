import * as M from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Menu({ trigger, children, align = 'end' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content align={align} sideOffset={6} className="z-50 min-w-[200px] rounded-md border border-line bg-elevated p-1.5 shadow-xl animate-fade-in">
          {children}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}

export function MenuItem({ children, onSelect, danger, icon }: { children: ReactNode; onSelect: () => void; danger?: boolean; icon?: ReactNode }) {
  return (
    <M.Item onSelect={onSelect} className={cn('flex min-h-[44px] cursor-pointer select-none items-center gap-3 rounded-sm px-3 text-sm outline-none data-[highlighted]:bg-surface', danger && 'text-danger')}>
      {icon}
      {children}
    </M.Item>
  );
}
