import { request } from '@playwright/test';
import { expect, test } from '../../fixtures/index.js';
import { FRONTEND_URL, LIVE_AI_URL } from '../../playwright.config.js';

/**
 * Smoke tests against the deployed public demo (free hosting, mock AI). They run after every
 * deploy and on a schedule. The services may be asleep, so the first checks allow a slow start.
 *   LIVE_BASE_URL=https://... LIVE_API_URL=https://... LIVE_AI_URL=https://... npx playwright test
 */
test.describe('Live demo', { tag: '@live' }, () => {
  test.describe.configure({ mode: 'serial' });

  test('API is up (waking it if needed) and runs the expected commit', async ({ apiContext }) => {
    await expect
      .poll(async () => (await apiContext.get('/actuator/health').catch(() => null))?.status(), {
        message: 'backend health',
        timeout: 240_000,
        intervals: [5_000],
      })
      .toBe(200);

    const expected = process.env.EXPECTED_COMMIT;
    await expect
      .poll(async () => (await (await apiContext.get('/actuator/info')).json()).app?.commit, {
        message: 'deployed commit',
        timeout: expected ? 900_000 : 10_000,
        intervals: [15_000],
      })
      .toEqual(expected ?? expect.any(String));
  });

  test('frontend is served with security headers and the mock-mode banner', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response.headers();
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');

    await expect(page.getByTestId('demo-banner')).toHaveText(
      'Live demo runs in mock AI mode. See the video for real Claude output.',
    );
    await expect(page.getByTestId('landing-cta')).toBeVisible();
  });

  test('"Try the demo" → dashboard → generate test cases, end to end', async ({
    page,
    storyPage,
  }) => {
    await page.goto('/');
    await page.getByTestId('try-demo').click();
    await expect(page.getByTestId('stat-projects')).toHaveText('1', { timeout: 180_000 });

    await page.getByTestId('project-card').click();
    await page.getByTestId('story-row').filter({ hasText: 'Password reset' }).click();
    await storyPage.generateButton.click();
    await expect(storyPage.rows).toHaveCount(6, { timeout: 120_000 });
    await expect(storyPage.rows.first().getByTestId('test-case-type')).toBeVisible();
  });

  test('API only allows the live frontend origin (CORS)', async ({ apiContext }) => {
    const preflight = (origin) =>
      apiContext.fetch('/api/projects', {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' },
      });
    const origin = new URL(FRONTEND_URL).origin;
    expect((await preflight(origin)).headers()['access-control-allow-origin']).toBe(origin);
    expect((await preflight('https://evil.example.com')).status()).toBe(403);
  });

  test('AI engine runs in mock mode and refuses calls without the internal token', async () => {
    expect(LIVE_AI_URL, 'set LIVE_AI_URL to the AI engine URL').toBeTruthy();
    const ai = await request.newContext({ baseURL: LIVE_AI_URL });
    try {
      const health = await ai.get('/health', { timeout: 180_000 });
      expect(await health.json()).toMatchObject({ status: 'ok', mode: 'mock' });
      const call = await ai.post('/v1/test-cases/generate', {
        data: { title: 'x', description: 'y' },
      });
      expect(call.status()).toBe(401);
    } finally {
      await ai.dispose();
    }
  });
});
