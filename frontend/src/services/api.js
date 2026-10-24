/**
 * Thin fetch wrapper for the TestPilot API.
 *
 * - Adds the JWT from localStorage to every request.
 * - Turns error responses ({ status, message, errors }) into ApiError instances.
 * - On a 401 for an authenticated request, clears the token and notifies the app, which sends the
 *   user to /login.
 */

export const TOKEN_KEY = 'tp_token';
export const UNAUTHORIZED_EVENT = 'tp:unauthorized';

import { config } from './config';

const BASE_URL = config.apiUrl;

export class ApiError extends Error {
  constructor(status, message, errors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors ?? {};
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function send(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  if (response.status === 401 && token) {
    tokenStore.clear();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      problem.message ?? `Request failed (${response.status})`,
      problem.errors,
    );
  }
  return response;
}

async function request(path, options) {
  const response = await send(path, options);
  return response.status === 204 ? null : response.json();
}

function filenameFrom(response, fallback) {
  const header = response.headers.get('Content-Disposition') ?? '';
  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? fallback;
}

/** Downloads the story's Excel export through a temporary object URL. */
async function downloadExport(storyId) {
  const response = await send(`/stories/${storyId}/export`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filenameFrom(response, 'test-cases.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return link.download;
}

/** True when the backend answers its health check. Used to detect a sleeping free-tier server. */
export async function isServerUp(timeoutMs = 8000) {
  try {
    const response = await fetch(`${BASE_URL}/actuator/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const api = {
  auth: {
    login: (body) => request('/auth/login', { method: 'POST', body }),
    register: (body) => request('/auth/register', { method: 'POST', body }),
    me: (signal) => request('/auth/me', { signal }),
  },
  demo: {
    start: () => request('/demo/session', { method: 'POST' }),
  },
  dashboard: (signal) => request('/dashboard', { signal }),
  projects: {
    list: (signal) => request('/projects', { signal }),
    get: (id, signal) => request(`/projects/${id}`, { signal }),
    create: (body) => request('/projects', { method: 'POST', body }),
    update: (id, body) => request(`/projects/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  },
  stories: {
    list: (projectId, signal) => request(`/projects/${projectId}/stories`, { signal }),
    get: (id, signal) => request(`/stories/${id}`, { signal }),
    create: (projectId, body) =>
      request(`/projects/${projectId}/stories`, { method: 'POST', body }),
    update: (id, body) => request(`/stories/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/stories/${id}`, { method: 'DELETE' }),
  },
  testCases: {
    list: (storyId, signal) => request(`/stories/${storyId}/test-cases`, { signal }),
    create: (storyId, body) => request(`/stories/${storyId}/test-cases`, { method: 'POST', body }),
    update: (id, body) => request(`/test-cases/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/test-cases/${id}`, { method: 'DELETE' }),
  },
  ai: {
    generate: (storyId) => request(`/stories/${storyId}/generate`, { method: 'POST' }),
    playwright: (storyId, baseUrl) =>
      request(`/stories/${storyId}/playwright`, {
        method: 'POST',
        body: baseUrl ? { baseUrl } : {},
      }),
  },
  exportExcel: downloadExport,
};
