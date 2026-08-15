import type { ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  span?: 'full';
  children: ReactNode;
};

export function FormField({ label, htmlFor, required, span, children }: FormFieldProps) {
  return (
    <div className={['form-field', span === 'full' ? 'span-full' : ''].filter(Boolean).join(' ')}>
      <label htmlFor={htmlFor} className={required ? 'required' : undefined}>
        {label}
      </label>
      {children}
    </div>
  );
}
