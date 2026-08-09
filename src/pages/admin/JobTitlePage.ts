import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface JobTitleInput {
  title: string;
  description?: string;
}

export class JobTitlePage extends BasePage {
  private readonly addButton = this.page.getByRole('button', { name: 'Add' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly tableRows = this.page.locator('.oxd-table-card');

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/admin/viewJobTitleList');
    await this.page.locator('.oxd-table').waitFor();
  }

  async clickAdd() {
    await this.addButton.click();
    await this.page.waitForURL('**/admin/saveJobTitle');
  }

  async fillJobTitleForm(input: JobTitleInput) {
    await this.inputByLabel('Job Title').fill(input.title);
    if (input.description) {
      await this.textareaByLabel('Job Description').fill(input.description);
    }
  }

  async save() {
    await this.saveButton.click();
    await this.expectToast('Successfully Saved');
  }

  async addJobTitle(input: JobTitleInput) {
    await this.open();
    await this.clickAdd();
    await this.fillJobTitleForm(input);
    await this.save();
  }

  rowByTitle(title: string) {
    return this.tableRows.filter({ hasText: title });
  }

  async expectJobTitleVisible(title: string) {
    await expect(this.rowByTitle(title)).toBeVisible();
  }

  async deleteJobTitle(title: string) {
    const row = this.rowByTitle(title);
    // The trash-icon class is the only unambiguous way to target delete
    // specifically — the row's icon buttons share a generic class and their
    // DOM order isn't reliable enough to pick by position.
    await row.locator('.bi-trash').click();
    await this.page.getByRole('button', { name: 'Yes, Delete' }).click();
    await this.expectToast('Successfully Deleted');
  }
}
