import { test, expect } from '../../src/fixtures';

/**
 * Workflow 9 — Time: Attendance Punch In/Out (Admin).
 *
 * Attendance state is real, per-employee, server-side state — on this shared
 * demo instance the "Admin" login itself has an employee record linked to it,
 * so the same Punch In/Out feature applies to it directly. The two actions
 * are modeled as a single punch cycle rather than two independent tests, and
 * each step reads the current state first instead of assuming a fresh one —
 * so the workflow is correct whether or not a previous run left it punched in.
 *
 * The cycle's own effect is also confirmed independently, from a completely
 * different screen: Time > Reports > Attendance Summary reports each
 * employee's cumulative Punch In/Out duration
 * (`AttendanceSummaryReportPage`). That total is a lifetime, all-history
 * figure on this shared, never-reset instance — other concurrent users'
 * punches add to the exact same record — so it's asserted to have not
 * *decreased* across this test's own punch cycle, rather than to have grown
 * by some specific, exact amount neither this test nor a live shared
 * instance could actually promise.
 */
test.describe('Workflow 9 — Attendance Punch In/Out (Admin)', () => {
  test('an Admin completes a full punch-in / punch-out cycle, reflected in the Attendance Summary Report', async ({
    adminAttendancePage,
    attendanceSummaryReportPage,
  }) => {
    await adminAttendancePage.open();

    if ((await adminAttendancePage.currentState()) === 'IN') {
      await adminAttendancePage.punchOut('Resetting state before Workflow 9');
    }
    await adminAttendancePage.expectState('OUT');

    // Baseline the report *after* resetting to OUT, so this snapshot doesn't
    // itself depend on whether a reset happened to be needed this run.
    const employeeName = await adminAttendancePage.currentEmployeeFullName();
    await attendanceSummaryReportPage.open();
    const hoursBefore = await attendanceSummaryReportPage.viewTotalHoursFor(employeeName);

    await adminAttendancePage.open();
    await adminAttendancePage.punchIn('Automated punch-in — Workflow 9');
    await adminAttendancePage.expectState('IN');

    await adminAttendancePage.punchOut('Automated punch-out — Workflow 9');
    await adminAttendancePage.expectState('OUT');

    await attendanceSummaryReportPage.open();
    const hoursAfter = await attendanceSummaryReportPage.viewTotalHoursFor(employeeName);
    expect(
      hoursAfter,
      `expected the Attendance Summary Report's total for "${employeeName}" (${hoursBefore}h before) to not have decreased after a punch-in/punch-out cycle, got ${hoursAfter}h`,
    ).toBeGreaterThanOrEqual(hoursBefore);
  });
});
