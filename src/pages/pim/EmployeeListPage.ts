import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import { EmploymentStatusFilterCase } from '../../data/employee-search.data';

export class EmployeeListPage extends BasePage {
  private readonly searchButton = this.page.getByRole('button', { name: 'Search' });
  private readonly resetButton = this.page.getByRole('button', { name: 'Reset' });
  private readonly table = this.page.locator('.oxd-table');
  private readonly tableRows = this.page.locator('.oxd-table-card');

  constructor(page: Page) {
    super(page);
  }

  async open() {
    // A cold `page.goto()` straight to this route has been observed to render
    // a blank page under load; navigating the way a user would — a full load
    // of the (reliably-loading) dashboard, then a client-side route change via
    // the sidebar — has not shown the same issue. PIM's own landing page *is*
    // the Employee List, so no further click is needed once there.
    await this.goto('/dashboard/index');
    await this.navigateToModule('PIM');
    await this.table.waitFor();
  }

  async searchByEmployeeName(name: string) {
    await this.selectAutocompleteOption(this.inputByLabel('Employee Name'), name);
    await this.searchButton.click();
  }

  async searchByIncludeOption(option: EmploymentStatusFilterCase['includeOption']) {
    await this.selectDropdownOption(this.dropdownByLabel('Include'), option);
    await this.searchButton.click();
  }

  /**
   * Combines Job Title, Sub Unit and Employment Status in one search —
   * distinct from the single-field `searchByIncludeOption` above, and from
   * Directory's own Job Title/Location filters (a different module,
   * different fields, different underlying result set). Each field's
   * *actual* value is picked live (whatever the demo currently has) and
   * returned so the caller can assert every result actually matches it,
   * rather than asserting against a value hard-coded ahead of time.
   */
  async searchByJobTitleSubUnitAndStatus(status: string) {
    const jobTitle = await this.selectFirstAvailableOption(this.dropdownByLabel('Job Title'));
    const subUnit = await this.selectFirstAvailableOption(this.dropdownByLabel('Sub Unit'));
    await this.selectDropdownOption(this.dropdownByLabel('Employment Status'), status);
    await this.searchButton.click();
    return { jobTitle, subUnit };
  }

  async reset() {
    await this.resetButton.click();
  }

  rowByName(fullName: string) {
    return this.tableRows.filter({ hasText: fullName });
  }

  async expectEmployeeVisible(fullName: string) {
    await expect(this.rowByName(fullName)).toBeVisible();
  }

  async openEmployee(fullName: string) {
    await this.rowByName(fullName).first().click();
    await this.page.waitForURL(/pim\/viewPersonalDetails/);
  }

  async deleteEmployee(fullName: string) {
    const row = this.rowByName(fullName);
    // The trash-icon class is the only unambiguous way to target delete
    // specifically — the row's icon buttons share a generic class and their
    // DOM order isn't reliable enough to pick by position.
    await row.locator('.bi-trash').click();
    await this.page.getByRole('button', { name: 'Yes, Delete' }).click();
    await this.expectToast('Successfully Deleted');
  }
}
