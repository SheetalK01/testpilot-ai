import { cn } from '../../services/cn';

function Illustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden="true">
      <defs>
        <linearGradient id="es-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="108" rx="54" ry="6" fill="var(--line)" />
      <rect
        x="34"
        y="22"
        width="76"
        height="80"
        rx="10"
        fill="var(--surface)"
        stroke="var(--line)"
        strokeWidth="2"
      />
      <rect x="46" y="38" width="40" height="6" rx="3" fill="var(--line)" />
      <rect x="46" y="52" width="52" height="6" rx="3" fill="var(--line)" />
      <rect x="46" y="66" width="30" height="6" rx="3" fill="var(--line)" />
      <g className="motion-safe:animate-float">
        <rect x="88" y="12" width="44" height="44" rx="12" fill="url(#es-g)" />
        <path d="M99 34.5 120 25l-6 21-5.5-8z" fill="#fff" />
      </g>
    </svg>
  );
}

export default function EmptyState({ title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center',
        className,
      )}
    >
      <Illustration />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
