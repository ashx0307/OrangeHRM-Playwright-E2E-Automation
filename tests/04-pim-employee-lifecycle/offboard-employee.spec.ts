import { test, expect } from '../../src/fixtures';
import { randomEmployee } from '../../src/utils/random';

/**
 * Workflow 4 — PIM: Employee Offboarding.
 * Closes the loop opened by Workflow 3: create an employee, then remove their
 * record from the Employee List and confirm the delete-confirmation modal
 * actually took effect (search no longer finds them).
 */
test.describe('Workflow 4 — PIM Employee Offboarding', () => {
  test('deletes an employee record and it no longer appears in search results', async ({
    addEmployeePage,
    employeeListPage,
  }) => {
    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);

    await employeeListPage.open();
    await employeeListPage.searchByEmployeeName(employee.fullName);
    // The table row renders "First Middle Last" — fullName omits the middle
    // name (to match the autocomplete's own binding), so it wouldn't be a
    // contiguous substring of the row text. lastName alone always is.
    await employeeListPage.expectEmployeeVisible(employee.lastName);

    await employeeListPage.deleteEmployee(employee.lastName);

    // Re-searching by name here doesn't work: "Employee Name" is an
    // autocomplete that requires selecting a real matching suggestion, and a
    // just-deleted employee has none to select — selectAutocompleteOption
    // would fail by design, not because deletion didn't take effect. The
    // already-filtered table updates in place, so just confirm the row is gone.
    await expect(employeeListPage.rowByName(employee.lastName)).toHaveCount(0);
  });
});
