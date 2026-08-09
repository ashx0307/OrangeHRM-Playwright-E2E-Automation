import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface CandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  resumePath?: string;
  consentToKeepData?: boolean;
}

export class RecruitmentPage extends BasePage {
  private readonly addButton = this.page.getByRole('button', { name: 'Add' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly tableRows = this.page.locator('.oxd-table-card');
  // Unlike Email/Contact Number, First/Middle/Last Name sit inside one shared
  // "Full Name*" field group rather than their own individually-labelled one,
  // so `inputByLabel` (which matches on a per-field label) can't find them —
  // these are matched by their own accessible name instead.
  private readonly firstNameInput = this.page.getByRole('textbox', { name: 'First Name' });
  private readonly lastNameInput = this.page.getByRole('textbox', { name: 'Last Name' });
  // The only file input on this form (Resume) — no name/id of its own.
  private readonly resumeInput = this.page.locator('input[type="file"]');
  private readonly resumeFileNameLabel = this.page.locator('.oxd-file-input-div');
  // "Consent to keep data" — the only checkbox on this form. It has no
  // accessible name attribute, but Playwright's a11y tree still resolves it
  // to role=checkbox regardless, so `getByRole` finds it despite that.
  private readonly consentCheckbox = this.page.getByRole('checkbox');

  constructor(page: Page) {
    super(page);
  }

  async openCandidateList() {
    await this.goto('/recruitment/viewCandidates');
    await this.page.locator('.oxd-table').waitFor();
  }

  async clickAddCandidate() {
    await this.addButton.click();
    await this.page.waitForURL('**/recruitment/addCandidate');
  }

  async fillCandidateForm(candidate: CandidateInput) {
    await this.firstNameInput.fill(candidate.firstName);
    await this.lastNameInput.fill(candidate.lastName);
    await this.inputByLabel('Email').fill(candidate.email);
    if (candidate.contactNumber) {
      await this.inputByLabel('Contact Number').fill(candidate.contactNumber);
    }
    if (candidate.resumePath) {
      await this.resumeInput.setInputFiles(candidate.resumePath);
    }
    if (candidate.consentToKeepData) {
      // `.check()` on the raw `<input>` doesn't flip the app's own state —
      // same as PersonalDetailsPage's Gender radios, this widget's click
      // handler lives on the wrapping `<label>`, not the input itself.
      await this.consentCheckbox.locator('xpath=ancestor::label').first().click();
      await expect(this.consentCheckbox).toBeChecked();
    }
    // A candidate with no Vacancy never gets an application stage — the
    // Status/Reject/Shortlist section on their own page simply doesn't
    // render without one — so every candidate needs one assigned to be
    // movable through the pipeline at all.
    await this.selectVacancy();
  }

  async expectResumeFileNameShown(fileName: string) {
    await expect(this.resumeFileNameLabel).toHaveText(fileName);
  }

  async isConsentChecked(): Promise<boolean> {
    return this.consentCheckbox.isChecked();
  }

  /**
   * The Vacancy list loads asynchronously after the form renders — opening
   * the dropdown before that finishes shows a stale "No Records Found"
   * placeholder instead of the real options. A single wait for the loading
   * overlay isn't always enough (the fetch can start after the overlay has
   * already cleared), so retry the whole open-and-check cycle a few times.
   */
  private async selectVacancy() {
    const vacancyDropdown = this.dropdownByLabel('Vacancy');
    const attempts = 5;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await this.page.locator('.oxd-form-loader').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => undefined);
      await vacancyDropdown.click();
      const option = this.page
        .locator('.oxd-select-option')
        .filter({ hasNotText: '-- Select --' })
        .filter({ hasNotText: 'No Records Found' })
        .first();
      const hasRealOption = await option
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (hasRealOption) {
        await option.click();
        return;
      }
      if (attempt === attempts) {
        throw new Error('RecruitmentPage.selectVacancy(): Vacancy dropdown never showed a real option to select');
      }
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1_000);
    }
  }

  async save() {
    await this.saveButton.click();
    await this.expectToast('Successfully Saved');
  }

  async addCandidate(candidate: CandidateInput) {
    await this.openCandidateList();
    await this.clickAddCandidate();
    await this.fillCandidateForm(candidate);
    await this.save();
  }

  rowByCandidateName(fullName: string) {
    return this.tableRows.filter({ hasText: fullName });
  }

  async expectCandidateVisible(fullName: string) {
    await expect(this.rowByCandidateName(fullName)).toBeVisible();
  }

  /**
   * Moves a candidate to the next hiring stage. Each row only has two icon
   * actions — view (`.bi-eye-fill`) and delete (`.bi-trash`) — there is no
   * per-row stage menu; `.last()` on a generic icon-button selector actually
   * landed on the delete icon. The real stage-change actions ("Reject",
   * "Shortlist", ...) render as plain buttons on the candidate's own page.
   */
  async advanceStage(fullName: string, stage: string) {
    const row = this.rowByCandidateName(fullName);
    await row.locator('.bi-eye-fill').click();
    await this.page.getByRole('button', { name: stage }).click();
  }

  async deleteCandidate(fullName: string) {
    const row = this.rowByCandidateName(fullName);
    await row.locator('.bi-trash').click();
    await this.page.getByRole('button', { name: 'Yes, Delete' }).click();
    await this.expectToast('Successfully Deleted');
  }
}
