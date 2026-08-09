/**
 * `AssignLeavePage`'s date inputs display a "yyyy-mm-dd" placeholder, and —
 * confirmed by inspecting the actual `fromDate`/`toDate` sent in the real
 * `POST .../leave-requests` request — whatever text is typed in is exactly
 * what gets submitted, verbatim, as a standard ISO `yyyy-MM-dd` string. (An
 * earlier note here claimed the widget silently re-parses typed text as
 * "yyyy-dd-mm" instead; that turned out to describe a purely cosmetic quirk
 * of the calendar popup's own highlighting, not the value that actually gets
 * submitted — direct network inspection is the more reliable source here.)
 *
 * This only computes the calendar date `daysFromNow` days out — it does *not*
 * know whether that date is actually a working day. That check needs the
 * live "Work Week" config (`Admin > Configure > Work Week`), which can only
 * be read via an authenticated API call — see `AssignLeavePage.nextWorkingDate()`.
 */
export function futureLeaveDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
