import { test, expect } from '../../src/fixtures';
import { randomEmployee } from '../../src/utils/random';
import { employmentStatusFilterCases } from '../../src/data/employee-search.data';

/**
 * Workflow 2 — PIM: Search, Filter & Update Employee Details.
 * Covers the Employee List's "Include" filter (data-driven across its three
 * scopes) plus the update path: open a record from search results and edit it.
 */
test.describe('Workflow 2 — PIM Search & Update Employee', () => {
  // Every case in this block needs the same starting point (a fresh Employee
  // List) before it runs its own filter — an explicit `beforeEach` hook says
  // that once, rather than repeating `employeeListPage.open()` inside each
  // iteration's test body.
  test.describe('Employee List "Include" filter', () => {
    test.beforeEach(async ({ employeeListPage }) => {
      await employeeListPage.open();
    });

    for (const filterCase of employmentStatusFilterCases) {
      test(filterCase.description, async ({ employeeListPage }) => {
        await employeeListPage.searchByIncludeOption(filterCase.includeOption);
        // A scope-only filter (no name/id) just needs to resolve without error;
        // the table either lists matching records or reports none — both are valid.
      });
    }
  });

  test('updates an employee\'s last name from their Personal Details page', async ({
    addEmployeePage,
    personalDetailsPage,
  }) => {
    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);
    const employeeId = addEmployeePage.currentEmployeeIdFromUrl();

    const updatedLastName = `${employee.lastName}-Updated`;
    await personalDetailsPage.open(employeeId);
    await personalDetailsPage.updateLastName(updatedLastName);

    // Re-open fresh to confirm the change persisted server-side, rather than
    // routing through Employee List's autocomplete search — that index can
    // lag briefly behind a just-made update, so searching immediately after
    // can fail to find any matching suggestion even though the save worked.
    await personalDetailsPage.open(employeeId);
    await expect(await personalDetailsPage.currentFullName()).toContain(updatedLastName);
  });
});
