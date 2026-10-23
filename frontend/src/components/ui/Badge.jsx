import { ChevronDown, ChevronsUp, ChevronUp } from 'lucide-react';
import { cn } from '../../services/cn';

const TYPE_STYLES = {
  POSITIVE:
    'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  NEGATIVE:
    'bg-red-50 text-red-800 ring-red-600/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/25',
  EDGE: 'bg-amber-50 text-amber-900 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25',
};

const PRIORITY_STYLES = {
  HIGH: 'text-violet-800 bg-violet-50 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/30',
  MEDIUM:
    'text-sky-800 bg-sky-50 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/30',
  LOW: 'text-slate-700 bg-slate-100 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/25',
};

const PRIORITY_ICONS = { HIGH: ChevronsUp, MEDIUM: ChevronUp, LOW: ChevronDown };

const BASE =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ring-1 ring-inset';

export function TypeBadge({ type, className, ...props }) {
  return (
    <span className={cn(BASE, TYPE_STYLES[type], className)} {...props}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {type}
    </span>
  );
}

export function PriorityBadge({ priority, className, ...props }) {
  const Icon = PRIORITY_ICONS[priority];
  return (
    <span className={cn(BASE, 'rounded-md', PRIORITY_STYLES[priority], className)} {...props}>
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {priority}
    </span>
  );
}

const STATUS_STYLES = {
  SUCCESS: TYPE_STYLES.POSITIVE,
  FAILED: TYPE_STYLES.NEGATIVE,
  RUNNING: PRIORITY_STYLES.MEDIUM,
};

export function StatusPill({ status }) {
  return (
    <span className={cn(BASE, STATUS_STYLES[status])}>
      <span
        className={cn(
          'size-1.5 rounded-full bg-current',
          status === 'RUNNING' && 'animate-pulse motion-reduce:animate-none',
        )}
        aria-hidden="true"
      />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function SourceTag({ source }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase',
        source === 'AI' ? 'bg-accent-soft text-accent-fg' : 'bg-surface-2 text-muted',
      )}
    >
      {source === 'AI' ? 'AI' : 'Manual'}
    </span>
  );
}
