import { expect, test } from '../../fixtures/index.js';
import { LOGIN_STORY } from '../../helpers/data.js';
import { expectErrorShape } from '../../helpers/assertions.js';

test.describe('API · projects', { tag: ['@api', '@regression'] }, () => {
  test(
    'CRUD: POST 201 → GET 200 → PUT 200 → DELETE 204 → GET 404',
    { tag: '@smoke' },
    async ({ userApi }) => {
      const created = await userApi.expectJson(
        userApi.post('/projects', { name: 'Shop', description: 'Cart' }),
        201,
      );
      expect(created).toEqual({
        id: expect.any(Number),
        name: 'Shop',
        description: 'Cart',
        storyCount: 0,
        testCaseCount: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const fetched = await userApi.expectJson(userApi.get(`/projects/${created.id}`), 200);
      expect(fetched.name).toBe('Shop');

      const updated = await userApi.expectJson(
        userApi.put(`/projects/${created.id}`, { name: 'Shop 2' }),
        200,
      );
      expect(updated).toMatchObject({ id: created.id, name: 'Shop 2', description: null });

      await userApi.expectJson(userApi.delete(`/projects/${created.id}`), 204);
      const gone = await userApi.get(`/projects/${created.id}`);
      expect(gone.status()).toBe(404);
      expectErrorShape(await gone.json(), 404, `/api/projects/${created.id}`);
    },
  );

  test('GET /projects lists newest first with story and test case counts', async ({ userApi }) => {
    const first = await userApi.createProject({ name: 'First' });
    const second = await userApi.createProject({ name: 'Second' });
    const story = await userApi.createStory(first.id, LOGIN_STORY);
    await userApi.generate(story.id);

    const list = await userApi.expectJson(userApi.get('/projects'), 200);
    expect(list.map((p) => p.id)).toEqual([second.id, first.id]);
    expect(list[1]).toMatchObject({ storyCount: 1, testCaseCount: 6 });
  });

  const cases = [
    ['empty name', { name: '' }, 400],
    ['blank name', { name: '   ' }, 400],
    ['name of 120 characters', { name: 'p'.repeat(120) }, 201],
    ['name of 121 characters', { name: 'p'.repeat(121) }, 400],
    ['description of 1000 characters', { name: 'ok', description: 'd'.repeat(1000) }, 201],
    ['description of 1001 characters', { name: 'ok', description: 'd'.repeat(1001) }, 400],
  ];
  for (const [label, body, status] of cases) {
    test(`validation: ${label} → ${status}`, async ({ userApi }) => {
      const response = await userApi.post('/projects', body);
      expect(response.status()).toBe(status);
    });
  }

  test('malformed JSON → 400 "Malformed JSON request"', async ({ userApi }) => {
    const response = await userApi.request.post('/api/projects', {
      headers: userApi.headers({ 'Content-Type': 'application/json' }),
      data: '{"name":',
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBe('Malformed JSON request');
  });
});
