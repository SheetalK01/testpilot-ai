import {
  ArrowRight,
  BarChart3,
  FileCode2,
  FileSpreadsheet,
  NotebookPen,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/layout/Logo';
import TryDemoButton from '../components/TryDemoButton';
import Navbar from '../components/layout/Navbar';
import { PriorityBadge, TypeBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const GITHUB_URL = 'https://github.com/SheetalK01';
const LINKEDIN_URL = 'https://www.linkedin.com/in/sheetal-khadanga';

const DEMO_CASES = [
  { title: 'Log in with valid credentials', type: 'POSITIVE', priority: 'HIGH' },
  { title: 'Wrong password shows an error', type: 'NEGATIVE', priority: 'HIGH' },
  { title: 'Empty email is rejected', type: 'NEGATIVE', priority: 'MEDIUM' },
  { title: 'Account locks after 5 failed attempts', type: 'EDGE', priority: 'MEDIUM' },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI test generation',
    text: 'Claude reads your story and acceptance criteria and writes positive, negative and edge cases with clear steps.',
  },
  {
    icon: FileCode2,
    title: 'Playwright export',
    text: 'Turn the cases into a ready-to-run Playwright spec with accessible role and label locators.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Excel export',
    text: 'Download a formatted workbook with numbered steps, colour-coded types and a frozen header.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard',
    text: 'See coverage by type and priority at a glance, plus a log of every AI run and how long it took.',
  },
];

const STEPS = [
  {
    icon: NotebookPen,
    title: 'Write the story',
    text: 'Describe the feature in plain English and list its acceptance criteria.',
  },
  {
    icon: Wand2,
    title: 'Generate with AI',
    text: 'One click and Claude returns structured, schema-validated test cases in seconds.',
  },
  {
    icon: PlayCircle,
    title: 'Refine and automate',
    text: 'Edit, filter and add your own cases, then export to Excel or Playwright.',
  },
];

const STACK = [
  'React',
  'Tailwind CSS',
  'Spring Boot',
  'MySQL',
  'FastAPI',
  'Claude API',
  'Playwright',
  'Docker',
  'GitHub Actions',
];

function GitHubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

/** A story card that "turns into" test case cards. Purely decorative, so hidden from screen readers. */
function Demo() {
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-accent/20 to-accent-2/20 blur-2xl" />
      <div className="relative rounded-3xl border border-line bg-surface/90 p-5 shadow-pop backdrop-blur sm:p-6">
        <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-subtle uppercase">
            <NotebookPen className="size-3.5" /> User story
          </div>
          <p className="mt-2 font-semibold">Login</p>
          <p className="mt-1 text-sm text-muted">
            As a registered user, I want to log in with my email and password so that I can see my
            dashboard.
          </p>
        </div>
        <div className="my-4 flex items-center justify-center gap-2 text-sm font-medium text-accent-fg">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent/40" />
          <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1">
            <Sparkles className="size-4 motion-safe:animate-pulse" /> Claude is writing tests
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/40" />
        </div>
        <ul className="space-y-2.5">
          {DEMO_CASES.map((testCase, index) => (
            <li
              key={testCase.title}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card motion-safe:animate-demo"
              style={{ animationDelay: `${index * 0.45}s` }}
            >
              <span className="truncate text-sm font-medium">{testCase.title}</span>
              <span className="flex shrink-0 gap-1.5">
                <TypeBadge type={testCase.type} />
                <span className="hidden sm:inline-flex">
                  <PriorityBadge priority={testCase.priority} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function LandingPage() {
  useDocumentTitle(null);
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <Navbar />
      <main id="main">
        <section className="relative">
          <div className="bg-glow absolute inset-0" aria-hidden="true" />
          <div className="bg-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24 lg:pb-28">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-sm font-medium text-muted shadow-card backdrop-blur">
                <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-white">
                  <Sparkles className="size-3" aria-hidden="true" />
                </span>
                Powered by Claude Opus 5.5
              </p>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-display">
                Turn user stories into test cases <span className="text-gradient">in seconds.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                TestPilot AI reads your user story and acceptance criteria and writes structured
                positive, negative and edge test cases, then turns them into a ready-to-run
                Playwright script.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button as={Link} to="/register" size="lg" data-testid="landing-cta">
                  Get started free <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <TryDemoButton />
                <Button as="a" href="#how-it-works" size="lg" variant="ghost">
                  See how it works
                </Button>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-subtle">
                <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                Try it without signing up · Free · Open source
              </p>
            </div>
            <Demo />
          </div>
        </section>

        <section
          aria-labelledby="features-heading"
          className="border-y border-line bg-surface/50 py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-accent-fg">Everything a QA engineer needs</p>
              <h2 id="features-heading" className="mt-2 text-3xl font-semibold sm:text-4xl">
                From a story to a test suite without the busywork
              </h2>
            </div>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="group rounded-2xl border border-line bg-surface p-6 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-pop"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-card">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-accent-fg">How it works</p>
              <h2 id="how-heading" className="mt-2 text-3xl font-semibold sm:text-4xl">
                Three steps to better coverage
              </h2>
            </div>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <li
                  key={title}
                  className="relative rounded-2xl border border-line bg-surface p-6 shadow-card"
                >
                  <span
                    className="absolute top-6 right-6 text-5xl font-semibold text-line"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-fg">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-semibold">
                    <span className="sr-only">Step {index + 1}: </span>
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="stack-heading" className="border-t border-line py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2
              id="stack-heading"
              className="text-center text-sm font-semibold tracking-wider text-subtle uppercase"
            >
              Built with
            </h2>
            <ul className="mt-6 flex flex-wrap justify-center gap-3">
              {STACK.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-muted shadow-card"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-6 py-14 text-center text-white shadow-pop sm:px-12">
            <div className="bg-grid absolute inset-0 opacity-20" aria-hidden="true" />
            <h2 className="relative text-3xl font-semibold sm:text-4xl">
              Spend your time testing, not typing.
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-indigo-100">
              Create a free account and generate your first test suite in under a minute.
            </p>
            <Link
              to="/register"
              className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-indigo-700 shadow-card transition hover:bg-indigo-50"
            >
              Get started free <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <Logo />
            <p className="text-sm text-subtle">Built by Sheetal Khadanga, QA Engineer.</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="grid size-10 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              aria-label="GitHub profile (opens in a new tab)"
            >
              <GitHubIcon className="size-5" />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="grid size-10 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
              aria-label="LinkedIn profile (opens in a new tab)"
            >
              <LinkedInIcon className="size-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
