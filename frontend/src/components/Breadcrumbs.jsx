import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.label} className="flex min-w-0 items-center gap-1.5">
              {item.to && !last ? (
                <Link to={item.to} className="truncate rounded hover:text-fg">
                  {item.label}
                </Link>
              ) : (
                <span
                  className="truncate font-medium text-fg"
                  aria-current={last ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!last && (
                <ChevronRight className="size-3.5 shrink-0 text-subtle" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
