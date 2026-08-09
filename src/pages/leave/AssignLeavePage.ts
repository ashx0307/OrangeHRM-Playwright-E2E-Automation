import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';
import { futureLeaveDate } from '../../utils/date';

/** Lets an Admin/Supervisor book leave on behalf of an employee — the counterpart
 *  to ApplyLeavePage, which only the employee themselves can use. */
export class AssignLeavePage extends BasePage {
  private readonly employeeNameInput = this.inputByLabel('Employee Name');
  private readonly leaveTypeDropdown = this.dropdownByLabel('Leave Type');
  private readonly fromDateInput = this.inputByLabel('From Date');
  private readonly toDateInput = this.inputByLabel('To Date');
  private readonly assignButton = this.page.getByRole('button', { name: 'Assign' });

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/leave/assignLeave');
    await this.employeeNameInput.waitFor();
  }

  async selectEmployee(fullName: string) {
    await this.selectAutocompleteOption(this.employeeNameInput, fullName);
  }

  async selectFirstAvailableLeaveType(): Promise<string> {
    return this.selectFirstAvailableOption(this.leaveTypeDropdown);
  }

  async fillDateRange(fromDate: string, toDate: string) {
    await this.setDateField(this.fromDateInput, fromDate);
    await this.setDateField(this.toDateInput, toDate);
  }

  /**
   * A single-day request that doesn't touch a configured working day is
   * rejected by the real API with `400 "Failed to Submit: No Working Days
   * Selected"`, surfaced in the UI as an error toast reading exactly that —
   * confirmed by inspecting both the response body and the toast text
   * directly, not guessed. This otherwise looks identical to this suite's
   * already-documented shared-demo slowness (the Assign click just never
   * produces a *success* toast), which is why it went undiagnosed at first.
   *
   * This demo's Work Week (`Admin > Configure > Work Week`) is shared,
   * mutable, admin-editable state, and it has been observed to actually
   * change *during* a single investigation — a fixed assumption like "just
   * avoid Saturday/Sunday" (or even reading it live once up front) isn't
   * reliable, since another concurrent user of this same public instance can
   * still flip it between that read and the actual submit. The only thing
   * that's actually reliable is reacting to the real rejection when it
   * happens: on this specific error, advance to the next calendar day and
   * retry, the same "detect the specific failure, retry with an adjustment"
   * idiom `AddEmployeePage.save()`'s Employee-Id-collision retry already
   * uses. Within any 7 consecutive days at least one is virtually guaranteed
   * to be a working day under whatever the config currently is.
   */
  async assign(daysFromNow: number) {
    const confirmButton = this.page.getByRole('button', { name: 'Ok' });
    const savedToast = this.toastMessage.filter({ hasText: 'Successfully Saved' }).first();
    const rejectedToast = this.toastMessage.filter({ hasText: 'No Working Days Selected' }).first();

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      // The previous day's rejection toast is still visible for a few
      // seconds after it appears (it auto-dismisses on its own timer, not
      // dismissed by this code) — racing a fresh click against it without
      // waiting for it to actually clear first sees it as an immediate
      // "rejected" on this new date too, even before the new click has done
      // anything at all.
      await rejectedToast.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);

      const date = futureLeaveDate(daysFromNow + dayOffset);
      await this.fillDateRange(date, date);

      const attempts = 2;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        await this.assignButton.click();

        // The granted entitlement's period doesn't always cover the assigned
        // dates (e.g. an older period than the one being booked into), which
        // leaves the employee showing insufficient balance — the app still
        // allows an Admin to override this, but only after confirming a modal
        // that otherwise blocks the save from ever completing. Race all the
        // possible outcomes (rather than waiting on any one sequentially)
        // since on a slow, shared demo instance any of them can take a while
        // to show up, and a fixed sequential wait can miss whichever is slow.
        const outcome = await Promise.race([
          savedToast
            .waitFor({ state: 'visible', timeout: 30_000 })
            .then(() => 'saved' as const)
            .catch(() => 'timeout' as const),
          confirmButton
            .waitFor({ state: 'visible', timeout: 30_000 })
            .then(() => 'confirm' as const)
            .catch(() => 'timeout' as const),
          rejectedToast
            .waitFor({ state: 'visible', timeout: 30_000 })
            .then(() => 'rejected' as const)
            .catch(() => 'timeout' as const),
        ]);

        if (outcome === 'confirm') {
          await confirmButton.click();
          await this.expectToast('Successfully Saved');
          return;
        }
        if (outcome === 'saved') {
          await this.expectToast('Successfully Saved');
          return;
        }
        if (outcome === 'rejected') break; // try the next calendar day instead
        if (attempt < attempts) continue; // timeout — the click may not have registered, retry once
      }
    }

    throw new Error(
      `AssignLeavePage.assign(): no working day found in the 7 days starting ${futureLeaveDate(daysFromNow)}`,
    );
  }
}
