import { randomUUID } from 'node:crypto';

export const PASSWORD = 'Password123';

/** Every test gets its own user, so tests are independent and safe to run in parallel. */
export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}-${randomUUID().slice(0, 12)}@example.com`;
}

export function uniqueName(prefix) {
  return `${prefix} ${randomUUID().slice(0, 6)}`;
}

export function newUser(overrides = {}) {
  return { name: 'Ada Lovelace', email: uniqueEmail(), password: PASSWORD, ...overrides };
}

export const LOGIN_STORY = {
  title: 'User login',
  description:
    'As a registered user, I want to log in with my email and password so that I can see my dashboard.',
  acceptanceCriteria:
    'Valid credentials open the dashboard\nA wrong password shows "Invalid email or password"\nEmail and password are required',
};

export function manualCase(overrides = {}) {
  return {
    title: 'Manual: login is case-insensitive for email',
    type: 'EDGE',
    priority: 'LOW',
    preconditions: 'User account exists',
    steps: [
      'Open the login page',
      'Enter the email in upper case',
      'Enter the correct password',
      'Click Log in',
    ],
    expectedResult: 'The dashboard is shown',
    ...overrides,
  };
}

/** The deterministic mock AI returns exactly these counts. */
export const MOCK_CASES = {
  total: 6,
  POSITIVE: 2,
  NEGATIVE: 3,
  EDGE: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 1,
};
