type Props = { page: number; pages: number; onPage: (page: number) => void };

export function Pager({ page, pages, onPage }: Props) {
  if (pages <= 1) return null;
  return (
    <nav class="pager" aria-label="Pages">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next →
      </button>
    </nav>
  );
}
