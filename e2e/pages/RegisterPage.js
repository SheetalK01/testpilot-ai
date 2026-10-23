import { expect } from '@playwright/test';

export class RegisterPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.name = page.getByTestId('register-name');
    this.email = page.getByTestId('register-email');
    this.password = page.getByTestId('register-password');
    this.submit = page.getByTestId('register-submit');
    this.error = page.getByTestId('auth-error');
  }

  async goto() {
    await this.page.goto('/register');
    await expect(this.name).toBeVisible();
  }

  async register({ name, email, password }) {
    await this.name.fill(name);
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
