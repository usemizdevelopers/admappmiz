import type { InputHTMLAttributes } from 'react';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  accentColor?: string;
};

export function Checkbox({ label, id, className, accentColor, ...props }: CheckboxProps) {
  return (
    <label className={['checkbox-field', className].filter(Boolean).join(' ')} htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        className="checkbox-native"
        style={accentColor ? { accentColor } : undefined}
        {...props}
      />
      {label}
    </label>
  );
}
