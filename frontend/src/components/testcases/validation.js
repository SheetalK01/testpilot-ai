import { LIMITS } from './constants';

export function stepsFromText(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function validateTestCase(values) {
  const errors = {};
  const steps = stepsFromText(values.steps);
  if (!values.title.trim()) errors.title = 'Title is required';
  else if (values.title.trim().length > LIMITS.title)
    errors.title = `Keep the title under ${LIMITS.title} characters`;
  if (values.preconditions.length > LIMITS.preconditions)
    errors.preconditions = `Keep preconditions under ${LIMITS.preconditions} characters`;
  if (steps.length === 0) errors.steps = 'Add at least one step';
  else if (steps.length > LIMITS.steps) errors.steps = `Use at most ${LIMITS.steps} steps`;
  else if (steps.some((step) => step.length > LIMITS.step))
    errors.steps = `Each step must be under ${LIMITS.step} characters`;
  if (!values.expectedResult.trim()) errors.expectedResult = 'Expected result is required';
  else if (values.expectedResult.length > LIMITS.expectedResult)
    errors.expectedResult = `Keep the expected result under ${LIMITS.expectedResult} characters`;
  return errors;
}
