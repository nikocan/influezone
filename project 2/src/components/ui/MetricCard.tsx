import React from 'react';
import { Card, CardContent } from './Card';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-brand-500',
  onClick
}) => {
  const changeColors = {
    positive: 'text-success',
    negative: 'text-danger',
    neutral: 'text-text-secondary'
  };

  return (
    <Card hover onClick={onClick} className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-brand-gradient opacity-10 rounded-bl-3xl" />
      <CardContent className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
            <p className="text-2xl font-bold text-text-primary mb-1">{value}</p>
            {change && (
              <p className={`text-sm font-medium ${changeColors[changeType]}`}>
                {change}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-brand-500/10 ${iconColor}`}>
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};