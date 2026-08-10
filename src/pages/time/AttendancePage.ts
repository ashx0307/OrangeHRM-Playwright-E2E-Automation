import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import { env } from '../../config/env';

export class AttendancePage extends BasePage {
  private readonly punchInButton = this.page.getByRole('button', { name: 'In', exact: true });
  private readonly punchOutButton = this.page.getByRole('button', { name: 'Out', exact: true });
  // The topbar's own "First Last" display name of whoever is currently
  // logged in — used to look this employee up elsewhere (e.g. the
  // Attendance Summary Report) without depending on any attendance record
  // already existing to read an employee off of.
  private readonly userDropdownName = this.page.locator('.oxd-userdropdown-name');
  // This field's own placeholder is "yyyy-dd-mm" — a different day/month
  // order than Leave's own From/To Date field ("yyyy-mm-dd", see
  // `futureLeaveDate()`). Confirmed live: the two Date widgets in this app
  // are not interchangeable, so a value built for one can't be reused as-is
  // for the other.
  private readonly dateInput = this.page
    .locator('.oxd-input-group')
    .filter({ has: this.page.locator('label.oxd-label', { hasText: /^Date$/ }) })
    .locator('input');

  constructor(page: Page) {
    super(page);
  }

  async open() {
    // The actual route is "punchIn", not "punchInOut" — the latter 404s,
    // which is what was rendering as a blank page and timing out.
    await this.goto('/attendance/punchIn');
    await this.page.locator('.oxd-form').waitFor();
  }

  /** Only one of "Punch In" / "Punch Out" is rendered at a time, reflecting the
   *  employee's current, server-side attendance state. */
  async currentState(): Promise<'IN' | 'OUT'> {
    return (await this.punchOutButton.isVisible()) ? 'IN' : 'OUT';
  }

  /**
   * The "First Last" name of whoever is currently punching — read from the
   * topbar rather than an attendance record's own `employee` field, since a
   * freshly-reset account would have no punch history yet to read one off
   * of. This is also the exact search-friendly form the Attendance Summary
   * Report's own Employee Name autocomplete expects (see
   * `AttendanceSummaryReportPage`).
   */
  async currentEmployeeFullName(): Promise<string> {
    return (await this.userDropdownName.innerText()).trim();
  }

  async punchIn(note?: string) {
    if (note) await this.page.locator('textarea').fill(note);
    await this.punchInButton.click();
    await this.expectToast('Successfully Saved');
  }

  /**
   * On this shared demo, the Admin employee's attendance record can be left
   * "Punched In" at a Date that's genuinely in the future relative to now —
   * confirmed live, not assumed: `records/latest` returned a real, unexpired
   * `punchIn.userDate` several days ahead of the actual current date, almost
   * certainly left behind by another user/run of this same public instance.
   * The Punch Out form always defaults its own Date/Time to "right now,"
   * which the real API then rejects outright with
   * `400 "Punch out Time Should Be Later Than Punch in Time"` — a real,
   * persistent block, not a timing race, since "now" can't ever be later
   * than a still-future Punch In. Reading the actual record via this
   * read-only API call (rather than parsing the page's own "Punched in
   * time" display — that display's own template has day/month swapped, the
   * same class of quirk documented for the Leave date field) is what
   * confirms whether this correction is even needed.
   */
  private async ensureDateIsAfterAnyFuturePunchIn() {
    const response = await this.page.request.get(`${env.baseUrl}/api/v2/attendance/records/latest`);
    const record = (await response.json())?.data;
    const punchInDate: string | undefined = record?.punchIn?.userDate;
    if (record?.state?.id !== 'PUNCHED IN' || !punchInDate) return;

    const today = new Date().toISOString().slice(0, 10);
    if (punchInDate <= today) return; // the form's own "now" default is already safely later

    // One day past the stuck Punch In is enough regardless of what Time
    // ends up submitted alongside it — confirmed live: the backend's own
    // `punch-out/overlaps` recheck accepts it, and the click through to a
    // real "Successfully Saved" save goes through even though the page's
    // own inline validation message (raised by the original, since-invalid
    // "now" default) stays visually stuck on screen — the same kind of
    // stale-error-doesn't-clear-itself quirk already documented for the
    // Employee Id collision message; it doesn't reflect what the form will
    // actually submit.
    const [year, month, day] = punchInDate.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    const correctedDate = [
      next.getUTCFullYear(),
      String(next.getUTCDate()).padStart(2, '0'),
      String(next.getUTCMonth() + 1).padStart(2, '0'),
    ].join('-'); // yyyy-dd-mm, matching this field's own placeholder
    await this.setDateField(this.dateInput, correctedDate);
  }

  async punchOut(note?: string) {
    await this.ensureDateIsAfterAnyFuturePunchIn();
    if (note) await this.page.locator('textarea').fill(note);
    await this.punchOutButton.click();
    await this.expectToast('Successfully Saved');
  }

  async expectState(state: 'IN' | 'OUT') {
    const button = state === 'IN' ? this.punchOutButton : this.punchInButton;
    await expect(button).toBeVisible();
  }
}
