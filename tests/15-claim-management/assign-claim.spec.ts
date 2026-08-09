import { test } from '../../src/fixtures';
import { randomEmployee } from '../../src/utils/random';

/**
 * Workflow 15 — Claim Management (Admin "Assign Claim").
 * The Claim module's own counterpart to Assign Leave: Admin books an expense
 * claim directly on an employee's behalf. It starts "Initiated", and
 * submitting it finalizes straight to "Paid" — no intermediate approval
 * step, confirmed live.
 */
test.describe('Workflow 15 — Claim Management', () => {
  test('Admin assigns a claim to an employee and it is paid immediately on submission', async ({
    addEmployeePage,
    claimPage,
  }) => {
    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);

    await claimPage.assignClaim(employee);

    await claimPage.openList();
    await claimPage.searchByEmployeeName(employee);
    await claimPage.expectStatus(employee.lastName, 'Initiated');

    await claimPage.openDetails(employee.lastName);
    await claimPage.submit();

    await claimPage.openList();
    await claimPage.searchByEmployeeName(employee);
    await claimPage.expectStatus(employee.lastName, 'Paid');
  });
});
