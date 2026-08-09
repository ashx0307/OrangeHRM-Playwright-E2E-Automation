import { Page, Locator, expect } from '@playwright/test';
import { env } from '../config/env';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string) {
    try {
      await this.page.goto(`${env.baseUrl}${path}`);
    } catch (error) {
      // Navigating away right after a prior action (e.g. a save whose own
      // success redirect is still settling) can abort this goto — seen
      // consistently enough (not just once) that it's worth one retry
      // rather than failing the whole test on what the browser itself
      // reports as a cancelled, not a failed, navigation.
      if (error instanceof Error && error.message.includes('ERR_ABORTED')) {
        await this.page.goto(`${env.baseUrl}${path}`);
      } else {
        throw error;
      }
    }
  }

  /** Sidebar module navigation, e.g. navigateToModule('PIM') */
  async navigateToModule(moduleName: string) {
    await this.page.locator('.oxd-main-menu-item').filter({ hasText: moduleName }).first().click();
  }

  /**
   * Returns the field group ("oxd-input-group") for the given label text.
   * Several fields sit inside one shared `.oxd-form-row` grid (e.g. Admin > Add
   * User), so matching against `.oxd-form-row` too would pick up sibling fields —
   * `.oxd-input-group` alone is the smallest container scoped to a single field.
   */
  private fieldGroupByLabel(label: string | RegExp): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.locator('label.oxd-label', { hasText: label }) })
      .first();
  }

  /**
   * Returns the input that sits inside the same field group as the given
   * label text. Pass a RegExp (e.g. `/^Password/`) when a plain string would
   * substring-match more than one field on the same form (e.g. "Password" vs.
   * "Current Password"/"Confirm Password").
   */
  inputByLabel(label: string | RegExp): Locator {
    return this.fieldGroupByLabel(label).locator('input');
  }

  /** The custom dropdown ("oxd-select-text") that sits inside the field group for the given label. */
  dropdownByLabel(label: string | RegExp): Locator {
    return this.fieldGroupByLabel(label).locator('.oxd-select-text');
  }

  /** Returns the textarea inside the same field group as the given label —
   *  needed whenever a form has more than one textarea (e.g. Add Job Title's
   *  "Job Description" and "Note"), where a bare `page.locator('textarea')`
   *  can't tell them apart. */
  textareaByLabel(label: string | RegExp): Locator {
    return this.fieldGroupByLabel(label).locator('textarea');
  }

  async selectDropdownOption(dropdown: Locator, optionText: string) {
    await dropdown.click();
    await this.page.locator('.oxd-select-option', { hasText: optionText }).first().click();
  }

  /**
   * Opens a dropdown and picks its first real option — for cases where the
   * caller doesn't care which value it gets (e.g. "any leave type with a
   * balance"). The unselected placeholder ("-- Select --") renders as an
   * `.oxd-select-option` in its own right, so it must be excluded explicitly
   * or `.first()` picks the placeholder and nothing actually gets selected.
   */
  async selectFirstAvailableOption(dropdown: Locator): Promise<string> {
    await dropdown.click();
    const option = this.page.locator('.oxd-select-option').filter({ hasNotText: '-- Select --' }).first();
    const label = (await option.innerText()).trim();
    await option.click();
    return label;
  }

  /**
   * Sets a date field by clicking it, clearing it via keyboard, and typing the
   * value character-by-character. This widget's masked input does not reliably
   * accept a bulk `.fill()` — it can leave stale characters behind (yielding a
   * concatenated value) or re-parse the digits into the wrong day/month slots.
   * Driving it the way a real user would (select-all, delete, type) avoids both.
   */
  async setDateField(input: Locator, value: string) {
    await input.click();
    await input.press('Control+A');
    await input.press('Delete');
    await input.pressSequentially(value);
    await this.page.keyboard.press('Escape');
  }

  /**
   * Types into an autocomplete input and picks the first real suggestion.
   * While the async lookup is in flight the dropdown renders a "Searching...."
   * placeholder that is itself exposed as `role="option"` — matching the very
   * first option without excluding it clicks the placeholder, which leaves the
   * typed text in place but binds no employee, so the form fails validation
   * with "Invalid" even though the field looks filled.
   *
   * Clicking the right option still occasionally leaves the raw typed text in
   * place instead of the full bound name (a genuine selection always replaces
   * it with something longer/different) — when that happens, retry rather
   * than trust that the click landed.
   */
  async selectAutocompleteOption(input: Locator, searchText: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await input.fill(searchText);
      const option = this.page.getByRole('option').filter({ hasNotText: 'Searching' }).first();
      await option.waitFor({ state: 'visible' });
      await option.click();
      await this.page.getByRole('listbox').waitFor({ state: 'hidden' }).catch(() => undefined);

      if ((await input.inputValue()) !== searchText) return;
    }
    throw new Error(`selectAutocompleteOption: "${searchText}" never bound to a real suggestion after 3 attempts`);
  }

  get toastMessage(): Locator {
    return this.page.locator('.oxd-toast-content, .oxd-toast');
  }

  async expectToast(text: string) {
    // The toast auto-dismisses a few seconds after it appears, and on this
    // slow shared demo the save request itself can take a while — a short
    // timeout here risks polling only after the toast has already come and
    // gone. A longer window trades a bit of speed for not missing the race.
    await expect(this.toastMessage.filter({ hasText: text }).first()).toBeVisible({ timeout: 30000 });
  }

  get pageHeader(): Locator {
    return this.page.locator('.oxd-topbar-header-breadcrumb h6');
  }

  /**
   * The empty-state message and the toast both render the literal text
   * "No Records Found", so matching by text alone is ambiguous. The empty
   * state is a plain `<span class="oxd-text--span">`; the toast is a
   * `<p class="oxd-toast-content-text">` — the tag/class combination is what
   * actually distinguishes them, not scoping to the table (the empty-state
   * span sits outside `.oxd-table` despite rendering right above its header).
   */
  async expectNoRecordsFound() {
    await expect(this.page.locator('span.oxd-text--span', { hasText: 'No Records Found' })).toBeVisible({
      timeout: 20000,
    });
  }
}
