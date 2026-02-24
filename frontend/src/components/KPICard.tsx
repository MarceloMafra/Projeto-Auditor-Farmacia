import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon?: React.ReactNode;
  variant?: 'default' | 'warning' | 'critical';
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  unit,
  description,
  trend,
  trendValue,
  icon,
  variant = 'default',
  onClick,
}: KPICardProps) {
  const bgColor = {
    default: 'bg-slate-800 border-slate-700 hover:border-slate-600',
    warning: 'bg-slate-800 border-amber-500/30 hover:border-amber-500/50',
    critical: 'bg-slate-800 border-red-500/30 hover:border-red-500/50',
  }[variant];

  const textColor = {
    default: 'text-slate-50',
    warning: 'text-amber-400',
    critical: 'text-red-400',
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`${bgColor} border rounded-lg p-6 transition-all cursor-pointer ${
        onClick ? 'hover:shadow-lg hover:shadow-slate-900/50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          {description && <p className="text-slate-500 text-xs mt-1">{description}</p>}
        </div>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
          {unit && <p className="text-slate-400 text-sm mt-1">{unit}</p>}
        </div>

        {trend && trendValue !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
              trend === 'up'
                ? 'text-green-400 bg-green-500/10'
                : trend === 'down'
                  ? 'text-red-400 bg-red-500/10'
                  : 'text-slate-400 bg-slate-500/10'
            }`}
          >
            {trend === 'up' && <TrendingUp size={16} />}
            {trend === 'down' && <TrendingDown size={16} />}
            {trend === 'stable' && <span className="text-xs">→</span>}
            <span>{Math.abs(trendValue)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
