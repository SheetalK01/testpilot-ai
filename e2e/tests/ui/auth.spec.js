import { expect, test } from '../../fixtures/index.js';
import { newUser, PASSWORD } from '../../helpers/data.js';

test.describe('Authentication', { tag: '@regression' }, () => {
  test(
    'register lands on the dashboard',
    { tag: '@smoke' },
    async ({ page, registerPage, dashboardPage }) => {
      const user = newUser({ name: 'Grace Hopper' });
      await registerPage.goto();
      await registerPage.register(user);

      await expect(page).toHaveURL('/');
      await dashboardPage.expectLoaded();
      await expect(dashboardPage.navUser).toContainText('Grace Hopper');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Grace');
      await expect(dashboardPage.stats.projects).toHaveText('0');
    },
  );

  test(
    'login with valid credentials',
    { tag: '@smoke' },
    async ({ page, user, loginPage, dashboardPage }) => {
      await loginPage.goto();
      await loginPage.login(user.email, user.password);

      await expect(page).toHaveURL('/');
      await expect(dashboardPage.navUser).toContainText(user.name);
    },
  );

  test('logout returns to the landing page and clears the session', async ({
    page,
    authedPage,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.logout();

    await expect(page.getByTestId('landing-cta')).toBeVisible();
    expect(await authedPage.evaluate(() => localStorage.getItem('tp_token'))).toBeNull();
    await page.goto('/projects/1');
    await expect(page).toHaveURL('/login');
  });

  test('wrong password shows an error and stays on login', async ({ page, user, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(user.email, 'WrongPassword1');

    await loginPage.expectError('Invalid email or password');
    await expect(page).toHaveURL('/login');
  });

  test('protected route redirects to login, then back after logging in', async ({
    page,
    user,
    loginPage,
  }) => {
    await page.goto('/projects/123');
    await expect(page).toHaveURL('/login');

    await loginPage.login(user.email, PASSWORD);
    await expect(page).toHaveURL('/projects/123');
    await expect(page.getByText("This project doesn't exist")).toBeVisible();
  });

  test('register shows inline validation before calling the API', async ({
    page,
    registerPage,
  }) => {
    let apiCalled = false;
    await page.route('**/api/auth/register', (route) => {
      apiCalled = true;
      return route.continue();
    });
    await registerPage.goto();
    await registerPage.register({ name: 'A', email: 'not-an-email', password: 'short' });

    await expect(page.getByText('Enter at least 2 characters')).toBeVisible();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByText('Use at least 8 characters')).toBeVisible();
    await expect(registerPage.email).toHaveAttribute('aria-invalid', 'true');
    expect(apiCalled).toBe(false);
  });

  test('registering an existing email shows the server error', async ({ user, registerPage }) => {
    await registerPage.goto();
    await registerPage.register({ name: 'Someone', email: user.email, password: PASSWORD });

    await expect(registerPage.error).toContainText('Email is already registered');
  });

  test('show/hide password toggles the input type', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.password.fill('Secret123');
    await expect(loginPage.password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(loginPage.password).toHaveAttribute('type', 'text');
  });

  test('an expired session sends the user back to login', async ({
    page,
    authedPage,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await authedPage.evaluate(() => localStorage.setItem('tp_token', 'tampered.token.value'));
    await page.reload();

    // The API answers 401: the app drops the token and asks the user to log in again.
    await expect(page).toHaveURL('/login');
    expect(await authedPage.evaluate(() => localStorage.getItem('tp_token'))).toBeNull();
  });
});
