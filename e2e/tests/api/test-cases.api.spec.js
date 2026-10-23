import { expect, test } from '../../fixtures/index.js';
import { LOGIN_STORY, manualCase, MOCK_CASES } from '../../helpers/data.js';

test.describe(
  'API · test cases, generation, export and dashboard',
  { tag: ['@api', '@regression'] },
  () => {
    let storyId;

    test.beforeEach(async ({ userApi }) => {
      const project = await userApi.createProject({ name: 'Cases' });
      storyId = (await userApi.createStory(project.id, LOGIN_STORY)).id;
    });

    test('POST creates a MANUAL case with the documented shape; PUT keeps the source', async ({
      userApi,
    }) => {
      const created = await userApi.createTestCase(storyId, manualCase());
      expect(created).toEqual({
        id: expect.any(Number),
        storyId,
        ...manualCase(),
        source: 'MANUAL',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const updated = await userApi.expectJson(
        userApi.put(`/test-cases/${created.id}`, manualCase({ title: 'Edited', type: 'NEGATIVE' })),
        200,
      );
      expect(updated).toMatchObject({ title: 'Edited', type: 'NEGATIVE', source: 'MANUAL' });

      await userApi.expectJson(userApi.delete(`/test-cases/${created.id}`), 204);
      expect(await userApi.expectJson(userApi.get(`/stories/${storyId}/test-cases`), 200)).toEqual(
        [],
      );
    });

    test('GET orders cases HIGH → MEDIUM → LOW, then by id', async ({ userApi }) => {
      const low = await userApi.createTestCase(storyId, manualCase({ priority: 'LOW' }));
      const high = await userApi.createTestCase(storyId, manualCase({ priority: 'HIGH' }));
      const medium = await userApi.createTestCase(storyId, manualCase({ priority: 'MEDIUM' }));

      const list = await userApi.expectJson(userApi.get(`/stories/${storyId}/test-cases`), 200);
      expect(list.map((tc) => tc.id)).toEqual([high.id, medium.id, low.id]);
    });

    const invalid = [
      ['no steps', { steps: [] }, 'steps'],
      ['31 steps', { steps: Array(31).fill('step') }, 'steps'],
      ['an empty step', { steps: ['ok', ''] }, 'steps[1]'],
      ['a 501-character step', { steps: ['s'.repeat(501)] }, 'steps[0]'],
      ['a 256-character title', { title: 't'.repeat(256) }, 'title'],
      ['an unknown type', { type: 'SMOKE' }, 'type'],
      ['an unknown priority', { priority: 'URGENT' }, 'priority'],
      ['an empty expected result', { expectedResult: '' }, 'expectedResult'],
      ['a 2001-character expected result', { expectedResult: 'e'.repeat(2001) }, 'expectedResult'],
    ];
    for (const [label, override, field] of invalid) {
      test(`validation: ${label} → 400 with errors.${field}`, async ({ userApi }) => {
        const response = await userApi.post(`/stories/${storyId}/test-cases`, manualCase(override));
        expect(response.status()).toBe(400);
        expect((await response.json()).errors).toHaveProperty([field]);
      });
    }

    test('boundaries that are allowed: 30 steps of 500 characters, 255-character title', async ({
      userApi,
    }) => {
      const response = await userApi.post(
        `/stories/${storyId}/test-cases`,
        manualCase({ title: 't'.repeat(255), steps: Array(30).fill('s'.repeat(500)) }),
      );
      expect(response.status()).toBe(201);
    });

    test(
      'POST /generate returns six mock AI cases; regenerating keeps MANUAL cases',
      { tag: '@smoke' },
      async ({ userApi }) => {
        const first = await userApi.generate(storyId);
        expect(first).toEqual({
          runId: expect.any(Number),
          model: 'mock',
          testCases: expect.any(Array),
        });
        expect(first.testCases).toHaveLength(MOCK_CASES.total);
        expect(new Set(first.testCases.map((tc) => tc.source))).toEqual(new Set(['AI']));
        expect(first.testCases.filter((tc) => tc.type === 'NEGATIVE')).toHaveLength(
          MOCK_CASES.NEGATIVE,
        );

        await userApi.createTestCase(storyId, manualCase());
        const second = await userApi.generate(storyId);
        expect(second.runId).toBeGreaterThan(first.runId);
        expect(second.testCases).toHaveLength(MOCK_CASES.total + 1);
        expect(second.testCases.filter((tc) => tc.source === 'MANUAL')).toHaveLength(1);
        const firstIds = new Set(first.testCases.map((tc) => tc.id));
        expect(second.testCases.some((tc) => firstIds.has(tc.id))).toBe(false);
      },
    );

    test('POST /playwright → 400 without cases, then 200 with a script', async ({ userApi }) => {
      const empty = await userApi.post(`/stories/${storyId}/playwright`, {});
      expect(empty.status()).toBe(400);
      expect((await empty.json()).message).toContain('Generate or add test cases');

      await userApi.generate(storyId);
      const body = await userApi.expectJson(
        userApi.post(`/stories/${storyId}/playwright`, { baseUrl: 'https://shop.example.com' }),
        200,
      );
      expect(body).toMatchObject({ runId: expect.any(Number), model: 'mock' });
      expect(body.script).toContain("test.describe('User login'");
      expect(body.script).toContain('https://shop.example.com');
      expect(body.script.match(/^\s+test\(/gm)).toHaveLength(MOCK_CASES.total);
    });

    test('POST /playwright rejects a non-http base URL', async ({ userApi }) => {
      await userApi.generate(storyId);
      const response = await userApi.post(`/stories/${storyId}/playwright`, {
        baseUrl: 'javascript:alert(1)',
      });
      expect(response.status()).toBe(400);
      expect((await response.json()).errors.baseUrl).toBeTruthy();
    });

    test('GET /export returns an .xlsx attachment', async ({ userApi }) => {
      await userApi.generate(storyId);
      const response = await userApi.get(`/stories/${storyId}/export`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(response.headers()['content-disposition']).toBe(
        'attachment; filename="user-login-test-cases.xlsx"',
      );
      const bytes = await response.body();
      expect(bytes.subarray(0, 2).toString()).toBe('PK');
      expect(bytes.length).toBeGreaterThan(3000);
    });

    test('GET /dashboard has every key and counts my data', async ({ userApi }) => {
      await userApi.generate(storyId);
      const body = await userApi.expectJson(userApi.get('/dashboard'), 200);

      expect(body).toMatchObject({
        projectCount: 1,
        storyCount: 1,
        testCaseCount: MOCK_CASES.total,
        byType: { POSITIVE: 2, NEGATIVE: 3, EDGE: 1 },
        byPriority: { HIGH: 2, MEDIUM: 3, LOW: 1 },
      });
      expect(body.recentRuns[0]).toEqual({
        id: expect.any(Number),
        storyId,
        storyTitle: 'User login',
        kind: 'TEST_CASES',
        status: 'SUCCESS',
        model: 'mock',
        testCaseCount: MOCK_CASES.total,
        durationMs: expect.any(Number),
        createdAt: expect.any(String),
      });
    });
  },
);
