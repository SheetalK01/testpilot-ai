import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/layout/Logo';
import Button from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="bg-glow absolute inset-0" aria-hidden="true" />
      <header className="relative px-6 py-5">
        <Logo />
      </header>
      <main
        id="main"
        className="relative flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center"
      >
        <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-pop">
          <Compass className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-8 text-sm font-semibold text-accent-fg">404</p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">This page took a wrong turn</h1>
        <p className="mt-4 max-w-md text-muted">
          The page you are looking for does not exist or has been moved. Even our autopilot could
          not find it.
        </p>
        <Button as={Link} to="/" size="lg" icon={ArrowLeft} className="mt-8">
          Back to home
        </Button>
      </main>
    </div>
  );
}
