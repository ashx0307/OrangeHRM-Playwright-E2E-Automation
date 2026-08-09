import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class PersonalDetailsPage extends BasePage {
  private readonly firstNameInput = this.page.locator('input[name="firstName"]');
  private readonly middleNameInput = this.page.locator('input[name="middleName"]');
  private readonly lastNameInput = this.page.locator('input[name="lastName"]');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' }).first();
  // Gender is the only radio-button field on this page — rendered as two
  // plain `input[type="radio"]` with value="1" (Male) / value="2" (Female),
  // no accessible name of their own, so they're matched by that value.
  private readonly maleRadio = this.page.locator('input[type="radio"][value="1"]');
  private readonly femaleRadio = this.page.locator('input[type="radio"][value="2"]');

  constructor(page: Page) {
    super(page);
  }

  async open(employeeId: string) {
    await this.goto(`/pim/viewPersonalDetails/empNumber/${employeeId}`);
    // The form shell (empty inputs) renders before the employee's own data
    // has actually loaded — waiting for the field to merely be present isn't
    // enough, a read right after can still see it empty.
    await expect(this.firstNameInput).not.toHaveValue('');
  }

  async updateLastName(lastName: string) {
    await this.lastNameInput.fill(lastName);
    await this.saveButton.click();
    await this.expectToast('Successfully Updated');
  }

  async updateNationality(nationality: string) {
    await this.selectDropdownOption(this.dropdownByLabel('Nationality'), nationality);
    await this.saveButton.click();
    await this.expectToast('Successfully Updated');
  }

  async currentFullName(): Promise<string> {
    const first = await this.firstNameInput.inputValue();
    const last = await this.lastNameInput.inputValue();
    return `${first} ${last}`;
  }

  async setGender(gender: 'Male' | 'Female') {
    const radio = gender === 'Male' ? this.maleRadio : this.femaleRadio;
    // `.check()` on the raw `<input>` reports success (it does dispatch a
    // click) but doesn't actually flip the app's state — Vue's click handler
    // is bound to the wrapping `<label>`, not the input itself. Clicking that
    // label is what a real user's click on the visible radio actually hits.
    await radio.locator('xpath=ancestor::label').first().click();
    await expect(radio).toBeChecked();
    await this.saveButton.click();
    await this.expectToast('Successfully Updated');
  }

  async currentGender(): Promise<'Male' | 'Female'> {
    return (await this.maleRadio.isChecked()) ? 'Male' : 'Female';
  }

  // The "Attachments" widget is embedded at the bottom of this page (and
  // reused the same way on other tabs, e.g. Emergency Contacts) — confirmed
  // live it has no dedicated top-level route of its own. Its "Add" button is
  // reached by walking forward from its own section heading, since a bare
  // `getByRole('button', { name: 'Add' })` would also match Personal
  // Details' *own* form having nothing to do with attachments elsewhere on
  // the page.
  private readonly attachmentsAddButton = this.page
    .locator('h6', { hasText: 'Attachments' })
    .locator('xpath=following::button[1]');

  async uploadAttachment(filePath: string, comment: string) {
    await this.attachmentsAddButton.click();
    // The only file input visible once this dialog is open — Personal
    // Details' own form further up the page has none of its own.
    await this.page.locator('input[type="file"]').setInputFiles(filePath);
    // This dialog's own title ("Add Attachment") sits as a sibling right
    // before the `<form>` it belongs to — scoping the Comment field and the
    // Save click to that specific form is what actually disambiguates them
    // from Personal Details' own same-labelled/same-`type="submit"` Save
    // button elsewhere on the page (confirmed live: a bare page-wide
    // `button[type="submit"]` filtered by "Save" resolves to multiple
    // elements, a strict-mode violation).
    const dialogForm = this.page.locator('h6', { hasText: 'Add Attachment' }).locator('xpath=following-sibling::form[1]');
    const commentField = dialogForm
      .locator('.oxd-input-group')
      .filter({ has: this.page.locator('label.oxd-label', { hasText: 'Comment' }) })
      .locator('input, textarea');
    await commentField.fill(comment);
    await dialogForm.locator('button[type="submit"]').click();
    await this.expectToast('Successfully Saved');
  }

  async expectAttachmentListed(fileName: string) {
    await expect(this.page.getByText(fileName)).toBeVisible();
  }

  async deleteAttachment(fileName: string) {
    const row = this.page.locator('.oxd-table-card, .orangehrm-attachment-row').filter({ hasText: fileName });
    await row.locator('.bi-trash').click();
    await this.page.getByRole('button', { name: 'Yes, Delete' }).click();
    await this.expectToast('Successfully Deleted');
  }
}
