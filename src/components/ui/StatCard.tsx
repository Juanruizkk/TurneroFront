import React, { type ReactNode } from 'react';
import { ArrowUpRightIcon, ArrowDownRightIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className = '',
}: StatCardProps) {
  return (
    <div className={`bg-surface rounded-card p-5 border border-border shadow-sm flex flex-col ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-surface-background rounded-lg text-primary">{icon}</div>
        {change && (
          <div
            className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
              changeType === 'up'
                ? 'text-success bg-success/10'
                : changeType === 'down'
                ? 'text-error bg-error/10'
                : 'text-text-secondary bg-surface-background'
            }`}
          >
            {changeType === 'up' && <ArrowUpRightIcon className="w-3 h-3 mr-1" />}
            {changeType === 'down' && <ArrowDownRightIcon className="w-3 h-3 mr-1" />}
            {change}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-heading font-bold text-text-primary mb-1">{value}</h3>
        <p className="text-sm text-text-secondary font-medium">{title}</p>
      </div>
    </div>
  );
}
