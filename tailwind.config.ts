import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        bg: 'rgb(var(--sf-bg) / <alpha-value>)',
        surface: 'rgb(var(--sf-surface) / <alpha-value>)',
        elevated: 'rgb(var(--sf-elevated) / <alpha-value>)',
        fg: 'rgb(var(--sf-fg) / <alpha-value>)',
        muted: 'rgb(var(--sf-muted) / <alpha-value>)',
        line: 'rgb(var(--sf-border) / <alpha-value>)',
        primary: { DEFAULT: '#7047EB', fg: '#FFFFFF', soft: 'rgb(var(--sf-primary-soft) / <alpha-value>)', hover: '#5F38D6' },
        gold: '#D4AF37',
        success: '#16A36B',
        warning: '#E5A100',
        danger: '#E14D57',
      },
      borderRadius: { sm: '12px', md: '16px', lg: '24px' },
      transitionDuration: { DEFAULT: '200ms' },
      keyframes: {
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop': { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'sheet-in': 'sheet-in 220ms cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in 180ms ease-out',
        pop: 'pop 220ms ease-out',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
