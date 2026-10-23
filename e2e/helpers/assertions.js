import { expect } from '@playwright/test';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

/** Every API error uses one shape: status, message, optional field errors, path, requestId, timestamp. */
export function expectErrorShape(body, status, path) {
  expect(body).toMatchObject({ status, path });
  expect(typeof body.message).toBe('string');
  expect(body.requestId).toBeTruthy();
  expect(body.timestamp).toMatch(ISO_DATE);
  expect(JSON.stringify(body)).not.toMatch(/Exception|at com\.|stackTrace/);
}
