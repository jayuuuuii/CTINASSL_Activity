import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, totalItems, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, totalItems);
  return (
    <nav className="pagination" aria-label="Pages">
      <span>
        {from}–{to} of {totalItems}
      </span>
      <div>
        <button className="icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <span className="pagination__page">
          Page {page} of {totalPages}
        </span>
        <button className="icon-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </div>
    </nav>
  );
}
