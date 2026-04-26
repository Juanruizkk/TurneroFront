import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface Props {
  page:         number;
  totalPages:   number;
  total:        number;
  pageSize:     number;
  onPageChange: (p: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Build page number list with ellipsis
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnBase =
    'h-8 min-w-[2rem] px-2 flex items-center justify-center rounded-button text-sm font-medium transition-colors';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-3">
      <p className="text-sm text-text-muted">
        Mostrando <span className="font-medium text-text-primary">{from}–{to}</span> de{' '}
        <span className="font-medium text-text-primary">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={`${btnBase} border border-border text-text-secondary hover:bg-surface-background disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Página anterior"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="h-8 px-1 flex items-center text-text-muted text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${
                p === page
                  ? 'bg-primary text-white border border-primary'
                  : 'border border-border text-text-secondary hover:bg-surface-background'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} border border-border text-text-secondary hover:bg-surface-background disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Página siguiente"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
