import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { env, authFile } from '../../src/config/env';

/**
 * Runs once (via the `setup-admin` project) before every role-based spec.
 * Logging in here and persisting storageState means every downstream test
 * that needs an Admin session skips the login UI entirely and starts already
 * authenticated — faster, and it isolates "can Admin log in" as its own concern.
 */
setup('authenticate as Admin and persist storage state', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile.admin), { recursive: true });

  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await loginPage.open();
  await loginPage.login(env.adminUsername, env.adminPassword);
  await dashboardPage.expectLoaded();

  await page.context().storageState({ path: authFile.admin });
});
