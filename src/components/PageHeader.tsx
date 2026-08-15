import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function PageHeader({ icon: Icon, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="section-header">
      <div className="section-header-icon">
        <Icon size={26} strokeWidth={1.5} />
      </div>
      <div className="section-header-text">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="section-header-action">{action}</div>}
    </div>
  );
}
