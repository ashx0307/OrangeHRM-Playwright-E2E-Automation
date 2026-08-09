import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface ClaimInput {
  firstName: string;
  middleName?: string;
  lastName: string;
}

/**
 * Claim module — Admin's "Assign Claim" flow. Admin books an expense claim
 * directly on an employee's behalf, the same shape as Assign Leave: it
 * starts "Initiated", and clicking Submit finalizes it straight to "Paid"
 * with no intermediate approval step — confirmed live, not assumed, the
 * same "Admin acting on someone's behalf skips the approval stage" pattern
 * already seen on Assign Leave (see `AssignLeavePage`). Adding an itemized
 * Expense before submitting was investigated but left out: its own dialog
 * consistently stayed open after a same-page `Save` click during
 * development (a genuine, unresolved UI quirk, not a locator miss — see the
 * design note in the README) — Submit works reliably without one, so this
 * workflow exercises the create → submit → paid lifecycle on its own.
 *
 * Its Employee Name autocomplete binds to "First Middle Last" — confirmed
 * live — unlike Assign Leave/Entitlements/Add User's own "First Last" only.
 * Passing the plain `fullName` those other forms use here would make
 * `BasePage.selectAutocompleteOption()`'s own post-selection check fail
 * every time (a genuine binding, not a click that missed), so this takes
 * the name parts separately and builds the exact string this form itself
 * actually binds to.
 */
export class ClaimPage extends BasePage {
  private readonly employeeNameInput = this.inputByLabel('Employee Name');
  private readonly createButton = this.page.getByRole('button', { name: 'Create' });
  private readonly assignClaimButton = this.page.getByRole('button', { name: 'Assign Claim' });
  private readonly searchButton = this.page.getByRole('button', { name: 'Search' });
  private readonly tableRows = this.page.locator('.oxd-table-card');

  constructor(page: Page) {
    super(page);
  }

  async openList() {
    await this.goto('/claim/viewAssignClaim');
    await this.page.locator('.oxd-table').waitFor();
  }

  async openAssignClaimForm() {
    await this.assignClaimButton.click();
    await this.page.waitForURL(/claim\/assignClaim$/);
  }

  /** The exact string this form's own autocomplete binds a selection to — see the class-level note. */
  private bindingName(claim: ClaimInput): string {
    return [claim.firstName, claim.middleName, claim.lastName].filter(Boolean).join(' ');
  }

  /**
   * `BasePage.selectAutocompleteOption()` assumes the text you type is the
   * same text you end up bound to — true for Assign Leave/Entitlements/Add
   * User, but not here: typing the full "First Middle Last" binding value
   * itself doesn't reliably surface the matching suggestion (confirmed
   * live — the generic helper's own post-selection check then fails every
   * time, a real behavioral mismatch, not a flaky click). Searching by
   * "First Last" instead — the same text those other forms both type *and*
   * bind to — reliably surfaces the right suggestion; the assertion is just
   * against the different string this form actually binds to afterward.
   */
  private async selectEmployee(claim: ClaimInput) {
    const searchText = `${claim.firstName} ${claim.lastName}`;
    const expectedBinding = this.bindingName(claim);
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.employeeNameInput.fill(searchText);
      const option = this.page.getByRole('option').filter({ hasNotText: 'Searching' }).first();
      await option.waitFor({ state: 'visible' });
      await option.click();
      if ((await this.employeeNameInput.inputValue()) === expectedBinding) return;
    }
    throw new Error(`ClaimPage.selectEmployee(): "${expectedBinding}" never bound to a real suggestion after 3 attempts`);
  }

  async fillAndCreate(claim: ClaimInput) {
    await this.selectEmployee(claim);
    await this.selectFirstAvailableOption(this.dropdownByLabel('Event'));
    await this.selectFirstAvailableOption(this.dropdownByLabel('Currency'));
    await this.createButton.click();
    await this.expectToast('Successfully Saved');
  }

  async assignClaim(claim: ClaimInput) {
    await this.openList();
    await this.openAssignClaimForm();
    await this.fillAndCreate(claim);
  }

  async searchByEmployeeName(claim: ClaimInput) {
    await this.selectEmployee(claim);
    await this.searchButton.click();
  }

  // Matched by last name alone, the same safe substring this whole suite
  // relies on elsewhere (see EmployeeListPage) — it's unique thanks to
  // randomEmployee()'s own suffix, and sidesteps ever having to guess
  // exactly how a given row renders the full name.
  rowByLastName(lastName: string) {
    return this.tableRows.filter({ hasText: lastName }).first();
  }

  async expectStatus(lastName: string, status: string) {
    await expect(this.rowByLastName(lastName)).toContainText(status);
  }

  async openDetails(lastName: string) {
    await this.rowByLastName(lastName).getByRole('button', { name: 'View Details' }).click();
    await this.page.waitForURL(/claim\/assignClaim\/id\/\d+/);
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Submit' }).click();
    await this.expectToast('Successfully Saved');
  }
}
