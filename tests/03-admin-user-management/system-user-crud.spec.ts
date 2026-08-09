import { test, expect } from '../../src/fixtures';
import { systemUserRoleCases } from '../../src/data/system-user-roles.data';
import { randomEmployee, randomSystemUser } from '../../src/utils/random';

/**
 * Workflow 3 — Admin User Management (System Users).
 * Covers the full CRUD loop for platform accounts and, via `systemUserRoleCases`,
 * both platform roles a system user can hold (Admin vs ESS) — the same role
 * split that the rest of the suite's role-based tests rely on.
 */
test.describe('Workflow 3 — Admin User Management', () => {
  for (const roleCase of systemUserRoleCases) {
    test(`creates, finds and deletes a system user — ${roleCase.description}`, async ({
      adminUserPage,
      addEmployeePage,
    }) => {
      // Every system user — Admin or ESS — must be linked to an employee record.
      const employee = randomEmployee();
      await addEmployeePage.addEmployee(employee);

      const user = randomSystemUser(employee.fullName);

      await adminUserPage.open();
      await adminUserPage.addUser({
        role: roleCase.role,
        employeeName: employee.fullName,
        status: roleCase.status,
        username: user.username,
        password: user.password,
      });

      await adminUserPage.searchByUsername(user.username);
      await adminUserPage.expectUserVisible(user.username);

      await adminUserPage.deleteUser(user.username);
      await adminUserPage.searchByUsername(user.username);
      await adminUserPage.expectNoRecordsFound();
    });
  }

  test('search with a non-existent username returns no records', async ({ adminUserPage }) => {
    await adminUserPage.open();
    await adminUserPage.searchByUsername('no_such_user_xyz_123');
    await adminUserPage.expectNoRecordsFound();
  });

  /**
   * Covers the "Disable User" / "Enable User" half of User Administration
   * that creating-then-deleting a user (above) never exercises: editing an
   * *existing* account's Status via its own row's pencil icon, rather than
   * setting it once at creation time.
   */
  test('Admin disables then re-enables an existing system user', async ({ adminUserPage, addEmployeePage }) => {
    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);
    const user = randomSystemUser(employee.fullName);

    await adminUserPage.open();
    await adminUserPage.addUser({
      role: 'Admin',
      employeeName: employee.fullName,
      status: 'Enabled',
      username: user.username,
      password: user.password,
    });

    await adminUserPage.editUser(user.username);
    await adminUserPage.setStatus('Disabled');
    await adminUserPage.editUser(user.username);
    expect(await adminUserPage.currentStatus()).toBe('Disabled');

    await adminUserPage.setStatus('Enabled');
    await adminUserPage.editUser(user.username);
    expect(await adminUserPage.currentStatus()).toBe('Enabled');
  });

  /**
   * `page.route()` network mocking, UI-only: the real
   * `GET /api/v2/admin/users` call is intercepted and replaced with a
   * fulfilled 500 before it ever reaches OrangeHRM's server — this is testing
   * how the *UI* degrades on a failed API call, not the API itself. Confirmed
   * live beforehand: on a 500 here, the table falls back to its normal empty
   * state and the app surfaces the failure via its own toast component,
   * rather than showing stale data or a blank/broken page.
   */
  test('System Users list shows an empty state and an error toast when its API call fails', async ({
    adminUserPage,
    adminPage,
  }) => {
    await adminPage.route('**/api/v2/admin/users**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'mocked failure' } }),
      }),
    );

    await adminUserPage.open();

    await adminUserPage.expectNoRecordsFound();
    await adminUserPage.expectToast('mocked failure');
  });
});
