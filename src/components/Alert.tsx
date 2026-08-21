import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

type AlertVariant = 'danger' | 'success';

const ICON = {
  danger: AlertCircle,
  success: CheckCircle2,
};

export function Alert({ variant, children }: { variant: AlertVariant; children: ReactNode }) {
  const Icon = ICON[variant];
  return (
    <div className={`alert alert-${variant}`}>
      <Icon size={16} strokeWidth={1.75} />
      <span>{children}</span>
    </div>
  );
}
