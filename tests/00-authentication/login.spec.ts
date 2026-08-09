import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { invalidLoginCases } from '../../src/data/invalid-login.data';

/**
 * Workflow 1 — Authentication & Access Control.
 * The gateway workflow every other one depends on: valid login, session-backed
 * logout, and a data-driven sweep of invalid-credential/required-field cases.
 */
test.describe('Workflow 1 — Authentication', () => {
  test('logs in with valid Admin credentials and reaches the Dashboard', async ({ loginPage, dashboardPage }) => {
    await loginPage.open();
    await loginPage.login(env.adminUsername, env.adminPassword);
    await dashboardPage.expectLoaded();
  });

  test('logs out and is returned to the login page', async ({ loginPage, dashboardPage, page }) => {
    await loginPage.open();
    await loginPage.login(env.adminUsername, env.adminPassword);
    await dashboardPage.expectLoaded();

    await dashboardPage.logout();
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('forgot password link opens the reset-password flow', async ({ loginPage, page }) => {
    await loginPage.open();
    await loginPage.goToForgotPassword();
    await expect(page).toHaveURL(/requestPasswordResetCode/);
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
  });

  for (const testCase of invalidLoginCases) {
    test(`rejects login: ${testCase.description}`, async ({ loginPage }) => {
      await loginPage.open();
      await loginPage.login(testCase.username, testCase.password);

      if (testCase.expected === 'invalid-credentials') {
        await loginPage.expectLoginError();
      } else if (testCase.expected === 'required-both') {
        await loginPage.expectRequiredFieldErrors(2);
      } else {
        await loginPage.expectRequiredFieldErrors(1);
      }
    });
  }
});
