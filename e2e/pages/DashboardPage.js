import { expect } from '@playwright/test';

export class DashboardPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.stats = {
      projects: page.getByTestId('stat-projects'),
      stories: page.getByTestId('stat-stories'),
      testCases: page.getByTestId('stat-test-cases'),
    };
    this.typeChart = page.getByTestId('chart-type');
    this.priorityChart = page.getByTestId('chart-priority');
    this.recentRuns = page.getByTestId('recent-runs');
    this.newProjectButton = page.getByTestId('new-project-button');
    this.projectCards = page.getByTestId('project-card');
    this.navUser = page.getByTestId('nav-user');
    this.logoutButton = page.getByTestId('nav-logout');
  }

  async goto() {
    await this.page.goto('/');
    await this.expectLoaded();
  }

  async expectLoaded() {
    await expect(this.stats.projects).toBeVisible();
  }

  projectCard(name) {
    return this.projectCards.filter({
      has: this.page.getByTestId('project-title').getByText(name, { exact: true }),
    });
  }

  async createProject(name, description = '') {
    await this.newProjectButton.click();
    const dialog = this.page.getByRole('dialog', { name: 'New project' });
    await dialog.getByTestId('project-name-input').fill(name);
    await dialog.getByTestId('project-description-input').fill(description);
    await dialog.getByTestId('project-save').click();
    await expect(dialog).toBeHidden();
  }

  async openProject(name) {
    await this.projectCard(name).click();
  }

  /** The chart's text legend shows the value for each key. */
  chartValue(chart, key) {
    return chart.locator(`[data-key="${key}"]`);
  }

  async logout() {
    await this.logoutButton.click();
  }
}
