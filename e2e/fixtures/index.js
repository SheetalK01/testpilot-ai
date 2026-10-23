import { test as base, expect, request as playwrightRequest } from '@playwright/test';
import { API_URL } from '../playwright.config.js';
import { ApiClient } from '../helpers/api.js';
import { newUser } from '../helpers/data.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { ProjectPage } from '../pages/ProjectPage.js';
import { RegisterPage } from '../pages/RegisterPage.js';
import { StoryPage } from '../pages/StoryPage.js';

/**
 * Custom fixtures:
 * - api:        anonymous API client pointed at the backend
 * - user:       a freshly registered user (unique email) with its JWT
 * - userApi:    API client authenticated as `user`
 * - authedPage: a page already logged in as `user` (token injected, no UI login needed)
 * - page objects for every screen
 */
export const test = base.extend({
  apiContext: async ({}, use) => {
    const context = await playwrightRequest.newContext({ baseURL: API_URL });
    await use(context);
    await context.dispose();
  },
  api: async ({ apiContext }, use) => {
    await use(new ApiClient(apiContext));
  },
  user: async ({ api }, use) => {
    await use(await api.register(newUser()));
  },
  userApi: async ({ api, user }, use) => {
    await use(api.withToken(user.token));
  },
  authedPage: async ({ page, user }, use) => {
    // Inject the token once per tab; later reloads keep whatever the app did (e.g. logging out).
    await page.addInitScript((token) => {
      if (!sessionStorage.getItem('tp_token_injected')) {
        localStorage.setItem('tp_token', token);
        sessionStorage.setItem('tp_token_injected', 'true');
      }
    }, user.token);
    await use(page);
  },
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  projectPage: async ({ page }, use) => use(new ProjectPage(page)),
  storyPage: async ({ page }, use) => use(new StoryPage(page)),
});

export { expect };
