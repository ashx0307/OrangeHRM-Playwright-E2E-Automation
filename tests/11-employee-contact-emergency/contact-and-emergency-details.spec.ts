import { test, expect } from '../../src/fixtures';
import { randomEmployee, randomAddress, randomEmergencyContact } from '../../src/utils/random';

/**
 * Workflow 11 — Employee Personal Information Update: Contact Details &
 * Emergency Contacts. Workflow 4 already updates Personal Details' own
 * fields (Last Name, Nationality) and Workflow 11 covers Gender — this
 * workflow is deliberately scoped to the two tabs neither of those touches:
 * Contact Details (address) and Emergency Contacts, each its own dedicated
 * PIM route (confirmed live — Emergency Contacts is not a widget embedded on
 * Personal Details, unlike Attachments, which genuinely is; see Workflow 17).
 */
test.describe('Workflow 11 — Contact Details & Emergency Contacts', () => {
  test("Admin updates an employee's address on Contact Details", async ({ addEmployeePage, contactDetailsPage }) => {
    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);
    const employeeId = addEmployeePage.currentEmployeeIdFromUrl();

    const address = randomAddress();
    await contactDetailsPage.open(employeeId);
    await contactDetailsPage.updateAddress(address.street1, address.city);

    await contactDetailsPage.open(employeeId);
    expect(await contactDetailsPage.currentStreet1()).toBe(address.street1);
  });

  test('Admin adds an emergency contact for an employee', async ({ addEmployeePage, emergencyContactsPage }) => {
    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);
    const employeeId = addEmployeePage.currentEmployeeIdFromUrl();

    const contact = randomEmergencyContact();
    await emergencyContactsPage.open(employeeId);
    await emergencyContactsPage.addContact(contact.name, contact.relationship, contact.mobile);
    await emergencyContactsPage.expectContactListed(contact.name);
  });
});
