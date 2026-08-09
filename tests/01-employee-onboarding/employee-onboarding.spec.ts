import path from 'path';
import { test } from '../../src/fixtures';
import { randomEmployee, randomSystemUser } from '../../src/utils/random';

const SAMPLE_PHOTO = path.join(__dirname, '..', '..', 'test-assets', 'sample-photo.png');

/**
 * Workflow 1 — Complete Employee Onboarding.
 */

test.describe('Workflow 1 — Complete Employee Onboarding', () => {
  test('Admin onboards a new hire end-to-end: record, photo, gender, and login credentials', async ({
    addEmployeePage,
    personalDetailsPage,
    employeeListPage,
    adminUserPage,
  }) => {
    const employee = randomEmployee();

    // Add Employee
    await addEmployeePage.open();
    await addEmployeePage.fillEmployeeName(employee);
    await addEmployeePage.uploadPhoto(SAMPLE_PHOTO);
    await addEmployeePage.save();
    await addEmployeePage.expectOnPersonalDetailsPage();
    const employeeId = addEmployeePage.currentEmployeeIdFromUrl();

    await personalDetailsPage.open(employeeId);
    await personalDetailsPage.setGender('Female');

    // Create Login Credentials, tied to the employee just onboarded.
    const user = randomSystemUser(employee.fullName);
    await adminUserPage.open();
    await adminUserPage.addUser({
      role: 'Admin',
      employeeName: employee.fullName,
      status: 'Enabled',
      username: user.username,
      password: user.password,
    });

    // Verify from both angles: the HR record and the login account.
    await employeeListPage.open();
    await employeeListPage.searchByEmployeeName(employee.fullName);
    await employeeListPage.expectEmployeeVisible(employee.lastName);

    await adminUserPage.open();
    await adminUserPage.searchByUsername(user.username);
    await adminUserPage.expectUserVisible(user.username);
  });
});
