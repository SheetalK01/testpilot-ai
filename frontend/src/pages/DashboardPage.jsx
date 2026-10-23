import { Bot, FileText, FolderKanban, ListChecks, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import PriorityBar from '../components/charts/PriorityBar';
import TypeDonut from '../components/charts/TypeDonut';
import ProjectForm from '../components/forms/ProjectForm';
import { StatusPill } from '../components/ui/Badge';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton, { LoadingBlock } from '../components/ui/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import { formatDuration, greeting, plural, timeAgo } from '../services/format';

function StatCard({ icon: Icon, label, value, testId, tint }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`grid size-12 place-items-center rounded-xl ${tint}`}>
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums" data-testid={testId}>
          {value}
        </p>
      </div>
    </Card>
  );
}

function RecentRuns({ runs }) {
  return (
    <Card className="overflow-hidden" data-testid="recent-runs">
      <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold">Recent AI runs</h2>
          <p className="text-sm text-muted">Every generation is logged, including failures.</p>
        </div>
        <Bot className="size-5 text-subtle" aria-hidden="true" />
      </div>
      {runs.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">
          No AI runs yet. Open a story and click <strong className="text-fg">Generate</strong>.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Last {runs.length} AI generation runs</caption>
            <thead className="bg-surface-2/60 text-left text-xs font-semibold tracking-wider text-subtle uppercase">
              <tr>
                <th scope="col" className="py-2.5 pr-3 pl-6">
                  Story
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Kind
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Status
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Model
                </th>
                <th scope="col" className="px-3 py-2.5 text-right">
                  Cases
                </th>
                <th scope="col" className="px-3 py-2.5 text-right">
                  Duration
                </th>
                <th scope="col" className="py-2.5 pr-6 pl-3 text-right">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-line" data-testid="recent-run">
                  <td className="max-w-56 truncate py-3 pr-3 pl-6">
                    <Link
                      to={`/stories/${run.storyId}`}
                      className="font-medium hover:text-accent-fg"
                    >
                      {run.storyTitle}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      {run.kind === 'PLAYWRIGHT' ? (
                        <FileText className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ListChecks className="size-3.5" aria-hidden="true" />
                      )}
                      {run.kind === 'PLAYWRIGHT' ? 'Playwright' : 'Test cases'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={run.status} />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted">{run.model ?? '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{run.testCaseCount ?? '—'}</td>
                  <td className="px-3 py-3 text-right text-muted tabular-nums">
                    {formatDuration(run.durationMs)}
                  </td>
                  <td className="py-3 pr-6 pl-3 text-right whitespace-nowrap text-muted">
                    <time dateTime={run.createdAt}>{timeAgo(run.createdAt)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      data-testid="project-card"
      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-pop"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-fg">
          <FolderKanban className="size-5" aria-hidden="true" />
        </span>
        <span className="text-xs text-subtle">Updated {timeAgo(project.updatedAt)}</span>
      </div>
      <h3
        className="mt-4 truncate font-semibold group-hover:text-accent-fg"
        data-testid="project-title"
      >
        {project.name}
      </h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">
        {project.description || 'No description'}
      </p>
      <div className="mt-4 flex gap-4 border-t border-line pt-3 text-xs font-medium text-muted">
        <span>{plural(project.storyCount, 'story', 'stories')}</span>
        <span>{plural(project.testCaseCount, 'test case')}</span>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <LoadingBlock label="Loading dashboard" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="h-56 rounded-2xl" />
    </LoadingBlock>
  );
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const { data, error, reload } = useResource(
    (signal) => Promise.all([api.dashboard(signal), api.projects.list(signal)]),
    [],
  );

  const createProject = async (values) => {
    const project = await api.projects.create(values);
    setCreating(false);
    toast.success(`Project "${project.name}" created`);
    reload();
  };

  const firstName = user.name.split(' ')[0];
  const [dashboard, projects] = data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">
            {greeting()}, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-muted">Here is how your test suite is shaping up.</p>
        </div>
        <Button icon={Plus} onClick={() => setCreating(true)} data-testid="new-project-button">
          New project
        </Button>
      </div>

      {error && !data && (
        <Banner
          title="Could not load your dashboard"
          action={
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={reload}>
              Try again
            </Button>
          }
        >
          {error.message}
        </Banner>
      )}

      {!data && !error && <DashboardSkeleton />}

      {data && (
        <>
          <section aria-label="Totals" className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={FolderKanban}
              label="Projects"
              value={dashboard.projectCount}
              testId="stat-projects"
              tint="bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"
            />
            <StatCard
              icon={FileText}
              label="User stories"
              value={dashboard.storyCount}
              testId="stat-stories"
              tint="bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"
            />
            <StatCard
              icon={ListChecks}
              label="Test cases"
              value={dashboard.testCaseCount}
              testId="stat-test-cases"
              tint="bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
            />
          </section>

          <section aria-label="Charts" className="grid gap-4 lg:grid-cols-2">
            <TypeDonut byType={dashboard.byType} />
            <PriorityBar byPriority={dashboard.byPriority} />
          </section>

          <RecentRuns runs={dashboard.recentRuns} />

          <section aria-labelledby="projects-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="projects-heading" className="text-xl font-semibold">
                Projects
              </h2>
              {projects.length > 0 && (
                <span className="text-sm text-muted">{plural(projects.length, 'project')}</span>
              )}
            </div>
            {projects.length === 0 ? (
              <EmptyState
                title="Create your first project"
                description="Projects group the user stories of one product or feature. Add a story and let AI write the test cases."
                action={
                  <Button icon={Plus} onClick={() => setCreating(true)}>
                    New project
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New project"
        description="Group related user stories together."
      >
        <ProjectForm onSubmit={createProject} onCancel={() => setCreating(false)} />
      </Modal>
    </div>
  );
}
