import { CheckCircle2, Sparkles } from 'lucide-react';
import Logo from '../layout/Logo';
import ThemeToggle from '../layout/ThemeToggle';

const BENEFITS = [
  'Positive, negative and edge cases from one user story',
  'Playwright scripts with accessible locators',
  'Excel export your whole QA team can use',
];

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="bg-grid absolute inset-0 opacity-20" aria-hidden="true" />
      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/20">
          <Sparkles className="size-4" aria-hidden="true" /> Powered by Claude
        </p>
        <h2 className="mt-6 max-w-md text-4xl leading-tight font-semibold">
          Turn user stories into test cases in seconds.
        </h2>
        <ul className="mt-8 space-y-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3 text-indigo-50">
              <CheckCircle2 className="size-5 text-emerald-300" aria-hidden="true" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative motion-safe:animate-float" aria-hidden="true">
        <div className="max-w-sm rounded-2xl bg-white p-4 text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Login fails with wrong password</span>
          </div>
          {/* Fixed light styling: this card stays white in dark mode too. */}
          <div className="mt-3 flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-red-800 ring-1 ring-red-600/20">
              NEGATIVE
            </span>
            <span className="rounded-md bg-violet-50 px-2.5 py-0.5 text-violet-800 ring-1 ring-violet-600/20">
              HIGH
            </span>
          </div>
          <ol className="mt-3 space-y-1 text-xs text-slate-600">
            <li>1. Open the login page</li>
            <li>2. Enter a valid email and a wrong password</li>
            <li>3. Click &quot;Log in&quot;</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <header className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </header>
        <main
          id="main"
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12"
        >
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-muted">{footer}</p>
        </main>
      </div>
      <BrandPanel />
    </div>
  );
}
