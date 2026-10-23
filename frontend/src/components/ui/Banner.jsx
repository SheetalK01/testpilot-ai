import { AlertCircle, X } from 'lucide-react';

/** Inline error banner for failed requests (role="alert" so it is announced). */
export default function Banner({ title, children, onDismiss, action, ...props }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm"
      {...props}
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="font-semibold text-fg">{title}</p>}
        <p className="text-fg/90">{children}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-m-1 rounded-md p-1 text-muted hover:text-fg"
          aria-label="Dismiss error"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
