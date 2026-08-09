import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class AttendancePage extends BasePage {
  private readonly punchInButton = this.page.getByRole('button', { name: 'In', exact: true });
  private readonly punchOutButton = this.page.getByRole('button', { name: 'Out', exact: true });

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

  async punchIn(note?: string) {
    if (note) await this.page.locator('textarea').fill(note);
    await this.punchInButton.click();
    await this.expectToast('Successfully Saved');
  }

  async punchOut(note?: string) {
    if (note) await this.page.locator('textarea').fill(note);
    await this.punchOutButton.click();
    await this.expectToast('Successfully Saved');
  }

  async expectState(state: 'IN' | 'OUT') {
    const button = state === 'IN' ? this.punchOutButton : this.punchInButton;
    await expect(button).toBeVisible();
  }
}
