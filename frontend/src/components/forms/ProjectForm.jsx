import Banner from '../ui/Banner';
import Button from '../ui/Button';
import { Input, Textarea } from '../ui/Field';
import { useForm } from './useForm';

function validate({ name, description }) {
  return {
    name: !name.trim()
      ? 'Project name is required'
      : name.trim().length > 120
        ? 'Keep the name under 120 characters'
        : undefined,
    description:
      description.length > 1000 ? 'Keep the description under 1000 characters' : undefined,
  };
}

export default function ProjectForm({ project, onSubmit, onCancel }) {
  const { field, handleSubmit, submitting, formError } = useForm(
    { name: project?.name ?? '', description: project?.description ?? '' },
    validate,
  );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        onSubmit({ name: values.name.trim(), description: values.description.trim() || null }),
      )}
    >
      {formError && <Banner>{formError}</Banner>}
      <Input
        label="Project name"
        required
        maxLength={120}
        placeholder="e.g. Web shop checkout"
        data-testid="project-name-input"
        data-autofocus
        {...field('name')}
      />
      <Textarea
        label="Description"
        rows={3}
        maxLength={1000}
        placeholder="What is this project about? (optional)"
        data-testid="project-description-input"
        {...field('description')}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} data-testid="project-save">
          {project ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  );
}
