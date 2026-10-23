import { expect, test } from '../../fixtures/index.js';
import { uniqueName } from '../../helpers/data.js';

test.describe('Projects', { tag: '@regression' }, () => {
  test(
    'create, open, edit and delete a project',
    { tag: '@smoke' },
    async ({ page, authedPage, dashboardPage, projectPage }) => {
      const name = uniqueName('Web Shop');
      await dashboardPage.goto();
      await dashboardPage.createProject(name, 'Checkout and cart flows');

      await expect(dashboardPage.projectCard(name)).toBeVisible();
      await expect(
        page.getByTestId('toast').filter({ hasText: `Project "${name}" created` }),
      ).toBeVisible();
      await expect(dashboardPage.stats.projects).toHaveText('1');

      await dashboardPage.openProject(name);
      await expect(projectPage.heading).toHaveText(name);
      await expect(page.getByText('Checkout and cart flows')).toBeVisible();

      const renamed = `${name} v2`;
      await projectPage.rename(renamed, 'Updated description');
      await expect(projectPage.heading).toHaveText(renamed);
      await expect(page.getByText('Updated description')).toBeVisible();

      await projectPage.deleteProject();
      await expect(page).toHaveURL('/');
      await expect(dashboardPage.projectCards).toHaveCount(0);
      await expect(page.getByText('Create your first project')).toBeVisible();
    },
  );

  test('cancelling the delete dialog keeps the project', async ({
    authedPage,
    userApi,
    projectPage,
    page,
  }) => {
    const project = await userApi.createProject({ name: 'Keep me' });
    await projectPage.goto(project.id);

    await projectPage.deleteButton.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(projectPage.heading).toHaveText('Keep me');
  });

  test('empty name shows a validation message', async ({ page, authedPage, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.newProjectButton.click();
    const dialog = page.getByRole('dialog', { name: 'New project' });
    await dialog.getByTestId('project-save').click();

    await expect(dialog.getByText('Project name is required')).toBeVisible();
    await expect(dialog.getByTestId('project-name-input')).toBeFocused();
    await expect(dialog).toBeVisible();
  });

  test('the new project dialog traps focus and closes with Escape', async ({
    page,
    authedPage,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.newProjectButton.click();
    const dialog = page.getByRole('dialog', { name: 'New project' });
    await expect(dialog.getByTestId('project-name-input')).toBeFocused();

    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(dashboardPage.newProjectButton).toBeFocused();
  });

  test('adding a story opens it', async ({ page, authedPage, userApi, projectPage }) => {
    const project = await userApi.createProject({ name: 'Stories' });
    await projectPage.goto(project.id);
    await projectPage.addStory({
      title: 'Checkout',
      description: 'As a shopper I want to pay for my cart.',
    });

    await expect(page).toHaveURL(/\/stories\/\d+$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Checkout');
    await page.getByRole('link', { name: 'Stories' }).click();
    await expect(projectPage.storyRow('Checkout')).toContainText('0 test cases');
  });
});
