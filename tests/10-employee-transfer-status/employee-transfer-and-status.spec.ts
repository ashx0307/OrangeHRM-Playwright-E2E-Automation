import { test, expect } from '../../src/fixtures';
import { randomEmployee } from '../../src/utils/random';

/**
 * Workflow 10 — Employee Transfer & Status Change (PIM > Job tab).
 *
 * Covers two roadmap items on one form since they're the same page and
 * differ only in which field is asserted: transferring an employee to a
 * different Job Title/Sub Unit, and changing their Employment Status.
 * "Employment Status" here is confirmed to be an employment *type*
 * (Freelance, Full-Time/Part-Time Contract/Permanent/Probation) rather than
 * an Active/Terminated lifecycle state — a probation-to-permanent
 * conversion is the real, common scenario it supports. A separate
 * "Termination" workflow isn't included: OrangeHRM has no such action
 * distinct from deleting the record outright, which Workflow 5
 * (Offboarding) already covers.
 */
test.describe('Workflow 10 — Employee Transfer & Status Change', () => {
  test('Admin transfers an employee to a new Job Title and Sub Unit', async ({ addEmployeePage, jobDetailsPage }) => {
    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);
    const employeeId = addEmployeePage.currentEmployeeIdFromUrl();

    await jobDetailsPage.open(employeeId);
    const newJobTitle = await jobDetailsPage.changeJobTitle();
    const newSubUnit = await jobDetailsPage.changeSubUnit();
    await jobDetailsPage.save();

    // Re-open fresh to confirm the transfer persisted server-side.
    await jobDetailsPage.open(employeeId);
    await expect(jobDetailsPage.dropdownByLabel('Job Title')).toHaveText(newJobTitle);
    await expect(jobDetailsPage.dropdownByLabel('Sub Unit')).toHaveText(newSubUnit);
  });

  test("Admin converts an employee's status from Probation to Permanent", async ({ addEmployeePage, jobDetailsPage }) => {
    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);
    const employeeId = addEmployeePage.currentEmployeeIdFromUrl();

    await jobDetailsPage.open(employeeId);
    await jobDetailsPage.changeEmploymentStatus('Full-Time Probation');
    await jobDetailsPage.save();

    await jobDetailsPage.open(employeeId);
    expect(await jobDetailsPage.currentEmploymentStatus()).toBe('Full-Time Probation');

    await jobDetailsPage.changeEmploymentStatus('Full-Time Permanent');
    await jobDetailsPage.save();

    await jobDetailsPage.open(employeeId);
    expect(await jobDetailsPage.currentEmploymentStatus()).toBe('Full-Time Permanent');
  });
});
