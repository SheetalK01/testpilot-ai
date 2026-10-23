import { createHmac } from 'node:crypto';
import { expect } from '@playwright/test';
import { newUser } from './data.js';

/**
 * Typed-ish client over Playwright's APIRequestContext. Used for fast test setup (no clicking
 * through the UI to create data) and by the API suites themselves.
 */
export class ApiClient {
  /** @param {import('@playwright/test').APIRequestContext} request */
  constructor(request, token = null) {
    this.request = request;
    this.token = token;
  }

  withToken(token) {
    return new ApiClient(this.request, token);
  }

  headers(extra = {}) {
    return this.token ? { Authorization: `Bearer ${this.token}`, ...extra } : extra;
  }

  get(path, options = {}) {
    return this.request.get(`/api${path}`, { ...options, headers: this.headers(options.headers) });
  }

  post(path, data, options = {}) {
    return this.request.post(`/api${path}`, {
      ...options,
      data,
      headers: this.headers(options.headers),
    });
  }

  put(path, data, options = {}) {
    return this.request.put(`/api${path}`, {
      ...options,
      data,
      headers: this.headers(options.headers),
    });
  }

  delete(path, options = {}) {
    return this.request.delete(`/api${path}`, {
      ...options,
      headers: this.headers(options.headers),
    });
  }

  /** Sends the request and asserts the status, returning the parsed JSON body. */
  async expectJson(responsePromise, status) {
    const response = await responsePromise;
    expect(response.status(), await response.text()).toBe(status);
    return response.status() === 204 ? null : response.json();
  }

  async register(user = newUser()) {
    const body = await this.expectJson(this.post('/auth/register', user), 201);
    return { ...user, id: body.user.id, token: body.token };
  }

  createProject(data = { name: 'Project', description: 'Created by an API helper' }) {
    return this.expectJson(this.post('/projects', data), 201);
  }

  createStory(projectId, data) {
    return this.expectJson(this.post(`/projects/${projectId}/stories`, data), 201);
  }

  createTestCase(storyId, data) {
    return this.expectJson(this.post(`/stories/${storyId}/test-cases`, data), 201);
  }

  generate(storyId) {
    return this.expectJson(this.post(`/stories/${storyId}/generate`), 200);
  }
}

/** Signs an HS256 JWT with the given secret, e.g. to build an expired but otherwise valid token. */
export function signJwt(claims, secret) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}
