import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * PIM > Job tab. Covers two closely-related business scenarios that both
 * live on this exact same form and only differ in which field changes:
 * transferring an employee to a different department/role (Sub Unit, Job
 * Title), and changing their Employment Status.
 *
 * "Employment Status" here is an employment *type* (Freelance, Full-Time
 * Contract/Permanent/Probation, Part-Time Contract/Internship) — confirmed
 * live, not assumed — not an Active/Suspended/Terminated lifecycle state.
 * There's no dedicated "Terminate Employee" action distinct from deleting
 * the record outright, which Workflow 5 (Offboarding) already covers — a
 * separate "termination" workflow here would just duplicate that one. The
 * genuinely real, common scenario this field supports is a probation-to-
 * permanent conversion, which is what the Employee Status Change workflow
 * exercises instead.
 */
export class JobDetailsPage extends BasePage {
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });

  constructor(page: Page) {
    super(page);
  }

  async open(employeeId: string) {
    await this.goto(`/pim/viewJobDetails/empNumber/${employeeId}`);
    await this.dropdownByLabel('Job Title').waitFor();
    // The dropdown shells render immediately, showing "-- Select --" even for
    // a field that actually has a saved value — confirmed live: right after
    // `goto()`, Employment Status reads "-- Select --" for an employee that
    // already has "Full-Time Probation" saved, and only shows the real value
    // once this settles. `waitFor()` above only proves the shell exists.
    await this.page.waitForLoadState('networkidle');
  }

  async changeJobTitle(): Promise<string> {
    return this.selectFirstAvailableOption(this.dropdownByLabel('Job Title'));
  }

  async changeSubUnit(): Promise<string> {
    return this.selectFirstAvailableOption(this.dropdownByLabel('Sub Unit'));
  }

  async changeEmploymentStatus(status: string) {
    await this.selectDropdownOption(this.dropdownByLabel('Employment Status'), status);
  }

  async currentEmploymentStatus(): Promise<string> {
    return (await this.dropdownByLabel('Employment Status').innerText()).trim();
  }

  async save() {
    await this.saveButton.click();
    await this.expectToast('Successfully Updated');
  }

  async expectOnJobTab() {
    await expect(this.page).toHaveURL(/pim\/viewJobDetails/);
  }
}
