import { useState } from 'react';
import { ApiError } from '../../services/api';
import { focusFirstInvalid } from '../forms/useForm';
import Banner from '../ui/Banner';
import Button from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Field';
import { PRIORITIES, TYPES, LIMITS } from './constants';
import { stepsFromText, validateTestCase } from './validation';

const toOptions = (values) =>
  values.map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase() }));

function initialValues(testCase) {
  return {
    title: testCase?.title ?? '',
    type: testCase?.type ?? 'POSITIVE',
    priority: testCase?.priority ?? 'MEDIUM',
    preconditions: testCase?.preconditions ?? '',
    steps: testCase?.steps?.join('\n') ?? '',
    expectedResult: testCase?.expectedResult ?? '',
  };
}

/** Maps server field errors such as "steps[2]" onto form fields. */
function fieldErrorsFrom(error) {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(
    Object.entries(error.errors).map(([field, message]) => [
      field.replace(/\[\d+\]$/, ''),
      message,
    ]),
  );
}

export default function TestCaseForm({ testCase, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => initialValues(testCase));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const found = validateTestCase(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(form);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSubmit({
        title: values.title.trim(),
        type: values.type,
        priority: values.priority,
        preconditions: values.preconditions.trim() || null,
        steps: stepsFromText(values.steps),
        expectedResult: values.expectedResult.trim(),
      });
    } catch (error) {
      setErrors(fieldErrorsFrom(error));
      focusFirstInvalid(form);
      setFormError(error.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <Banner>{formError}</Banner>}
      <Input
        label="Title"
        required
        value={values.title}
        onChange={update('title')}
        error={errors.title}
        maxLength={LIMITS.title}
        placeholder="e.g. Login fails with a wrong password"
        data-testid="tc-title-input"
        data-autofocus
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Type"
          value={values.type}
          onChange={update('type')}
          options={toOptions(TYPES)}
          data-testid="tc-type-select"
        />
        <Select
          label="Priority"
          value={values.priority}
          onChange={update('priority')}
          options={toOptions(PRIORITIES)}
          data-testid="tc-priority-select"
        />
      </div>
      <Textarea
        label="Preconditions"
        rows={2}
        value={values.preconditions}
        onChange={update('preconditions')}
        error={errors.preconditions}
        placeholder="Optional"
        data-testid="tc-preconditions-input"
      />
      <Textarea
        label="Steps"
        required
        rows={5}
        value={values.steps}
        onChange={update('steps')}
        error={errors.steps}
        hint="One step per line."
        placeholder={
          'Open the login page\nEnter a valid email and a wrong password\nClick "Log in"'
        }
        data-testid="tc-steps-input"
      />
      <Textarea
        label="Expected result"
        required
        rows={2}
        value={values.expectedResult}
        onChange={update('expectedResult')}
        error={errors.expectedResult}
        data-testid="tc-expected-input"
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} data-testid="tc-save">
          {testCase ? 'Save changes' : 'Add test case'}
        </Button>
      </div>
    </form>
  );
}
