import Banner from '../ui/Banner';
import Button from '../ui/Button';
import { Input, Textarea } from '../ui/Field';
import { useForm } from './useForm';

function validate({ title, description, acceptanceCriteria }) {
  return {
    title: !title.trim()
      ? 'Title is required'
      : title.trim().length > 200
        ? 'Keep the title under 200 characters'
        : undefined,
    description: !description.trim()
      ? 'Description is required'
      : description.length > 5000
        ? 'Keep the description under 5000 characters'
        : undefined,
    acceptanceCriteria:
      acceptanceCriteria.length > 5000
        ? 'Keep the acceptance criteria under 5000 characters'
        : undefined,
  };
}

export default function StoryForm({ story, onSubmit, onCancel }) {
  const { field, handleSubmit, submitting, formError } = useForm(
    {
      title: story?.title ?? '',
      description: story?.description ?? '',
      acceptanceCriteria: story?.acceptanceCriteria ?? '',
    },
    validate,
  );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          title: values.title.trim(),
          description: values.description.trim(),
          acceptanceCriteria: values.acceptanceCriteria.trim() || null,
        }),
      )}
    >
      {formError && <Banner>{formError}</Banner>}
      <Input
        label="Title"
        required
        maxLength={200}
        placeholder="e.g. User login"
        data-testid="story-title-input"
        data-autofocus
        {...field('title')}
      />
      <Textarea
        label="Description"
        required
        rows={4}
        maxLength={5000}
        placeholder="As a registered user, I want to log in with my email and password so that I can see my dashboard."
        data-testid="story-description-input"
        {...field('description')}
      />
      <Textarea
        label="Acceptance criteria"
        rows={5}
        maxLength={5000}
        hint="One criterion per line works best. The AI uses these to find edge cases."
        placeholder={
          'Valid credentials open the dashboard\nA wrong password shows "Invalid email or password"\nThe account locks after 5 failed attempts'
        }
        data-testid="story-criteria-input"
        {...field('acceptanceCriteria')}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} data-testid="story-save">
          {story ? 'Save changes' : 'Add story'}
        </Button>
      </div>
    </form>
  );
}
