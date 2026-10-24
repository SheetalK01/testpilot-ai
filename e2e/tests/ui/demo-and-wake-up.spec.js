import { expect, test } from '../../fixtures/index.js';

test.describe('Live demo features', { tag: '@regression' }, () => {
  test(
    '"Try the demo" opens a pre-filled private workspace',
    { tag: '@smoke' },
    async ({ page, dashboardPage }) => {
      await page.goto('/');
      await page.getByTestId('try-demo').click();

      await dashboardPage.expectLoaded();
      await expect(dashboardPage.navUser).toContainText('Demo User');
      await expect(dashboardPage.projectCard('Web Shop (demo)')).toBeVisible();
      await expect(dashboardPage.stats.stories).toHaveText('3');
      await expect(dashboardPage.recentRuns.getByTestId('recent-run')).toHaveCount(2);
    },
  );

  test('the demo story without test cases can be generated', async ({
    page,
    dashboardPage,
    storyPage,
  }) => {
    await page.goto('/login');
    await page.getByTestId('try-demo').click();
    await dashboardPage.openProject('Web Shop (demo)');
    await page.getByTestId('story-row').filter({ hasText: 'Password reset' }).click();

    await expect(page.getByText('No test cases yet')).toBeVisible();
    await storyPage.generate(6);
  });

  test('a sleeping server shows the wake-up screen until it answers', async ({
    page,
    authedPage,
  }) => {
    let healthy = false;
    await page.route('**/actuator/health', (route) =>
      healthy ? route.continue() : route.fulfill({ status: 503, body: 'starting' }),
    );

    await page.goto('/');
    const wakeUp = page.getByTestId('wake-up-screen');
    await expect(wakeUp).toBeVisible();
    await expect(wakeUp.getByRole('heading', { name: 'Waking up the server…' })).toBeVisible();
    await expect(wakeUp.getByRole('progressbar')).toBeVisible();

    healthy = true;
    await expect(wakeUp).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId('stat-projects')).toBeVisible();
  });

  test('the landing page does not wait for a sleeping server', async ({ page }) => {
    await page.route('**/actuator/health', (route) =>
      route.fulfill({ status: 503, body: 'starting' }),
    );

    await page.goto('/');

    await expect(page.getByTestId('landing-cta')).toBeVisible();
    await expect(page.getByTestId('wake-up-screen')).toHaveCount(0);
  });
});
