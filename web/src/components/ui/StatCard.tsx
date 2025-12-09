import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'error';
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  loading = false,
}) => {
  const variantStyles = {
    default: 'from-indigo-600 to-purple-600',
    success: 'from-green-600 to-teal-600',
    warning: 'from-yellow-600 to-orange-600',
    error: 'from-red-600 to-pink-600',
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-slate-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-slate-700 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm font-medium">{title}</span>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${variantStyles[variant]}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="mb-2">
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          {trend.value > 0 ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : trend.value < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-400" />
          ) : null}
          <span className={`text-sm font-medium ${trend.value > 0 ? 'text-green-400' : trend.value < 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {trend.value !== 0 ? `${Math.abs(trend.value)}%` : ''}
          </span>
          <span className="text-sm text-slate-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
};
