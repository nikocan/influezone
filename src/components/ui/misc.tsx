import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, tone = 'neutral', children, ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'primary' | 'gold' | 'success' | 'warning' | 'danger' | 'outline' }) {
  const tones = {
    neutral: 'bg-surface text-muted border border-line',
    primary: 'bg-primary-soft text-primary',
    gold: 'bg-gold/15 text-[#8a6d12] dark:text-gold',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/15 text-[#8a6100] dark:text-warning',
    danger: 'bg-danger/12 text-danger',
    outline: 'border border-line text-muted',
  } as const;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4', tones[tone], className)} {...p}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('relative overflow-hidden rounded-sm bg-surface', className)} aria-hidden><div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" /></div>;
}

export function Switch({ checked, onCheckedChange, label, description, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('flex min-h-[44px] cursor-pointer items-center justify-between gap-4 py-2', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors data-[state=checked]:bg-primary"
      >
        <SwitchPrimitive.Thumb className="block h-6 w-6 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px] rtl:data-[state=checked]:-translate-x-[22px]" />
      </SwitchPrimitive.Root>
    </label>
  );
}

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-line bg-bg', className)} {...p} />;
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/** Segmented control (accessible radiogroup). */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-full bg-surface p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('rounded-full font-semibold transition-colors', size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm', value === o.value ? 'bg-bg text-fg shadow-sm' : 'text-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors', active ? 'border-fg bg-fg text-bg' : 'border-line bg-bg text-fg hover:bg-surface', className)}>
      {children}
    </button>
  );
}
