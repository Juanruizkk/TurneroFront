import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage   = Math.min(page, totalPages);

  const paginated = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    page:     safePage,
    setPage,
    totalPages,
    paginated,
    total:    items.length,
    pageSize,
  };
}
