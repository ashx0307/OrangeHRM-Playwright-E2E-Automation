import path from 'path';
import { test } from '../../src/fixtures';
import { randomEmployee } from '../../src/utils/random';

const SAMPLE_DOCUMENT = path.join(__dirname, '..', '..', 'test-assets', 'sample-resume.txt');

/**
 * Workflow 12 — Employee Document Management (Attachments).
 * OrangeHRM has no dedicated top-level "Attachments" tab — confirmed live —
 * it's a widget embedded at the bottom of Personal Details (and reused on
 * other sub-pages like Emergency Contacts). This is a distinct file-upload
 * surface from Workflows 11/12's photo/résumé uploads: a different form,
 * with its own Comment field and its own delete action.
 */
test.describe('Workflow 12 — Employee Document Attachments', () => {
  test('Admin uploads a document to an employee record, then deletes it', async ({
    addEmployeePage,
    personalDetailsPage,
  }) => {
    const employee = randomEmployee();
    await addEmployeePage.addEmployee(employee);
    const employeeId = addEmployeePage.currentEmployeeIdFromUrl();

    await personalDetailsPage.open(employeeId);
    await personalDetailsPage.uploadAttachment(SAMPLE_DOCUMENT, 'Uploaded by Workflow 17');
    await personalDetailsPage.expectAttachmentListed('sample-resume.txt');

    await personalDetailsPage.deleteAttachment('sample-resume.txt');
  });
});
