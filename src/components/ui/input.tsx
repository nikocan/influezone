import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-sm border border-line bg-bg px-3 text-sm text-fg placeholder:text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60 aria-[invalid=true]:border-danger';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(base, 'h-11', className)} {...p} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-[96px] py-2.5 leading-relaxed', className)} {...p} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }>(({ className, children, ...p }, ref) => (
  <select ref={ref} className={cn(base, 'h-11 appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9', className)}
    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
    {...(p as object)}>
    {children}
  </select>
));
Select.displayName = 'Select';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  className?: string;
}

/** Accessible label + hint + error wrapper. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const descId = `${id}-desc`;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-fg">{label}</label>
      {children({ id, 'aria-describedby': hint || error ? descId : undefined, 'aria-invalid': error ? true : undefined })}
      {(error || hint) && (
        <p id={descId} className={cn('text-xs', error ? 'text-danger' : 'text-muted')} role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
