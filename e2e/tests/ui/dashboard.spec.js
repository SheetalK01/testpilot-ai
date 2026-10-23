import { expect, test } from '../../fixtures/index.js';
import { LOGIN_STORY, MOCK_CASES } from '../../helpers/data.js';

test.describe('Dashboard', { tag: '@regression' }, () => {
  test(
    'stats, charts and recent runs reflect my data',
    { tag: '@smoke' },
    async ({ authedPage, userApi, dashboardPage }) => {
      const shop = await userApi.createProject({ name: 'Shop' });
      await userApi.createProject({ name: 'Admin' });
      const story = await userApi.createStory(shop.id, LOGIN_STORY);
      await userApi.createStory(shop.id, {
        title: 'Logout',
        description: 'As a user I want to log out.',
      });
      await userApi.generate(story.id);

      await dashboardPage.goto();

      await expect(dashboardPage.stats.projects).toHaveText('2');
      await expect(dashboardPage.stats.stories).toHaveText('2');
      await expect(dashboardPage.stats.testCases).toHaveText(String(MOCK_CASES.total));
      for (const type of ['POSITIVE', 'NEGATIVE', 'EDGE']) {
        await expect(dashboardPage.chartValue(dashboardPage.typeChart, type)).toHaveText(
          String(MOCK_CASES[type]),
        );
      }
      for (const priority of ['HIGH', 'MEDIUM', 'LOW']) {
        await expect(dashboardPage.chartValue(dashboardPage.priorityChart, priority)).toHaveText(
          String(MOCK_CASES[priority]),
        );
      }
      await expect(dashboardPage.typeChart.locator('svg').first()).toBeVisible();

      const run = dashboardPage.recentRuns.getByTestId('recent-run').first();
      await expect(run).toContainText('User login');
      await expect(run).toContainText('Test cases');
      await expect(run).toContainText('Success');
      await expect(run).toContainText('mock');
      await expect(run).toContainText(String(MOCK_CASES.total));

      await run.getByRole('link', { name: 'User login' }).click();
      await expect(dashboardPage.page.getByRole('heading', { level: 1 })).toHaveText('User login');
    },
  );

  test('a new user sees empty states', async ({ page, authedPage, dashboardPage }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.stats.testCases).toHaveText('0');
    await expect(dashboardPage.recentRuns).toContainText('No AI runs yet');
    await expect(page.getByText('Create your first project')).toBeVisible();
  });
});
