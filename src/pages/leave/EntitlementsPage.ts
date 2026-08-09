import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * A freshly created employee has zero leave balance and doesn't even appear in
 * the "Assign Leave" employee picker until an entitlement exists for them —
 * this page grants one so Workflows 6/7 have real data to act on.
 */
export class EntitlementsPage extends BasePage {
  private readonly employeeNameInput = this.inputByLabel('Employee Name');
  private readonly leaveTypeDropdown = this.dropdownByLabel('Leave Type');
  private readonly leavePeriodDropdown = this.dropdownByLabel('Leave Period');
  private readonly entitlementInput = this.inputByLabel('Entitlement');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/leave/addLeaveEntitlement');
    await this.employeeNameInput.waitFor();
  }

  /**
   * Leave Period options are listed oldest-first (e.g. "2020-01-01 -
   * 2020-31-12" through several years out) — picking the first available one
   * (as `selectFirstAvailableOption` would) grants an entitlement for a period
   * years in the past. Assign Leave only offers a leave type as assignable if
   * a *current*-period entitlement exists for it, so that leave type would
   * otherwise silently never appear there at all.
   */
  private async selectCurrentLeavePeriod() {
    const currentYear = new Date().getFullYear();
    await this.leavePeriodDropdown.click();
    const option = this.page.locator('.oxd-select-option').filter({ hasText: String(currentYear) }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  async grantEntitlement(employeeFullName: string, days: number) {
    await this.selectAutocompleteOption(this.employeeNameInput, employeeFullName);
    await this.selectFirstAvailableOption(this.leaveTypeDropdown);
    await this.selectCurrentLeavePeriod();
    await this.entitlementInput.fill(String(days));
    await this.saveButton.click();

    // If an entitlement already exists for this employee/leave type/period
    // (e.g. auto-created at 0.00 when the employee record was added), the app
    // confirms the overwrite in a modal before it will actually save. `isVisible()`
    // is a one-shot check, not a wait, so it must be paired with `waitFor` to
    // give the modal time to actually render on a slow connection.
    const confirmButton = this.page.getByRole('button', { name: 'Confirm' });
    const modalAppeared = await confirmButton
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (modalAppeared) {
      await confirmButton.click();
    }

    await this.expectToast('Successfully Saved');
  }
}
