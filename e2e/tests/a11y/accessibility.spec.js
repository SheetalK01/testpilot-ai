import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../fixtures/index.js';
import { LOGIN_STORY } from '../../helpers/data.js';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Runs axe on the current page and fails on any serious or critical violation, with a readable summary. */
async function expectNoSeriousViolations(page, testInfo) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await testInfo.attach('axe-results.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  const serious = results.violations
    .filter((violation) => ['serious', 'critical'].includes(violation.impact))
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
    }));
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

for (const colorScheme of ['light', 'dark']) {
  test.describe(`Accessibility (${colorScheme} mode)`, { tag: ['@a11y', '@regression'] }, () => {
    test.use({ colorScheme });

    test('landing page', async ({ page }, testInfo) => {
      await page.goto('/');
      await expect(page.getByTestId('landing-cta')).toBeVisible();
      await expectNoSeriousViolations(page, testInfo);
    });

    test('login page, including validation errors', async ({ page, loginPage }, testInfo) => {
      await loginPage.goto();
      await loginPage.submit.click();
      await expect(page.getByText('Email is required')).toBeVisible();
      await expectNoSeriousViolations(page, testInfo);
    });

    test('register page', async ({ registerPage, page }, testInfo) => {
      await registerPage.goto();
      await expectNoSeriousViolations(page, testInfo);
    });

    test('dashboard with data', async ({ page, authedPage, userApi, dashboardPage }, testInfo) => {
      const project = await userApi.createProject({
        name: 'Accessible project',
        description: 'Has data',
      });
      await userApi.generate((await userApi.createStory(project.id, LOGIN_STORY)).id);
      await dashboardPage.goto();
      await expect(dashboardPage.recentRuns.getByTestId('recent-run')).toHaveCount(1);
      await expectNoSeriousViolations(page, testInfo);
    });

    test('dashboard with the new project dialog open', async ({
      page,
      authedPage,
      dashboardPage,
    }, testInfo) => {
      await dashboardPage.goto();
      await dashboardPage.newProjectButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectNoSeriousViolations(page, testInfo);
    });

    test('project page', async ({ page, authedPage, userApi, projectPage }, testInfo) => {
      const project = await userApi.createProject({ name: 'Accessible project' });
      await userApi.createStory(project.id, LOGIN_STORY);
      await projectPage.goto(project.id);
      await expect(projectPage.storyRows).toHaveCount(1);
      await expectNoSeriousViolations(page, testInfo);
    });

    test('wake-up screen shown while the server sleeps', async ({ page, authedPage }, testInfo) => {
      await page.route('**/actuator/health', (route) =>
        route.fulfill({ status: 503, body: 'starting' }),
      );
      await page.goto('/');
      await expect(page.getByTestId('wake-up-screen')).toBeVisible();
      await expectNoSeriousViolations(page, testInfo);
    });

    test('story page with cases, expanded steps and Playwright code', async ({
      page,
      authedPage,
      userApi,
      storyPage,
    }, testInfo) => {
      const project = await userApi.createProject({ name: 'Accessible project' });
      const story = await userApi.createStory(project.id, LOGIN_STORY);
      await userApi.generate(story.id);
      await storyPage.goto(story.id);
      await storyPage.rows.first().getByRole('button', { expanded: false }).first().click();
      await storyPage.generatePlaywright();
      await expectNoSeriousViolations(page, testInfo);
    });
  });
}
