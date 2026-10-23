import { expect, test } from '../../fixtures/index.js';
import { LOGIN_STORY, newUser } from '../../helpers/data.js';

/**
 * Screenshot comparisons of the key screens. Data is fixed (same names, deterministic mock AI) and
 * anything time-dependent (greeting, durations, relative dates) is masked.
 */
test.describe('Visual regression', { tag: ['@visual', '@regression'] }, () => {
  test.use({ colorScheme: 'light' });

  test('landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('landing-cta')).toBeVisible();
    await expect(page).toHaveScreenshot('landing.png', { fullPage: true });
  });

  test.describe('signed in', () => {
    let storyId;
    test.use({
      user: async ({ api }, use) => use(await api.register(newUser({ name: 'Visual Tester' }))),
    });

    test.beforeEach(async ({ userApi }) => {
      const project = await userApi.createProject({
        name: 'Web Shop',
        description: 'Checkout, cart and account flows.',
      });
      storyId = (await userApi.createStory(project.id, LOGIN_STORY)).id;
      await userApi.generate(storyId);
    });

    test('dashboard', async ({ page, authedPage, dashboardPage }) => {
      await dashboardPage.goto();
      await expect(dashboardPage.recentRuns.getByTestId('recent-run')).toHaveCount(1);
      await expect(page).toHaveScreenshot('dashboard.png', {
        fullPage: true,
        mask: [
          page.getByRole('heading', { level: 1 }),
          page.locator('time'),
          dashboardPage.recentRuns.locator('td:nth-child(6)'),
          page.getByText(/^Updated /),
        ],
      });
    });

    test('story page', async ({ page, authedPage, storyPage }) => {
      await storyPage.goto(storyId);
      await expect(storyPage.rows).toHaveCount(6);
      await expect(page).toHaveScreenshot('story.png', { fullPage: true });
    });

    test('story page in dark mode', async ({ page, authedPage, storyPage }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await storyPage.goto(storyId);
      await expect(storyPage.rows).toHaveCount(6);
      await expect(page).toHaveScreenshot('story-dark.png', { fullPage: true });
    });
  });
});
