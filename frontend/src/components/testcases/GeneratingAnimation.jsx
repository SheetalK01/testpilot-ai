import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import Skeleton from '../ui/Skeleton';

const PHASES = [
  'Reading the user story…',
  'Mapping acceptance criteria…',
  'Finding negative paths and edge cases…',
  'Writing clear, executable steps…',
];

export default function GeneratingAnimation() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      data-testid="generating-indicator"
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-accent/30 bg-surface shadow-card"
    >
      <div className="relative flex items-center gap-3 border-b border-line bg-accent-soft px-5 py-4">
        <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white">
          <Sparkles className="size-5 motion-safe:animate-pulse" aria-hidden="true" />
          <span
            className="absolute inset-0 rounded-xl ring-2 ring-accent/40 motion-safe:animate-ping"
            aria-hidden="true"
          />
        </span>
        <div>
          <p className="font-semibold">AI is generating test cases</p>
          <p className="text-sm text-muted" aria-live="off">
            {PHASES[phase]}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-line" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <li
            key={index}
            className="flex animate-rise items-center gap-4 px-5 py-4"
            style={{ animationDelay: `${index * 260}ms` }}
          >
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}
