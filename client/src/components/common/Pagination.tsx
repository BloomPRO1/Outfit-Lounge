import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  limit?: number;
}

export default function Pagination({ page, totalPages, onPageChange, total, limit }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = total && limit ? ((page - 1) * limit + 1) : null;
  const end = total && limit ? Math.min(page * limit, total) : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-charcoal-500">
      {total && start && end ? (
        <p className="text-sm text-charcoal-200">
          Showing <span className="text-charcoal-100 font-medium">{start}–{end}</span> of <span className="text-charcoal-100 font-medium">{total}</span>
        </p>
      ) : <div />}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          icon={<ChevronLeft size={16} />}
        />

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = i + 1;
          if (totalPages > 5) {
            if (page > 3) p = page - 2 + i;
            if (p > totalPages) p = totalPages - 4 + i;
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'w-8 h-8 text-sm rounded-lg transition-colors',
                p === page
                  ? 'bg-gold-700/20 text-gold-400 font-medium'
                  : 'text-charcoal-200 hover:bg-charcoal-500 hover:text-charcoal-50'
              )}
            >
              {p}
            </button>
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          icon={<ChevronRight size={16} />}
        />
      </div>
    </div>
  );
}
