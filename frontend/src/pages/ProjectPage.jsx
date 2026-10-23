import { ChevronRight, FileText, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import ProjectForm from '../components/forms/ProjectForm';
import StoryForm from '../components/forms/StoryForm';
import NotFoundState from '../components/NotFoundState';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Skeleton, { LoadingBlock } from '../components/ui/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import { plural, timeAgo } from '../services/format';

function StoryRow({ story }) {
  return (
    <li>
      <Link
        to={`/stories/${story.id}`}
        data-testid="story-row"
        className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-accent/40 hover:shadow-pop sm:p-5"
      >
        <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 sm:grid dark:bg-sky-400/10 dark:text-sky-300">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="truncate font-semibold group-hover:text-accent-fg"
            data-testid="story-title"
          >
            {story.title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted">{story.description}</p>
        </div>
        <span
          className={
            story.testCaseCount > 0
              ? 'rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-accent-fg'
              : 'rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-muted'
          }
        >
          {plural(story.testCaseCount, 'test case')}
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-subtle transition group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [dialog, setDialog] = useState(null); // 'edit' | 'delete' | 'story'
  const { data, error, reload, setData } = useResource(
    (signal) =>
      Promise.all([api.projects.get(projectId, signal), api.stories.list(projectId, signal)]),
    [projectId],
  );
  const [project, stories] = data ?? [];
  useDocumentTitle(project?.name ?? 'Project');
  const close = () => setDialog(null);

  if (error?.status === 404 || error?.status === 400) return <NotFoundState what="project" />;

  const saveProject = async (values) => {
    const updated = await api.projects.update(projectId, values);
    setData(([, currentStories]) => [updated, currentStories]);
    close();
    toast.success('Project updated');
  };

  const deleteProject = async () => {
    try {
      await api.projects.remove(projectId);
      toast.success(`Project "${project.name}" deleted`);
      navigate('/', { replace: true });
    } catch (err) {
      close();
      toast.error(err.message);
    }
  };

  const addStory = async (values) => {
    const story = await api.stories.create(projectId, values);
    close();
    toast.success('Story added');
    navigate(`/stories/${story.id}`);
  };

  return (
    <div>
      <Breadcrumbs
        items={[{ label: 'Dashboard', to: '/' }, { label: project?.name ?? 'Project' }]}
      />

      {error && !data && (
        <Banner
          title="Could not load this project"
          action={
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={reload}>
              Try again
            </Button>
          }
        >
          {error.message}
        </Banner>
      )}

      {!data && !error && (
        <LoadingBlock label="Loading project" className="space-y-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </LoadingBlock>
      )}

      {data && (
        <div className="space-y-8">
          <Card className="relative overflow-hidden p-6 sm:p-8">
            <div
              className="bg-glow pointer-events-none absolute inset-0 opacity-70"
              aria-hidden="true"
            />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-accent-fg">Project</p>
                <h1 className="mt-1 text-3xl font-semibold break-words">{project.name}</h1>
                <p className="mt-2 max-w-2xl text-muted">
                  {project.description || 'No description yet.'}
                </p>
                <p className="mt-4 text-sm text-subtle">
                  {plural(project.storyCount, 'story', 'stories')} ·{' '}
                  {plural(project.testCaseCount, 'test case')} · Created{' '}
                  {timeAgo(project.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => setDialog('edit')}
                  data-testid="project-edit"
                >
                  Edit
                </Button>
                <Button
                  variant="danger-ghost"
                  icon={Trash2}
                  onClick={() => setDialog('delete')}
                  data-testid="project-delete"
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>

          <section aria-labelledby="stories-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="stories-heading" className="text-xl font-semibold">
                  User stories
                </h2>
                <p className="text-sm text-muted">
                  Each story becomes a set of AI-generated test cases.
                </p>
              </div>
              <Button icon={Plus} onClick={() => setDialog('story')} data-testid="add-story-button">
                Add story
              </Button>
            </div>
            {stories.length === 0 ? (
              <EmptyState
                title="No stories yet"
                description="Write a user story in plain English with its acceptance criteria. TestPilot AI does the rest."
                action={
                  <Button icon={Plus} onClick={() => setDialog('story')}>
                    Add your first story
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {stories.map((story) => (
                  <StoryRow key={story.id} story={story} />
                ))}
              </ul>
            )}
          </section>

          <Modal open={dialog === 'edit'} onClose={close} title="Edit project">
            <ProjectForm project={project} onSubmit={saveProject} onCancel={close} />
          </Modal>
          <Modal
            open={dialog === 'story'}
            onClose={close}
            title="Add user story"
            description="Describe the feature from the user's point of view."
            size="lg"
          >
            <StoryForm onSubmit={addStory} onCancel={close} />
          </Modal>
          <ConfirmDialog
            open={dialog === 'delete'}
            onClose={close}
            onConfirm={deleteProject}
            title="Delete project?"
            message={`"${project.name}" and all of its stories and test cases will be permanently deleted.`}
            confirmLabel="Delete project"
          />
        </div>
      )}
    </div>
  );
}
