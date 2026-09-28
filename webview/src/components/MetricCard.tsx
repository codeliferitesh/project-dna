import React from 'react';

interface MetricCardProps {
  label: string;
  value: number | string | null;
  icon: React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
  statusVariant?: 'normal' | 'success' | 'warning' | 'info';
  badge?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  subtitle,
  onClick,
  statusVariant = 'normal',
  badge,
}) => {
  const displayValue = value !== null && value !== undefined ? String(value) : '—';
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`metric-card ${isClickable ? 'metric-card-clickable' : ''} ${statusVariant !== 'normal' ? `metric-card-${statusVariant}` : ''}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      title={isClickable ? `Click to inspect ${label}` : undefined}
    >
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {badge}
          <span className="metric-icon">{icon}</span>
        </div>
      </div>
      <div className="metric-value">{displayValue}</div>
      {subtitle && <div className="metric-footer">{subtitle}</div>}
    </div>
  );
};
