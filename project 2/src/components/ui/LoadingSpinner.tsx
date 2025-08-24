import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-border border-t-brand-500 ${sizes[size]} ${className}`} />
  );
};

export const PageLoading: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-bg">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-text-secondary">Yükleniyor...</p>
    </div>
  </div>
);