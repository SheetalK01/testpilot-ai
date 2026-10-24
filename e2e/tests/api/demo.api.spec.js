import { expect, test } from '../../fixtures/index.js';

test.describe('API · demo sessions', { tag: ['@api', '@regression'] }, () => {
  test(
    'POST /demo/session → 201 with a token for a new, pre-filled account',
    { tag: '@smoke' },
    async ({ api }) => {
      const body = await api.expectJson(api.post('/demo/session'), 201);
      expect(body.user).toMatchObject({
        name: 'Demo User',
        email: expect.stringMatching(/@demo\.testpilot\.invalid$/),
      });

      const projects = await api
        .withToken(body.token)
        .expectJson(api.withToken(body.token).get('/projects'), 200);
      expect(projects).toEqual([
        expect.objectContaining({ name: 'Web Shop (demo)', storyCount: 3, testCaseCount: 8 }),
      ]);
    },
  );

  test('two demo sessions never share data', async ({ api }) => {
    const first = await api.expectJson(api.post('/demo/session'), 201);
    const second = await api.expectJson(api.post('/demo/session'), 201);
    expect(first.user.id).not.toBe(second.user.id);

    const [project] = await api
      .withToken(first.token)
      .expectJson(api.withToken(first.token).get('/projects'), 200);
    expect((await api.withToken(second.token).get(`/projects/${project.id}`)).status()).toBe(404);
  });

  test('the reserved demo email domain cannot be registered', async ({ api }) => {
    const response = await api.post('/auth/register', {
      name: 'Sneaky',
      email: 'me@demo.testpilot.invalid',
      password: 'Password123',
    });
    expect(response.status()).toBe(400);
  });
});
