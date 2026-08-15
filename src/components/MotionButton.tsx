import { motion, type HTMLMotionProps } from 'framer-motion';

type Variant = 'primary' | 'danger' | 'outline-neutral' | 'gold' | 'tan' | 'default';

type MotionButtonProps = HTMLMotionProps<'button'> & {
  variant?: Variant;
};

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  danger: 'btn-danger',
  'outline-neutral': 'btn-outline-neutral',
  gold: 'btn-gold',
  tan: 'btn-tan',
  default: '',
};

export function MotionButton({ variant = 'default', className, children, ...props }: MotionButtonProps) {
  const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(' ');

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={classes || undefined}
      {...props}
    >
      {children}
    </motion.button>
  );
}
