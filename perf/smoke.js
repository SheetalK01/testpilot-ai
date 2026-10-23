// k6 performance smoke test: login + list projects + dashboard under light load.
//   k6 run perf/smoke.js                       (against http://localhost:8080)
//   k6 run -e API_URL=http://host:8080 perf/smoke.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const API_URL = __ENV.API_URL || 'http://localhost:8080';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

/** One shared user with a project and a story, created once before the load starts. */
export function setup() {
  const credentials = { email: `k6-${Date.now()}@example.com`, password: 'Password123' };
  const registered = http.post(
    `${API_URL}/api/auth/register`,
    JSON.stringify({ name: 'k6 Load', ...credentials }),
    { headers: JSON_HEADERS },
  );
  check(registered, { 'setup: registered': (r) => r.status === 201 });
  const auth = { headers: { ...JSON_HEADERS, Authorization: `Bearer ${registered.json('token')}` } };
  const project = http.post(`${API_URL}/api/projects`, JSON.stringify({ name: 'Load test' }), auth);
  http.post(
    `${API_URL}/api/projects/${project.json('id')}/stories`,
    JSON.stringify({ title: 'Login', description: 'As a user I want to log in.' }),
    auth,
  );
  return credentials;
}

export default function (credentials) {
  let token;
  group('login', () => {
    const res = http.post(`${API_URL}/api/auth/login`, JSON.stringify(credentials), {
      headers: JSON_HEADERS,
      tags: { endpoint: 'login' },
    });
    check(res, { 'login 200': (r) => r.status === 200, 'login returns token': (r) => !!r.json('token') });
    token = res.json('token');
  });

  const auth = { headers: { Authorization: `Bearer ${token}` } };
  group('list projects', () => {
    const res = http.get(`${API_URL}/api/projects`, { ...auth, tags: { endpoint: 'projects' } });
    check(res, { 'projects 200': (r) => r.status === 200, 'projects listed': (r) => r.json().length === 1 });
  });
  group('dashboard', () => {
    const res = http.get(`${API_URL}/api/dashboard`, { ...auth, tags: { endpoint: 'dashboard' } });
    check(res, { 'dashboard 200': (r) => r.status === 200, 'dashboard has counts': (r) => r.json('projectCount') === 1 });
  });
  sleep(1);
}
