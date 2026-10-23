import { readFile } from 'node:fs/promises';
import { expect, test } from '../../fixtures/index.js';
import { LOGIN_STORY, MOCK_CASES } from '../../helpers/data.js';

test.describe('Stories and AI generation', { tag: '@regression' }, () => {
  let storyId;

  test.beforeEach(async ({ userApi }) => {
    const project = await userApi.createProject({ name: 'Auth' });
    storyId = (await userApi.createStory(project.id, LOGIN_STORY)).id;
  });

  test(
    'generate, filter, edit, add manual, regenerate, export and Playwright',
    { tag: '@smoke' },
    async ({ page, authedPage, storyPage }) => {
      await storyPage.goto(storyId);
      await expect(page.getByText('No test cases yet')).toBeVisible();

      // Generate: the animation shows, then exactly six cases with badges appear.
      await storyPage.generate(MOCK_CASES.total);
      await expect(storyPage.rows.first().getByTestId('test-case-type')).toBeVisible();
      await expect(storyPage.rows.getByTestId('test-case-priority')).toHaveCount(MOCK_CASES.total);
      await expect(storyPage.rows.first().getByTestId('test-case-priority')).toHaveText('HIGH');

      // Filter by type.
      await storyPage.filter('NEGATIVE').click();
      await expect(storyPage.filter('NEGATIVE')).toHaveAttribute('aria-pressed', 'true');
      await expect(storyPage.rows).toHaveCount(MOCK_CASES.NEGATIVE);
      await expect(storyPage.rows.getByTestId('test-case-type')).toHaveText(
        Array(3).fill('NEGATIVE'),
      );
      await storyPage.filter('ALL').click();

      // Edit an AI case.
      const firstRow = storyPage.rows.first();
      await storyPage.editTestCase(firstRow, { title: 'Edited: login works', priority: 'LOW' });
      await expect(
        storyPage.row('Edited: login works').getByTestId('test-case-priority'),
      ).toHaveText('LOW');

      // Add a manual case.
      await storyPage.addTestCase({
        title: 'Manual: remember me keeps the session',
        type: 'EDGE',
        priority: 'HIGH',
        steps: ['Tick "Remember me"', 'Log in', 'Restart the browser'],
        expectedResult: 'The user is still logged in',
      });
      await expect(storyPage.rows).toHaveCount(MOCK_CASES.total + 1);

      // Regenerate replaces AI cases (including the edited one) and keeps the manual one.
      await storyPage.generate(MOCK_CASES.total + 1);
      await expect(storyPage.row('Manual: remember me keeps the session')).toBeVisible();
      await expect(storyPage.row('Edited: login works')).toHaveCount(0);

      // Export downloads an .xlsx file.
      const download = await storyPage.exportExcel();
      expect(download.suggestedFilename()).toBe('user-login-test-cases.xlsx');
      const bytes = await readFile(await download.path());
      expect(bytes.subarray(0, 2).toString()).toBe('PK'); // xlsx is a zip container

      // Playwright script panel shows code, and copy puts it on the clipboard.
      await storyPage.generatePlaywright();
      await expect(storyPage.playwrightScript).toContainText(
        "import { test, expect } from '@playwright/test';",
      );
      await expect(storyPage.playwrightScript).toContainText("test.describe('User login'");
      await storyPage.copyScriptButton.click();
      await expect(storyPage.copyScriptButton).toHaveText('Copied!');
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard).toContain("test.describe('User login'");
    },
  );

  test('expanding a case shows its steps and expected result', async ({
    authedPage,
    userApi,
    storyPage,
  }) => {
    await userApi.generate(storyId);
    await storyPage.goto(storyId);
    const title = storyPage.rows
      .first()
      .getByRole('button', { name: 'User login: happy path with valid data', exact: true });

    await expect(title).toHaveAttribute('aria-expanded', 'false');
    await title.click();
    await expect(title).toHaveAttribute('aria-expanded', 'true');
    await expect(
      storyPage.page.getByText('Enter valid data in every required field'),
    ).toBeVisible();
    await expect(
      storyPage.page.getByText('The action succeeds and a confirmation is shown'),
    ).toBeVisible();
  });

  test('deleting a test case asks for confirmation', async ({ authedPage, userApi, storyPage }) => {
    await userApi.generate(storyId);
    await storyPage.goto(storyId);
    const row = storyPage.rows.first();
    const title = await row.getByTestId('test-case-title').textContent();

    await storyPage.deleteTestCase(row);

    await expect(storyPage.rows).toHaveCount(MOCK_CASES.total - 1);
    await expect(storyPage.row(title)).toHaveCount(0);
  });

  test('the test case form validates required fields', async ({ page, authedPage, storyPage }) => {
    await storyPage.goto(storyId);
    await storyPage.addTestCaseButton.click();
    const dialog = page.getByRole('dialog', { name: 'Add test case' });
    await dialog.getByTestId('tc-save').click();

    await expect(dialog.getByText('Title is required')).toBeVisible();
    await expect(dialog.getByText('Add at least one step')).toBeVisible();
    await expect(dialog.getByText('Expected result is required')).toBeVisible();
  });

  test('an AI failure shows an error banner and keeps existing cases', async ({
    page,
    authedPage,
    userApi,
    storyPage,
  }) => {
    await userApi.createTestCase(storyId, {
      title: 'Existing manual case',
      type: 'POSITIVE',
      priority: 'HIGH',
      steps: ['Step'],
      expectedResult: 'Result',
    });
    await page.route('**/api/stories/*/generate', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ status: 502, message: 'AI engine failed: timed out after 120 s' }),
      }),
    );
    await storyPage.goto(storyId);
    await storyPage.generateButton.click();

    await expect(storyPage.generationError).toContainText(
      'AI engine failed: timed out after 120 s',
    );
    await expect(storyPage.rows).toHaveCount(1);
    await expect(storyPage.row('Existing manual case')).toBeVisible();
  });

  test('editing and deleting the story', async ({ page, authedPage, storyPage }) => {
    await storyPage.goto(storyId);
    await storyPage.editStoryButton.click();
    const dialog = page.getByRole('dialog', { name: 'Edit story' });
    await dialog.getByTestId('story-title-input').fill('User sign-in');
    await dialog.getByTestId('story-save').click();
    await expect(storyPage.heading).toHaveText('User sign-in');

    await storyPage.deleteStoryButton.click();
    await page.getByTestId('confirm-delete').click();
    await expect(page).toHaveURL(/\/projects\/\d+$/);
    await expect(page.getByText('No stories yet')).toBeVisible();
  });
});
