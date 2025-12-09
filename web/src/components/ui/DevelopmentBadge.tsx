import React from 'react';
import { Wrench } from 'lucide-react';

interface DevelopmentBadgeProps {
  className?: string;
}

export const DevelopmentBadge: React.FC<DevelopmentBadgeProps> = ({ className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
      <Wrench className="w-3 h-3" />
      Em desenvolvimento
    </span>
  );
};
