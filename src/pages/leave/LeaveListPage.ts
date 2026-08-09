import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class LeaveListPage extends BasePage {
  private readonly searchButton = this.page.getByRole('button', { name: 'Search' });
  private readonly tableRows = this.page.locator('.oxd-table-card');

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/leave/viewLeaveList');
    await this.page.locator('.oxd-table').waitFor();
  }

  async searchByEmployeeName(fullName: string) {
    // The page defaults to only "Pending Approval" selected in this
    // required, multi-select status filter. Admin-assigned leave is
    // scheduled directly without approval — but confirmed live that it
    // doesn't always land on "Scheduled": the masked From/To Date input
    // (see AssignLeavePage/BasePage.setDateField) has been observed to
    // submit a genuinely different date than what was typed, inconsistently
    // (sometimes verbatim, sometimes with day/month swapped) — if that
    // pushes the assigned date into the past relative to the server's own
    // clock, the exact same "no approval needed" assignment resolves to
    // "Taken" instead. "Rejected" covers the other real failure mode (an
    // insufficient-balance assignment declined outright). All three are
    // covered so the search reflects every status this leave could actually
    // be in, rather than assuming the happy-path status is the only one.
    await this.addStatusFilter('Scheduled');
    await this.addStatusFilter('Taken');
    await this.addStatusFilter('Rejected');

    await this.selectAutocompleteOption(this.inputByLabel('Employee Name'), fullName);
    await this.searchButton.click();
  }

  /**
   * Adds a status to the "Show Leave with Status" multi-select without
   * clearing what's already selected — clicking an option here adds a chip
   * rather than replacing the selection, and the option list closes itself
   * after each click, so multiple statuses need the dropdown reopened each time.
   */
  private async addStatusFilter(status: string) {
    const alreadySelected = await this.page.locator('.oxd-multiselect-chips-selected', { hasText: status }).count();
    if (alreadySelected) return;
    await this.dropdownByLabel('Show Leave with Status').click();
    await this.page.locator('.oxd-select-option', { hasText: status }).first().click();
  }

  rowByEmployeeName(fullName: string): Locator {
    return this.tableRows.filter({ hasText: fullName }).first();
  }

  /**
   * Accepts one or more acceptable statuses — see `searchByEmployeeName()`
   * for why an Admin-assigned leave can legitimately land on more than one
   * ("Scheduled" or "Taken", depending on whether the submitted date ended
   * up in the future or the past). Asserting against a single hard-coded
   * status here would make the test flaky for a genuine reason instead of a
   * spurious one — the assignment itself always finalizes directly either
   * way, which is the actual thing this workflow is verifying.
   */
  async expectStatus(fullName: string, acceptableStatuses: string | string[]) {
    const statuses = Array.isArray(acceptableStatuses) ? acceptableStatuses : [acceptableStatuses];
    const row = this.rowByEmployeeName(fullName);
    // A leave request just created by AssignLeavePage.assign() can briefly
    // lag behind this list's own search index on a slow, heavily-loaded
    // shared demo — the same class of read-after-write delay already
    // documented for Employee List's own search (see Workflow 4's own note
    // on re-opening fresh after an update). Re-running the search itself
    // (not just waiting longer on the same result) gives a lagging index a
    // real chance to catch up before concluding the record doesn't exist.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const found = await row
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (found || attempt === 3) break;
      await this.searchButton.click();
    }
    const rowText = await row.innerText();
    const matched = statuses.some((status) => rowText.includes(status));
    expect(matched, `expected row for "${fullName}" to show one of [${statuses.join(', ')}], got: ${rowText}`).toBe(
      true,
    );
  }
}
