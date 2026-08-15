import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MotionButton } from './MotionButton';

type PaginationProps = {
  page: number;
  pageCount: number;
  totalItems: number;
  itemLabel: string;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageCount, totalItems, itemLabel, pageSize, onPageChange }: PaginationProps) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="pagination">
      <span className="pagination-info">
        Mostrando {from} a {to} de {totalItems} {itemLabel}
      </span>
      <div className="pagination-controls">
        <MotionButton
          variant="outline-neutral"
          className="pagination-arrow"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </MotionButton>
        <span className="pagination-current">{page}</span>
        <MotionButton
          variant="outline-neutral"
          className="pagination-arrow"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </MotionButton>
      </div>
    </div>
  );
}
