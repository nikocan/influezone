/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  safelist: [
    'text-bright'
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: { 
          1: 'var(--surface-1)', 
          2: 'var(--surface-2)', 
          3: 'var(--surface-3)' 
        },
        panel: 'var(--bg-panel)',
        card: 'var(--bg-card)',
        hover: 'var(--bg-hover)',
        border: 'var(--border)',
        divider: 'var(--divider)',
        brand: { 
          DEFAULT: 'var(--brand-500)', 
          500: 'var(--brand-500)',
          600: 'var(--brand-600)', 
          700: 'var(--brand-700)', 
          subtle: 'var(--brand-subtle)' 
        },
        accent: {
          coral: 'var(--accent-coral)',
          'coral-hover': 'var(--accent-coral-hover)',
          'coral-subtle': 'var(--accent-coral-subtle)',
          amber: 'var(--accent-amber)',
          'amber-hover': 'var(--accent-amber-hover)',
          'amber-subtle': 'var(--accent-amber-subtle)'
        },
        info: 'var(--info)', 
        success: 'var(--success)', 
        warning: 'var(--warning)', 
        danger: 'var(--danger)',
        'danger-hover': 'var(--danger-hover)',
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
          6: 'var(--chart-6)'
        }
      },
      
      borderRadius: {
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)'
      },
      
      boxShadow: {
        glow: 'var(--shadow-glow)',
        'glow-lg': 'var(--shadow-glow-lg)',
        ring: 'var(--shadow-ring)'
      },
      
      animation: {
        'pulse': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite'
      },
      
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(138, 79, 255, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(138, 79, 255, 0.6)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      
      backgroundImage: {
        'hero-gradient': 'var(--hero-gradient)',
        'hero-bg-gradient': 'var(--hero-bg-gradient)',
        'brand-gradient': 'var(--brand-gradient)',
        'title-gradient': 'var(--title-gradient)',
        'accent-gradient': 'var(--accent-gradient)'
      }
    },
  },
  plugins: [],
};