import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface CandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  resumePath?: string;
  consentToKeepData?: boolean;
  // Selects a specific Vacancy by name instead of whichever one happens to
  // be first available. Needed whenever a test later relies on this
  // candidate's status actually finalizing (e.g. Shortlist) — a
  // first-available pick can land on a pre-existing, shared vacancy whose
  // own Hiring Manager has since been deleted by some other run on this
  // never-reset demo, which fails that finalization outright (see
  // `RecruitmentPage.advanceStage()`).
  vacancyName?: string;
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
    await this.selectVacancy(candidate.vacancyName);
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
   *
   * Pass `vacancyName` to pick that specific Vacancy instead of whichever
   * one happens to be first available — see `CandidateInput.vacancyName`.
   */
  private async selectVacancy(vacancyName?: string) {
    const vacancyDropdown = this.dropdownByLabel('Vacancy');
    const attempts = 5;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await this.page.locator('.oxd-form-loader').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => undefined);
      await vacancyDropdown.click();
      const option = vacancyName
        ? this.page.locator('.oxd-select-option').filter({ hasText: vacancyName }).first()
        : this.page
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
        throw new Error(
          `RecruitmentPage.selectVacancy(): Vacancy dropdown never showed ${vacancyName ? `"${vacancyName}"` : 'a real option'} to select`,
        );
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

  /** The candidate list's own "Status" column — the second, independent
   *  screen a stage change is cross-checked against, not just the toast the
   *  change itself produced (the same idiom `AttendanceSummaryReportPage`
   *  uses for Workflow 9's punch cycle). */
  async expectCandidateStatus(fullName: string, status: string) {
    await expect(this.rowByCandidateName(fullName)).toContainText(status);
  }

  /**
   * Moves a candidate to the next hiring stage. Each row only has two icon
   * actions — view (`.bi-eye-fill`) and delete (`.bi-trash`) — there is no
   * per-row stage menu; `.last()` on a generic icon-button selector actually
   * landed on the delete icon. The real stage-change actions ("Reject",
   * "Shortlist", ...) render as plain buttons on the candidate's own page.
   *
   * Clicking that button alone doesn't finalize anything, though — confirmed
   * live: it routes to its own confirmation form
   * (`changeCandidateVacancyStatus?candidateId=X&selectedAction=N`) showing
   * the Candidate/Vacancy/Hiring Manager/Current Status read-only and an
   * optional Notes field, and the candidate's status stays exactly what it
   * was until that form's own Save is clicked too. That confirmation can
   * also fail outright with a generic "Unexpected Error Occurred" if the
   * candidate's Vacancy has a Hiring Manager reference that's since been
   * deleted (a real, reproducible defect on this shared, never-reset demo,
   * not a flake) — assign the candidate to a freshly-created Vacancy (see
   * `CandidateInput.vacancyName`) to avoid it.
   */
  async advanceStage(fullName: string, stage: string, notes?: string) {
    const row = this.rowByCandidateName(fullName);
    await row.locator('.bi-eye-fill').click();
    await this.page.getByRole('button', { name: stage }).click();

    await this.page.waitForURL(/changeCandidateVacancyStatus/, { timeout: 20_000 });
    await this.page.locator('.oxd-form-loader').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => undefined);
    if (notes) await this.textareaByLabel('Notes').fill(notes);
    await this.saveButton.click();
    await this.expectToast('Successfully Updated');
  }

  async deleteCandidate(fullName: string) {
    const row = this.rowByCandidateName(fullName);
    await row.locator('.bi-trash').click();
    await this.page.getByRole('button', { name: 'Yes, Delete' }).click();
    await this.expectToast('Successfully Deleted');
  }
}
