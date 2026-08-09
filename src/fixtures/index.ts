import { test as base, expect, Page } from '@playwright/test';
import { authFile, env } from '../config/env';

import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DirectoryPage } from '../pages/DirectoryPage';
import { AdminUserPage } from '../pages/admin/AdminUserPage';
import { JobTitlePage } from '../pages/admin/JobTitlePage';
import { AddEmployeePage } from '../pages/pim/AddEmployeePage';
import { EmployeeListPage } from '../pages/pim/EmployeeListPage';
import { PersonalDetailsPage } from '../pages/pim/PersonalDetailsPage';
import { ContactDetailsPage } from '../pages/pim/ContactDetailsPage';
import { JobDetailsPage } from '../pages/pim/JobDetailsPage';
import { EmergencyContactsPage } from '../pages/pim/EmergencyContactsPage';
import { AssignLeavePage } from '../pages/leave/AssignLeavePage';
import { LeaveListPage } from '../pages/leave/LeaveListPage';
import { EntitlementsPage } from '../pages/leave/EntitlementsPage';
import { AttendancePage } from '../pages/time/AttendancePage';
import { RecruitmentPage } from '../pages/recruitment/RecruitmentPage';
import { VacancyPage } from '../pages/recruitment/VacancyPage';
import { ClaimPage } from '../pages/claim/ClaimPage';

interface Fixtures {
  // --- Role-scoped, pre-authenticated browser page (storageState from tests/00-setup) ---
  adminPage: Page;

  // --- Unauthenticated flow: bound to Playwright's default `page`, used by login/logout specs ---
  loginPage: LoginPage;
  dashboardPage: DashboardPage;

  // --- Admin-role page objects, bound to `adminPage` ---
  adminUserPage: AdminUserPage;
  jobTitlePage: JobTitlePage;
  addEmployeePage: AddEmployeePage;
  employeeListPage: EmployeeListPage;
  personalDetailsPage: PersonalDetailsPage;
  contactDetailsPage: ContactDetailsPage;
  jobDetailsPage: JobDetailsPage;
  emergencyContactsPage: EmergencyContactsPage;
  assignLeavePage: AssignLeavePage;
  leaveListPage: LeaveListPage;
  entitlementsPage: EntitlementsPage;
  recruitmentPage: RecruitmentPage;
  vacancyPage: VacancyPage;
  adminAttendancePage: AttendancePage;
  directoryPage: DirectoryPage;
  claimPage: ClaimPage;
}

/**
 * The storageState captured once in 00-setup can outlive the server-side
 * session by the time a test late in a long suite run gets to it (this demo
 * instance is shared and can be slow, and retries around collisions add up) —
 * that shows up as the page silently redirecting to /auth/login. Detect that
 * and log back in rather than let every downstream action fail confusingly.
 *
 * This also guarantees every `adminPage` consumer starts already on the
 * Dashboard — page objects like `DashboardPage` have no `open()` of their own
 * and rely on that being true.
 */
async function ensureSession(page: Page, username: string, password: string) {
  await page.goto(`${env.baseUrl}/dashboard/index`);
  if (page.url().includes('/auth/login')) {
    const loginPage = new LoginPage(page);
    await loginPage.login(username, password);
    await page.waitForURL(/dashboard\/index/);
  }
}

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: authFile.admin });
    const page = await context.newPage();
    await ensureSession(page, env.adminUsername, env.adminPassword);
    await use(page);
    await context.close();
  },

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),

  adminUserPage: async ({ adminPage }, use) => use(new AdminUserPage(adminPage)),
  jobTitlePage: async ({ adminPage }, use) => use(new JobTitlePage(adminPage)),
  addEmployeePage: async ({ adminPage }, use) => use(new AddEmployeePage(adminPage)),
  employeeListPage: async ({ adminPage }, use) => use(new EmployeeListPage(adminPage)),
  personalDetailsPage: async ({ adminPage }, use) => use(new PersonalDetailsPage(adminPage)),
  contactDetailsPage: async ({ adminPage }, use) => use(new ContactDetailsPage(adminPage)),
  jobDetailsPage: async ({ adminPage }, use) => use(new JobDetailsPage(adminPage)),
  emergencyContactsPage: async ({ adminPage }, use) => use(new EmergencyContactsPage(adminPage)),
  assignLeavePage: async ({ adminPage }, use) => use(new AssignLeavePage(adminPage)),
  leaveListPage: async ({ adminPage }, use) => use(new LeaveListPage(adminPage)),
  entitlementsPage: async ({ adminPage }, use) => use(new EntitlementsPage(adminPage)),
  recruitmentPage: async ({ adminPage }, use) => use(new RecruitmentPage(adminPage)),
  vacancyPage: async ({ adminPage }, use) => use(new VacancyPage(adminPage)),
  adminAttendancePage: async ({ adminPage }, use) => use(new AttendancePage(adminPage)),
  directoryPage: async ({ adminPage }, use) => use(new DirectoryPage(adminPage)),
  claimPage: async ({ adminPage }, use) => use(new ClaimPage(adminPage)),
});

export { expect };
