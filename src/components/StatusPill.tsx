import { motion, type HTMLMotionProps } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type PillVariant = 'success' | 'positive' | 'neutral' | 'danger';

type StatusPillProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant: PillVariant;
  icon?: LucideIcon;
  dot?: boolean;
  children: ReactNode;
};

export function StatusPill({ variant, icon: Icon, dot, children, className, ...props }: StatusPillProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={['pill', `pill-${variant}`, className].filter(Boolean).join(' ')}
      {...props}
    >
      {dot && <span className="pill-dot" />}
      {Icon && <Icon size={13} strokeWidth={2} />}
      {children}
    </motion.button>
  );
}
