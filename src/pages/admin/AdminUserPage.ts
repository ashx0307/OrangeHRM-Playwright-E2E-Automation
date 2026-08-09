import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface SystemUserInput {
  role: 'Admin' | 'ESS';
  employeeName: string;
  status: 'Enabled' | 'Disabled';
  username: string;
  password: string;
}

export class AdminUserPage extends BasePage {
  private readonly addButton = this.page.getByRole('button', { name: 'Add' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly searchButton = this.page.getByRole('button', { name: 'Search' });
  private readonly table = this.page.locator('.oxd-table');
  private readonly tableRows = this.page.locator('.oxd-table-card');

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/admin/viewSystemUsers');
    await this.table.waitFor();
  }

  async clickAdd() {
    await this.addButton.click();
    await this.page.waitForURL('**/admin/saveSystemUser');
  }

  async fillUserForm(user: SystemUserInput) {
    await this.selectDropdownOption(this.dropdownByLabel('User Role'), user.role);
    // Employee Name is required for every system user, Admin or ESS — the
    // account is always tied to an employee record, not just the ESS ones.
    await this.selectAutocompleteOption(this.inputByLabel('Employee Name'), user.employeeName);
    await this.selectDropdownOption(this.dropdownByLabel('Status'), user.status);
    await this.inputByLabel('Username').fill(user.username);
    await this.inputByLabel('Password').first().fill(user.password);
    await this.inputByLabel('Confirm Password').fill(user.password);
  }

  async submit() {
    await this.saveButton.click();
    await this.expectToast('Successfully Saved');
  }

  async addUser(user: SystemUserInput) {
    await this.clickAdd();
    await this.fillUserForm(user);
    await this.submit();
  }

  async searchByUsername(username: string) {
    await this.inputByLabel('Username').fill(username);
    await this.searchButton.click();
    await this.page.waitForResponse((r) => r.url().includes('/api/v2/admin/users') && r.status() === 200).catch(() => undefined);
  }

  rowByUsername(username: string) {
    return this.tableRows.filter({ hasText: username });
  }

  async expectUserVisible(username: string) {
    await expect(this.rowByUsername(username)).toBeVisible();
  }

  async deleteUser(username: string) {
    await this.searchByUsername(username);
    const row = this.rowByUsername(username);
    // The row's edit (pencil) and delete (trash) icons share the generic
    // `.oxd-icon-button` class, and their DOM order isn't reliable enough to
    // pick by position (`.last()` has landed on Edit before) — the trash-icon
    // class is the only unambiguous way to target delete specifically.
    await row.locator('.bi-trash').click();
    await this.page.getByRole('button', { name: 'Yes, Delete' }).click();
    await this.expectToast('Successfully Deleted');
  }

  /** Opens an existing user's edit form via its row's pencil icon. */
  async editUser(username: string) {
    await this.searchByUsername(username);
    await this.rowByUsername(username).locator('.bi-pencil-fill').click();
    await this.page.waitForURL('**/admin/saveSystemUser/**');
    // The Role/Status dropdowns render showing "-- Select --" before the
    // user's own saved values have loaded — confirmed live, the same race as
    // JobDetailsPage.open() — a read right after navigation can catch that
    // placeholder instead of the real current value.
    await this.page.waitForLoadState('networkidle');
  }

  async setStatus(status: 'Enabled' | 'Disabled') {
    await this.selectDropdownOption(this.dropdownByLabel('Status'), status);
    await this.saveButton.click();
    await this.expectToast('Successfully Updated');
  }

  async currentStatus(): Promise<string> {
    return (await this.dropdownByLabel('Status').innerText()).trim();
  }
}
