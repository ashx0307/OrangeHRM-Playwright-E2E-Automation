import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The Directory module — a company-wide, read-only employee lookup distinct
 * from PIM's own Employee List (Directory is scoped to "who works here and
 * what do they do", not employee-record administration, and its filters —
 * Job Title, Location — are its own, not shared with PIM's).
 */
export class DirectoryPage extends BasePage {
  private readonly searchButton = this.page.getByRole('button', { name: 'Search' });

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/directory/viewDirectory');
    await this.searchButton.waitFor();
  }

  /** Unfiltered search — every employee the directory has. */
  async searchAll() {
    await this.searchButton.click();
  }

  async searchByJobTitle(): Promise<string> {
    const label = await this.selectFirstAvailableOption(this.dropdownByLabel('Job Title'));
    await this.searchButton.click();
    return label;
  }

  async expectResultsFound() {
    // Directory renders "(N) Records Found" right above the results — this
    // module's markup isn't the same `.oxd-table-card` component PIM's own
    // Employee List uses (confirmed live), so this text is the reliable
    // signal, not a card-element count.
    await expect(this.page.getByText(/\(\d+\) Records? Found/)).toBeVisible();
  }
}
