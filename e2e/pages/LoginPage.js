import { expect } from '@playwright/test';

export class LoginPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.email = page.getByTestId('login-email');
    this.password = page.getByTestId('login-password');
    this.submit = page.getByTestId('login-submit');
    this.error = page.getByTestId('auth-error');
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.email).toBeVisible();
  }

  async login(email, password) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async expectError(message) {
    await expect(this.error).toContainText(message);
  }
}
