import { cn } from '../../services/cn';

export default function Skeleton({ className }) {
  return <div className={cn('shimmer rounded-lg', className)} aria-hidden="true" />;
}

/** A labelled loading region: screen readers hear "Loading…", sighted users see placeholders. */
export function LoadingBlock({ label = 'Loading…', children, className }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
