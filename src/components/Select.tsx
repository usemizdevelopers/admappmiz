import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { icon?: LucideIcon };

export function Select({ className, children, icon: Icon, ...props }: SelectProps) {
  return (
    <div className={['select-wrap', Icon ? 'select-wrap-with-icon' : '', className].filter(Boolean).join(' ')}>
      {Icon && <Icon size={15} strokeWidth={1.75} className="select-leading-icon" />}
      <select {...props}>{children}</select>
      <ChevronDown size={15} strokeWidth={1.75} className="select-chevron" />
    </div>
  );
}
