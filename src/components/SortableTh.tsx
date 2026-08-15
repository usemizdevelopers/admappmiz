import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';

type SortableThProps<T extends string> = {
  field: T;
  label: string;
  sortField: T | null;
  sortDir: 'asc' | 'desc';
  onSort: (field: T) => void;
};

export function SortableTh<T extends string>({ field, label, sortField, sortDir, onSort }: SortableThProps<T>) {
  const active = sortField === field;
  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th className="sortable-th" onClick={() => onSort(field)}>
      <span>
        {label}
        <Icon size={13} strokeWidth={2} />
      </span>
    </th>
  );
}
