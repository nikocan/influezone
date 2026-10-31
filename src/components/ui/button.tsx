import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-hover',
        secondary: 'bg-surface text-fg border border-line hover:bg-line/60',
        outline: 'border border-line bg-transparent text-fg hover:bg-surface',
        ghost: 'bg-transparent text-fg hover:bg-surface',
        danger: 'bg-danger text-white hover:bg-danger/90',
        gold: 'bg-gold text-black hover:bg-gold/90',
        link: 'text-primary underline-offset-4 hover:underline px-0 h-auto',
        overlay: 'bg-black/40 text-white backdrop-blur-sm hover:bg-black/55',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-sm',
        md: 'h-11 px-4 text-sm rounded-sm',
        lg: 'h-12 px-6 text-base rounded-md',
        icon: 'h-11 w-11 rounded-full',
        'icon-sm': 'h-9 w-9 rounded-full',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, block, asChild, loading, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size, block }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? children : (
        <>
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
});
Button.displayName = 'Button';
