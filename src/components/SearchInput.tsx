import { Search } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={['search-input', className].filter(Boolean).join(' ')}>
      <Search size={16} strokeWidth={1.75} />
      <input type="text" {...props} />
    </div>
  );
}
