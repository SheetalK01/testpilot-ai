import { expect, test } from '../../fixtures/index.js';
import { LOGIN_STORY, manualCase } from '../../helpers/data.js';

test.describe('API · stories', { tag: ['@api', '@regression'] }, () => {
  let projectId;

  test.beforeEach(async ({ userApi }) => {
    projectId = (await userApi.createProject({ name: 'Stories' })).id;
  });

  test('CRUD with the documented response shape', { tag: '@smoke' }, async ({ userApi }) => {
    const story = await userApi.expectJson(
      userApi.post(`/projects/${projectId}/stories`, LOGIN_STORY),
      201,
    );
    expect(story).toEqual({
      id: expect.any(Number),
      projectId,
      ...LOGIN_STORY,
      testCaseCount: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const list = await userApi.expectJson(userApi.get(`/projects/${projectId}/stories`), 200);
    expect(list).toHaveLength(1);

    const updated = await userApi.expectJson(
      userApi.put(`/stories/${story.id}`, {
        title: 'Sign in',
        description: 'Updated',
        acceptanceCriteria: '',
      }),
      200,
    );
    expect(updated).toMatchObject({
      title: 'Sign in',
      description: 'Updated',
      acceptanceCriteria: null,
    });

    await userApi.expectJson(userApi.delete(`/stories/${story.id}`), 204);
    expect((await userApi.get(`/stories/${story.id}`)).status()).toBe(404);
  });

  test('deleting a story removes its test cases (cascade)', async ({ userApi }) => {
    const story = await userApi.createStory(projectId, LOGIN_STORY);
    const testCase = await userApi.createTestCase(story.id, manualCase());

    await userApi.expectJson(userApi.delete(`/stories/${story.id}`), 204);
    expect((await userApi.put(`/test-cases/${testCase.id}`, manualCase())).status()).toBe(404);
  });

  const cases = [
    ['title of 200 characters', { title: 't'.repeat(200) }, 201],
    ['title of 201 characters', { title: 't'.repeat(201) }, 400],
    ['empty title', { title: '' }, 400],
    ['description of 5000 characters', { description: 'd'.repeat(5000) }, 201],
    ['description of 5001 characters', { description: 'd'.repeat(5001) }, 400],
    ['empty description', { description: ' ' }, 400],
    ['criteria of 5000 characters', { acceptanceCriteria: 'a'.repeat(5000) }, 201],
    ['criteria of 5001 characters', { acceptanceCriteria: 'a'.repeat(5001) }, 400],
  ];
  for (const [label, override, status] of cases) {
    test(`validation: ${label} → ${status}`, async ({ userApi }) => {
      const response = await userApi.post(`/projects/${projectId}/stories`, {
        ...LOGIN_STORY,
        ...override,
      });
      expect(response.status()).toBe(status);
    });
  }
});
