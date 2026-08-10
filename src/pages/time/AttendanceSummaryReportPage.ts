import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Time > Reports > Attendance Summary — the "Attendance Total Summary
 * Report" (its own on-page heading; the left-nav entry itself is
 * abbreviated) at `/time/displayAttendanceSummaryReportCriteria`. A
 * read-only report showing each searched employee's cumulative Punch
 * In/Out duration, independent of the Punch In/Out screen itself — this is
 * how a punch cycle's effect gets confirmed from a completely different
 * screen, not just from the toast the punch action itself produced.
 *
 * Its own Employee Name field binds to "First Middle Last" the same way
 * Claim's does (confirmed live) — but unlike `ClaimPage.selectEmployee()`,
 * this never needs to *validate* the bound value against one specific known
 * full name, only select whichever real suggestion a "First Last" search
 * surfaces — so the shared `BasePage.selectAutocompleteOption()` (which
 * only confirms *some* real suggestion got bound, not a specific one) is
 * sufficient here.
 */
export class AttendanceSummaryReportPage extends BasePage {
  private readonly employeeNameInput = this.inputByLabel('Employee Name');
  private readonly viewButton = this.page.getByRole('button', { name: 'View' });
  private readonly totalDurationText = this.page.getByText(/Total Duration \(Hours\):/);

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/time/displayAttendanceSummaryReportCriteria');
    await this.employeeNameInput.waitFor();
  }

  /**
   * Searches for the given employee and returns their reported cumulative
   * "Total Duration (Hours)" as a number. This is a lifetime, all-history
   * figure for that employee record — on this shared, never-reset demo it
   * reflects everyone's Punch In/Out activity against that same record, not
   * just this suite's own (confirmed live: a single ~6-second punch cycle
   * was followed by a jump far larger than 6 seconds' worth of hours,
   * consistent with other concurrent users of the same public instance
   * punching the same shared record in between the two reads). Callers
   * should compare this against a *before* snapshot and expect it to not
   * have decreased, rather than assert an absolute figure or a specific
   * expected delta — neither is something a live, shared, concurrently-used
   * instance can actually promise.
   */
  async viewTotalHoursFor(employeeSearchText: string): Promise<number> {
    await this.selectAutocompleteOption(this.employeeNameInput, employeeSearchText);
    await this.viewButton.click();

    await this.totalDurationText.waitFor({ state: 'visible', timeout: 20000 });
    const text = await this.totalDurationText.innerText();
    // Tolerates a thousands-separator comma (e.g. "10,532.15") even though
    // this hasn't been observed yet — the underlying total only ever grows
    // on a shared, never-reset instance, so it's not implausible it
    // eventually crosses that formatting threshold.
    const match = text.match(/([\d,]+(?:\.\d+)?)\s*$/);
    if (!match) {
      throw new Error(`AttendanceSummaryReportPage.viewTotalHoursFor(): couldn't parse an hours figure from "${text}"`);
    }
    return Number(match[1].replace(/,/g, ''));
  }
}
