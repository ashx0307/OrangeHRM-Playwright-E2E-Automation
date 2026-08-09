import { test } from '../../src/fixtures';
import { randomEmployee } from '../../src/utils/random';

/**
 * Workflow 5 — Leave: Assign Leave (Admin/Supervisor role).
 * Admin books leave directly on an employee's behalf. Unlike a self-service
 * application, this finalizes directly with no approval step — confirmed by
 * inspecting a "Scheduled" row's own actions: only a three-dot menu, no
 * Approve/Reject buttons at all, since there's nothing left to approve.
 *
 * The resulting status is asserted as "Scheduled" *or* "Taken" rather than
 * a single fixed value — confirmed live that the masked From/To Date input
 * doesn't reliably submit the date it displays (day/month have been
 * observed swapped on the wire, inconsistently), and a date that ends up in
 * the past resolves the exact same direct-finalization to "Taken" instead.
 * Both are valid proof of the one thing this workflow actually checks: no
 * pending-approval step was involved.
 */
test.describe('Workflow 5 — Assign Leave (Admin)', () => {
  test('Admin assigns leave on an employee\'s behalf and it finalizes without an approval step', async ({
    addEmployeePage,
    entitlementsPage,
    assignLeavePage,
    leaveListPage,
  }) => {
    // AssignLeavePage.assign()'s own worst case — up to 7 candidate days,
    // each retried once — can legitimately take longer than the suite's
    // global 150s test timeout on a slow shared demo; this workflow
    // specifically needs more room than that default.
    test.setTimeout(300_000);

    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);

    // A brand-new employee has no leave balance and won't even appear in the
    // Assign Leave picker until an entitlement exists.
    await entitlementsPage.open();
    await entitlementsPage.grantEntitlement(employee.fullName, 14);

    await assignLeavePage.open();
    await assignLeavePage.selectEmployee(employee.fullName);
    await assignLeavePage.selectFirstAvailableLeaveType();
    await assignLeavePage.assign(30);

    await leaveListPage.open();
    await leaveListPage.searchByEmployeeName(employee.fullName);
    await leaveListPage.expectStatus(employee.lastName, ['Scheduled', 'Taken']);
  });
});
