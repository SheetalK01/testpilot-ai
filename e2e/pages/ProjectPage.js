import { expect } from '@playwright/test';

export class ProjectPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.editButton = page.getByTestId('project-edit');
    this.deleteButton = page.getByTestId('project-delete');
    this.addStoryButton = page.getByTestId('add-story-button');
    this.storyRows = page.getByTestId('story-row');
  }

  async goto(projectId) {
    await this.page.goto(`/projects/${projectId}`);
    await expect(this.addStoryButton).toBeVisible();
  }

  async rename(name, description) {
    await this.editButton.click();
    const dialog = this.page.getByRole('dialog', { name: 'Edit project' });
    await dialog.getByTestId('project-name-input').fill(name);
    if (description !== undefined)
      await dialog.getByTestId('project-description-input').fill(description);
    await dialog.getByTestId('project-save').click();
    await expect(dialog).toBeHidden();
  }

  async deleteProject() {
    await this.deleteButton.click();
    await this.page.getByTestId('confirm-delete').click();
  }

  async addStory({ title, description, acceptanceCriteria = '' }) {
    await this.addStoryButton.click();
    const dialog = this.page.getByRole('dialog', { name: 'Add user story' });
    await dialog.getByTestId('story-title-input').fill(title);
    await dialog.getByTestId('story-description-input').fill(description);
    await dialog.getByTestId('story-criteria-input').fill(acceptanceCriteria);
    await dialog.getByTestId('story-save').click();
    await expect(dialog).toBeHidden();
  }

  storyRow(title) {
    return this.storyRows.filter({
      has: this.page.getByTestId('story-title').getByText(title, { exact: true }),
    });
  }
}
