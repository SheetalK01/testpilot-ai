import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../services/cn';

const TONES = {
  success: { icon: CheckCircle2, className: 'text-success' },
  error: { icon: XCircle, className: 'text-danger' },
  info: { icon: Info, className: 'text-accent-fg' },
};

export default function Toast({ tone = 'info', children, onDismiss }) {
  const { icon: Icon, className } = TONES[tone];
  return (
    <div
      data-testid="toast"
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full max-w-sm animate-toast items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-pop"
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', className)} aria-hidden="true" />
      <p className="flex-1 text-fg">{children}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="-m-1 rounded-md p-1 text-subtle transition hover:text-fg"
        aria-label="Dismiss notification"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
