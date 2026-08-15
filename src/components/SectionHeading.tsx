import type { LucideIcon } from 'lucide-react';

type SectionHeadingProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
};

export function SectionHeading({ icon: Icon, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <span className="section-heading-icon">
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div>
        <h3>{title}</h3>
        {subtitle && <p className="section-heading-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
