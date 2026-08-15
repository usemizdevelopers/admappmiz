import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type ChipProps = {
  swatch?: string;
  children: ReactNode;
  onRemove: () => void;
};

export function Chip({ swatch, children, onRemove }: ChipProps) {
  return (
    <motion.li
      className="chip"
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15 }}
    >
      {swatch && <span className="chip-swatch" style={{ background: swatch }} />}
      <span>{children}</span>
      <button type="button" onClick={onRemove} aria-label="Remover">
        <X size={13} strokeWidth={2} />
      </button>
    </motion.li>
  );
}
