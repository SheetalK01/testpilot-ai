import Navbar from './Navbar';

export default function AppShell({ children }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-2 shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Navbar />
      <main
        id="main"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
      >
        {children}
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-subtle">
        TestPilot AI · Built by Sheetal Khadanga
      </footer>
    </div>
  );
}
