import React from 'react';

// Card Component
export function Card({ 
  title, 
  children, 
  className = '' 
}: {
  title?: string; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-surface-1 border border-border rounded-xl shadow-glow p-5 ${className}`}>
      {title && <h3 className="text-text-primary font-semibold mb-3">{title}</h3>}
      {children}
    </section>
  );
}

// Primary Button (Neon)
export const PrimaryButton = ({ 
  children, 
  onClick, 
  disabled = false,
  className = '',
  ...props 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`bg-brand text-bg px-4 py-2 rounded-xl shadow-glow hover:bg-brand-600 active:bg-brand-700 
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium ${className}`}
    {...props}
  >
    {children}
  </button>
);

// Secondary Button
export const SecondaryButton = ({ 
  children, 
  onClick, 
  disabled = false,
  className = '',
  ...props 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`border border-brand text-text-primary px-4 py-2 rounded-xl hover:bg-surface-2 
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium ${className}`}
    {...props}
  >
    {children}
  </button>
);

// Input Component
export const Input = ({ 
  className = '', 
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-primary
               focus:outline-none focus:shadow-ring placeholder:text-muted transition-all duration-200 ${className}`}
  />
);

// Textarea Component
export const Textarea = ({ 
  className = '', 
  ...props 
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-primary
               focus:outline-none focus:shadow-ring placeholder:text-muted resize-none transition-all duration-200 ${className}`}
  />
);

// Select Component
export const Select = ({ 
  children,
  className = '', 
  ...props 
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-primary
               focus:outline-none focus:shadow-ring transition-all duration-200 ${className}`}
  >
    {children}
  </select>
);

// Badge Component
export const Badge = ({ 
  children, 
  variant = 'default',
  className = '' 
}: {
  children: React.ReactNode;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  className?: string;
}) => {
  const variants = {
    default: 'bg-surface-3 text-text-primary',
    info: 'bg-info text-bg',
    success: 'bg-success text-bg',
    warning: 'bg-warning text-bg',
    danger: 'bg-danger text-white'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Menu Item Component
export const MenuItem = ({ 
  children, 
  active = false, 
  onClick,
  className = '' 
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) => (
  <li 
    className={`rounded-xl px-3 py-2 cursor-pointer transition-all duration-200 ${
      active 
        ? 'text-text-primary font-medium bg-gradient-to-r from-brand/16 to-brand-600/32' 
        : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
    } ${className}`}
    onClick={onClick}
  >
    {children}
  </li>
);

// Loading Spinner
export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-border border-t-brand ${sizes[size]}`} />
  );
};

// Chart Palette Hook
export const useChartPalette = () => {
  const getChartColors = () => {
    if (typeof window === 'undefined') return [];
    
    const style = getComputedStyle(document.documentElement);
    return [
      style.getPropertyValue('--chart-1').trim(),
      style.getPropertyValue('--chart-2').trim(),
      style.getPropertyValue('--chart-3').trim(),
      style.getPropertyValue('--chart-4').trim(),
      style.getPropertyValue('--chart-5').trim(),
      style.getPropertyValue('--chart-6').trim()
    ];
  };

  return { chartPalette: getChartColors() };
};