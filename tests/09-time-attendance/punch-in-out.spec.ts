import { test } from '../../src/fixtures';

/**
 * Workflow 9 — Time: Attendance Punch In/Out (Admin).
 *
 * Attendance state is real, per-employee, server-side state — on this shared
 * demo instance the "Admin" login itself has an employee record linked to it,
 * so the same Punch In/Out feature applies to it directly. The two actions
 * are modeled as a single punch cycle rather than two independent tests, and
 * each step reads the current state first instead of assuming a fresh one —
 * so the workflow is correct whether or not a previous run left it punched in.
 */
test.describe('Workflow 9 — Attendance Punch In/Out (Admin)', () => {
  test('an Admin completes a full punch-in / punch-out cycle', async ({ adminAttendancePage }) => {
    await adminAttendancePage.open();

    if ((await adminAttendancePage.currentState()) === 'IN') {
      await adminAttendancePage.punchOut('Resetting state before Workflow 9');
    }
    await adminAttendancePage.expectState('OUT');

    await adminAttendancePage.punchIn('Automated punch-in — Workflow 9');
    await adminAttendancePage.expectState('IN');

    await adminAttendancePage.punchOut('Automated punch-out — Workflow 9');
    await adminAttendancePage.expectState('OUT');
  });
});
