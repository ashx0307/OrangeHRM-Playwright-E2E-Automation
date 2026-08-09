import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface VacancyInput {
  name: string;
  description?: string;
}

export class VacancyPage extends BasePage {
  private readonly addButton = this.page.getByRole('button', { name: 'Add' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly tableRows = this.page.locator('.oxd-table-card');
  // The Add Vacancy form always shows two `target="_blank"` links to the
  // public candidate-facing job listing — an RSS feed and this HTML page.
  // Both render their raw URL as their own link text, so they're told apart
  // by href rather than accessible name.
  private readonly webPageLink = this.page.locator('a[href*="recruitmentApply/jobs.html"]');

  constructor(page: Page) {
    super(page);
  }

  async openList() {
    await this.goto('/recruitment/viewJobVacancy');
    await this.page.locator('.oxd-table').waitFor();
  }

  async clickAdd() {
    await this.addButton.click();
    await this.page.waitForURL('**/recruitment/addJobVacancy');
  }

  async fillVacancyForm(input: VacancyInput) {
    await this.inputByLabel('Vacancy Name').fill(input.name);
    // A Vacancy has to belong to an existing Job Title — pick whichever one
    // is first available rather than hard-coding a name that may not exist.
    // The option list can still be loading right after the form renders
    // (the same async-load race documented on RecruitmentPage's own Vacancy
    // dropdown), so retry rather than trust the first click landed on a real
    // option instead of a stale "No Records Found" placeholder.
    await this.selectJobTitle();
    if (input.description) {
      await this.textareaByLabel('Description').fill(input.description);
    }
    // Hiring Manager is required despite looking like every other optional
    // autocomplete field in the app — any matching employee will do.
    await this.selectAutocompleteOption(this.inputByLabel('Hiring Manager'), 'a');
  }

  private async selectJobTitle() {
    const dropdown = this.dropdownByLabel('Job Title');
    const attempts = 5;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await dropdown.click();
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
        throw new Error('VacancyPage.selectJobTitle(): Job Title dropdown never showed a real option to select');
      }
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1_000);
    }
  }

  async save() {
    await this.saveButton.click();

    // A successful save redirects to this same form's edit view
    // (/addJobVacancy/{id}) — the toast can flash and clear during that
    // transition before a check for it lands, so either signal counts as
    // proof the save went through.
    const outcome = await Promise.race([
      this.toastMessage
        .filter({ hasText: 'Successfully Saved' })
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 })
        .then(() => 'toast' as const)
        .catch(() => 'timeout' as const),
      this.page
        .waitForURL(/addJobVacancy\/\d+/, { timeout: 30_000 })
        .then(() => 'redirect' as const)
        .catch(() => 'timeout' as const),
    ]);

    if (outcome === 'timeout') {
      throw new Error('VacancyPage.save(): neither the success toast nor the post-save redirect happened');
    }
  }

  async addVacancy(input: VacancyInput) {
    await this.openList();
    await this.clickAdd();
    await this.fillVacancyForm(input);
    await this.save();
  }

  /**
   * Clicks the "Web Page" link that opens the public job listing — it has no
   * `rel`/JS handler beyond a plain `target="_blank"` `<a>`, so the resulting
   * tab is a genuine new `Page` on the same `BrowserContext`, not a same-tab
   * navigation. Returns that new page so callers can assert on it directly.
   */
  async openPublicJobListingInNewTab() {
    const [newPage] = await Promise.all([this.page.context().waitForEvent('page'), this.webPageLink.click()]);
    await newPage.waitForLoadState();
    return newPage;
  }

  rowByName(name: string) {
    return this.tableRows.filter({ hasText: name });
  }

  async expectVacancyVisible(name: string) {
    await expect(this.rowByName(name)).toBeVisible();
  }
}
