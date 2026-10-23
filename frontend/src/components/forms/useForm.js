import { useState } from 'react';
import { ApiError } from '../../services/api';

/**
 * Minimal form state: values, client-side validation, server field errors and a submitting flag.
 * `validate(values)` returns { field: message } for invalid fields.
 */
/** Moves focus to the first field marked invalid once React has rendered the errors. */
export function focusFirstInvalid(form) {
  requestAnimationFrame(() => form?.querySelector('[aria-invalid="true"]')?.focus());
}

export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const field = (name) => ({
    value: values[name],
    error: errors[name],
    onChange: (event) => {
      const { value } = event.target;
      setValues((current) => ({ ...current, [name]: value }));
      if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  const handleSubmit = (onValid) => async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const found = validate(values);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      focusFirstInvalid(form);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onValid(values);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors);
      focusFirstInvalid(form);
      setFormError(error.message);
      setSubmitting(false);
    }
  };

  return { values, field, handleSubmit, submitting, formError };
}
