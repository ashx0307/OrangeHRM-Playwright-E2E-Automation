import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface PublicJobApplicationInput {
  firstName: string;
  lastName: string;
  email: string;
  resumePath: string;
}

/**
 * The public, unauthenticated job-listing/application site
 * (`/recruitmentApply/jobs.html` and the `/recruitmentApply/applyVacancy/id/N`
 * form it links to) — reachable only via `VacancyPage.openPublicJobListingInNewTab()`'s
 * own new browser tab, so this page object wraps that tab's own `Page`
 * rather than the shared `adminPage`. Vacancies render newest-first as their
 * own cards (confirmed live), so a vacancy created moments earlier in the
 * same test is reliably found without needing to page through the listing.
 */
export class PublicJobListingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private vacancyCard(vacancyName: string) {
    return this.page.locator('.orangehrm-vacancy-card-header').filter({ hasText: vacancyName });
  }

  /**
   * Applies to the given vacancy the way an actual member of the public
   * would: find its card on the listing, click Apply, fill the form, and
   * submit. Resume is genuinely required here — confirmed live: unlike the
   * Admin-side Add Candidate form (where it's optional), submitting without
   * one is silently rejected with an inline "Required" error and no
   * Candidate record is created at all.
   */
  async apply(vacancyName: string, application: PublicJobApplicationInput) {
    await this.vacancyCard(vacancyName).getByRole('button', { name: 'Apply' }).click();

    // Full Name splits into First/Middle/Last inputs sharing one field
    // group here too, the same as the Admin-side Add Candidate form — an
    // `inputByLabel('Full Name')` lookup would be ambiguous, so these are
    // matched by their own accessible name instead.
    await this.page.getByRole('textbox', { name: 'First Name' }).fill(application.firstName);
    await this.page.getByRole('textbox', { name: 'Last Name' }).fill(application.lastName);
    await this.inputByLabel('Email').fill(application.email);
    await this.page.locator('input[type="file"]').setInputFiles(application.resumePath);
    await this.page.getByRole('button', { name: 'Submit' }).click();
    await this.expectApplicationReceived();
  }

  /**
   * A successful submission redirects to the same form with `?success=true`
   * and shows a dedicated "Application Received" confirmation — a distinct
   * modal, not this app's usual `.oxd-toast` component, since this public
   * site is a separate, unauthenticated surface from the rest of OrangeHRM.
   */
  async expectApplicationReceived() {
    await this.page.getByText('Application Received').waitFor({ state: 'visible', timeout: 20000 });
    await this.page.getByRole('button', { name: 'Ok' }).click();
  }
}
