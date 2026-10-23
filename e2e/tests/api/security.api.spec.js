import { expect, test } from '../../fixtures/index.js';
import { JWT_SECRET, signJwt } from '../../helpers/api.js';
import { expectErrorShape } from '../../helpers/assertions.js';
import { LOGIN_STORY, manualCase, newUser } from '../../helpers/data.js';

test.describe('Security', { tag: ['@security', '@api', '@regression'] }, () => {
  test.describe("IDOR: another user's resources are invisible (404, not 403)", () => {
    let victim;
    let projectId;
    let storyId;
    let testCaseId;

    test.beforeEach(async ({ api }) => {
      const owner = await api.register(newUser({ name: 'Victim' }));
      victim = api.withToken(owner.token);
      projectId = (await victim.createProject({ name: 'Secret project' })).id;
      storyId = (await victim.createStory(projectId, LOGIN_STORY)).id;
      testCaseId = (await victim.createTestCase(storyId, manualCase())).id;
    });

    test('projects: read, update, delete', async ({ userApi }) => {
      for (const response of [
        await userApi.get(`/projects/${projectId}`),
        await userApi.put(`/projects/${projectId}`, { name: 'Hacked' }),
        await userApi.delete(`/projects/${projectId}`),
        await userApi.get(`/projects/${projectId}/stories`),
        await userApi.post(`/projects/${projectId}/stories`, LOGIN_STORY),
      ]) {
        expect(response.status()).toBe(404);
      }
      const list = await userApi.expectJson(userApi.get('/projects'), 200);
      expect(list.map((p) => p.id)).not.toContain(projectId);
    });

    test('stories: read, update, delete, generate, export, playwright', async ({ userApi }) => {
      for (const response of [
        await userApi.get(`/stories/${storyId}`),
        await userApi.put(`/stories/${storyId}`, LOGIN_STORY),
        await userApi.delete(`/stories/${storyId}`),
        await userApi.post(`/stories/${storyId}/generate`),
        await userApi.get(`/stories/${storyId}/export`),
        await userApi.post(`/stories/${storyId}/playwright`, {}),
        await userApi.get(`/stories/${storyId}/test-cases`),
        await userApi.post(`/stories/${storyId}/test-cases`, manualCase()),
      ]) {
        expect(response.status()).toBe(404);
      }
    });

    test('update and delete of test cases', async ({ userApi }) => {
      const update = await userApi.put(
        `/test-cases/${testCaseId}`,
        manualCase({ title: 'Hacked' }),
      );
      const remove = await userApi.delete(`/test-cases/${testCaseId}`);
      expect(update.status()).toBe(404);
      expect(remove.status()).toBe(404);
    });

    test("the owner's data is untouched after the attempts", async ({ userApi }) => {
      await userApi.put(`/projects/${projectId}`, { name: 'Hacked' });
      await userApi.delete(`/test-cases/${testCaseId}`);

      expect((await victim.expectJson(victim.get(`/projects/${projectId}`), 200)).name).toBe(
        'Secret project',
      );
      expect(
        await victim.expectJson(victim.get(`/stories/${storyId}/test-cases`), 200),
      ).toHaveLength(1);
    });
  });

  test.describe('Authentication is enforced', () => {
    const protectedEndpoints = [
      ['GET', '/auth/me'],
      ['GET', '/projects'],
      ['POST', '/projects'],
      ['GET', '/dashboard'],
      ['GET', '/stories/1'],
      ['POST', '/stories/1/generate'],
      ['GET', '/stories/1/export'],
      ['DELETE', '/test-cases/1'],
    ];

    for (const [method, path] of protectedEndpoints) {
      test(`${method} ${path} without a token → 401`, async ({ apiContext }) => {
        const response = await apiContext.fetch(`/api${path}`, {
          method,
          data: method === 'POST' ? {} : undefined,
        });
        expect(response.status()).toBe(401);
        expectErrorShape(await response.json(), 401, `/api${path}`);
      });
    }

    test('a tampered token → 401', async ({ api, user }) => {
      const [header, , signature] = user.token.split('.');
      const forged = Buffer.from(
        JSON.stringify({ sub: '1', iss: 'testpilot-ai', exp: 9_999_999_999 }),
      ).toString('base64url');
      const response = await api.withToken(`${header}.${forged}.${signature}`).get('/auth/me');
      expect(response.status()).toBe(401);
      expect((await response.json()).message).toBe('Invalid or expired token');
    });

    test('a token signed with another secret → 401', async ({ api, user }) => {
      const now = Math.floor(Date.now() / 1000);
      const token = signJwt(
        { sub: String(user.id), iss: 'testpilot-ai', iat: now, exp: now + 3600 },
        'x'.repeat(40),
      );
      expect((await api.withToken(token).get('/auth/me')).status()).toBe(401);
    });

    test('an expired token → 401', async ({ api, user }) => {
      const past = Math.floor(Date.now() / 1000) - 7200;
      const token = signJwt(
        { sub: String(user.id), iss: 'testpilot-ai', iat: past - 60, exp: past },
        JWT_SECRET,
      );
      const response = await api.withToken(token).get('/auth/me');
      expect(response.status()).toBe(401);
    });

    test('a "none" algorithm token → 401', async ({ api, user }) => {
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: String(user.id), iss: 'testpilot-ai' })}.`;
      expect((await api.withToken(token).get('/auth/me')).status()).toBe(401);
    });
  });

  test('the password is never returned by any auth endpoint', async ({ api }) => {
    const user = newUser();
    const responses = [await api.post('/auth/register', user)];
    responses.push(await api.post('/auth/login', { email: user.email, password: user.password }));
    const token = (await responses[1].json()).token;
    responses.push(await api.withToken(token).get('/auth/me'));

    for (const response of responses) {
      const text = await response.text();
      expect(text).not.toContain(user.password);
      expect(text).not.toMatch(/password|\$2[aby]\$/i);
    }
  });

  test('SQL injection payloads are stored as plain text and change nothing', async ({
    userApi,
  }) => {
    const payload = "'; DROP TABLE projects; -- ' OR '1'='1";
    const project = await userApi.createProject({ name: payload });

    expect((await userApi.expectJson(userApi.get(`/projects/${project.id}`), 200)).name).toBe(
      payload,
    );
    const list = await userApi.expectJson(userApi.get('/projects'), 200);
    expect(list).toHaveLength(1);
    expect((await userApi.get(`/projects/1%20OR%201=1`)).status()).toBe(400);
  });

  test('a <script> payload is stored as-is and rendered as text, never executed', async ({
    page,
    authedPage,
    userApi,
  }) => {
    const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';
    const project = await userApi.createProject({ name: payload, description: payload });
    const story = await userApi.createStory(project.id, { title: payload, description: payload });
    await userApi.createTestCase(story.id, manualCase({ title: payload }));
    let dialogShown = false;
    page.on('dialog', async (dialog) => {
      dialogShown = true;
      await dialog.dismiss();
    });

    await page.goto(`/stories/${story.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(payload);
    await expect(page.getByTestId('test-case-title')).toHaveText(payload);
    await page.goto('/');
    await expect(page.getByTestId('project-title')).toHaveText(payload);

    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(dialogShown).toBe(false);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
  });

  test('CORS allows the frontend origin and rejects unknown origins', async ({ apiContext }) => {
    const preflight = (origin) =>
      apiContext.fetch('/api/projects', {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' },
      });

    const allowed = await preflight('http://localhost:5173');
    expect(allowed.headers()['access-control-allow-origin']).toBe('http://localhost:5173');

    const blocked = await preflight('https://evil.example.com');
    expect(blocked.status()).toBe(403);
    expect(blocked.headers()['access-control-allow-origin']).toBeUndefined();
  });
});
