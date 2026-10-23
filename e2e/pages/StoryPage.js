import { expect } from '@playwright/test';

export class StoryPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.generateButton = page.getByTestId('generate-button');
    this.generatingIndicator = page.getByTestId('generating-indicator');
    this.generationError = page.getByTestId('generation-error');
    this.rows = page.getByTestId('test-case-row');
    this.addTestCaseButton = page.getByTestId('add-test-case-button');
    this.exportButton = page.getByTestId('export-button');
    this.playwrightButton = page.getByTestId('playwright-button');
    this.playwrightScript = page.getByTestId('playwright-script');
    this.copyScriptButton = page.getByTestId('copy-script');
    this.editStoryButton = page.getByTestId('story-edit');
    this.deleteStoryButton = page.getByTestId('story-delete');
  }

  async goto(storyId) {
    await this.page.goto(`/stories/${storyId}`);
    await expect(this.generateButton).toBeVisible();
  }

  /** Clicks Generate, checks the loading animation appears, and waits for the result. */
  async generate(expectedCount) {
    await this.generateButton.click();
    await expect(this.generatingIndicator).toBeVisible();
    await expect(this.generatingIndicator).toBeHidden({ timeout: 30_000 });
    if (expectedCount !== undefined) await expect(this.rows).toHaveCount(expectedCount);
  }

  filter(type) {
    return this.page.getByTestId(`type-filter-${type}`);
  }

  row(title) {
    return this.rows.filter({
      has: this.page.getByTestId('test-case-title').getByText(title, { exact: true }),
    });
  }

  titles() {
    return this.rows.getByTestId('test-case-title');
  }

  async fillTestCaseForm(dialog, { title, type, priority, preconditions, steps, expectedResult }) {
    if (title !== undefined) await dialog.getByTestId('tc-title-input').fill(title);
    if (type) await dialog.getByTestId('tc-type-select').selectOption(type);
    if (priority) await dialog.getByTestId('tc-priority-select').selectOption(priority);
    if (preconditions !== undefined)
      await dialog.getByTestId('tc-preconditions-input').fill(preconditions);
    if (steps) await dialog.getByTestId('tc-steps-input').fill(steps.join('\n'));
    if (expectedResult !== undefined)
      await dialog.getByTestId('tc-expected-input').fill(expectedResult);
  }

  async addTestCase(testCase) {
    await this.addTestCaseButton.click();
    const dialog = this.page.getByRole('dialog', { name: 'Add test case' });
    await this.fillTestCaseForm(dialog, testCase);
    await dialog.getByTestId('tc-save').click();
    await expect(dialog).toBeHidden();
  }

  async editTestCase(row, changes) {
    await row.getByTestId('test-case-edit').click();
    const dialog = this.page.getByRole('dialog', { name: 'Edit test case' });
    await this.fillTestCaseForm(dialog, changes);
    await dialog.getByTestId('tc-save').click();
    await expect(dialog).toBeHidden();
  }

  async deleteTestCase(row) {
    await row.getByTestId('test-case-delete').click();
    await this.page.getByTestId('confirm-delete').click();
  }

  async exportExcel() {
    const download = this.page.waitForEvent('download');
    await this.exportButton.click();
    return download;
  }

  async generatePlaywright() {
    await this.playwrightButton.click();
    await expect(this.playwrightScript).toBeVisible();
  }
}
