import { PlayCircle } from 'lucide-react';
import { config } from '../services/config';

/** Shown on the public live demo only (VITE_DEMO_MODE=true). */
export default function DemoBanner() {
  if (!config.demoMode) return null;
  return (
    <div
      data-testid="demo-banner"
      className="relative z-50 bg-gradient-to-r from-indigo-700 to-violet-700 px-4 py-2 text-center text-sm text-white"
    >
      Live demo runs in mock AI mode.{' '}
      <a
        href={config.videoUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-indigo-100"
      >
        <PlayCircle className="size-4" aria-hidden="true" />
        See the video for real Claude output.
      </a>
    </div>
  );
}
