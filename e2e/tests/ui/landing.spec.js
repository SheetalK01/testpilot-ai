import { expect, test } from '../../fixtures/index.js';

test.describe('Landing page', { tag: '@regression' }, () => {
  test('shows the pitch and the CTA goes to register', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Turn user stories into test cases in seconds.',
    );
    await page.getByTestId('landing-cta').click();
    await expect(page).toHaveURL('/register');
  });

  test('"See how it works" jumps to the steps section', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'See how it works' }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(
      page.getByRole('heading', { name: 'Three steps to better coverage' }),
    ).toBeInViewport();
  });

  test('lists the four features and links to the author', async ({ page }) => {
    await page.goto('/');
    for (const feature of [
      'AI test generation',
      'Playwright export',
      'Excel export',
      'Dashboard',
    ]) {
      await expect(page.getByRole('heading', { name: feature, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/SheetalK01',
    );
    await expect(page.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/sheetal-khadanga',
    );
  });

  test('theme toggle switches to dark mode and remembers it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('unknown routes show the 404 page', async ({ page }) => {
    await page.goto('/this/does/not/exist');
    await expect(page.getByRole('heading', { name: 'This page took a wrong turn' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to home' }).click();
    await expect(page).toHaveURL('/');
  });
});
