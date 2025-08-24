import React from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface LineChartProps {
  data: ChartData[];
  height?: number;
  color?: string;
}

export const LineChart: React.FC<LineChartProps> = ({ 
  data, 
  height = 200, 
  color = '#8A4FFF' 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = range === 0 ? 50 : ((maxValue - point.value) / range) * 80 + 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height="100%" className="overflow-visible">
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="0"
            y1={`${y}%`}
            x2="100%"
            y2={`${y}%`}
            stroke="#2B2C3F"
            strokeWidth="1"
          />
        ))}
        
        {/* Area */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill="url(#gradient)"
        />
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = range === 0 ? 50 : ((maxValue - point.value) / range) * 80 + 10;
          
          return (
            <g key={index}>
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r="4"
                fill={color}
                className="hover:r-6 transition-all duration-200 cursor-pointer"
              />
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r="8"
                fill="transparent"
                className="hover:fill-surface-2 hover:fill-opacity-50 transition-all duration-200 cursor-pointer"
              >
                <title>{`${point.label}: ${point.value.toLocaleString()}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
    </div>
  );
};