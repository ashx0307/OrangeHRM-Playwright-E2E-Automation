import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * PIM > Emergency Contacts tab. Its own dedicated route
 * (`/pim/viewEmergencyContacts/empNumber/X`) with its own "Assigned
 * Emergency Contacts" heading — confirmed live after an earlier version of
 * this suite wrongly assumed it was a widget embedded on Personal Details
 * (it isn't; only the *Attachments* widget is shared across tabs that way —
 * see `PersonalDetailsPage`).
 */
export class EmergencyContactsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(employeeId: string) {
    await this.goto(`/pim/viewEmergencyContacts/empNumber/${employeeId}`);
    await this.page.locator('h6', { hasText: 'Assigned Emergency Contacts' }).waitFor();
  }

  async addContact(name: string, relationship: string, mobile: string) {
    const heading = this.page.locator('h6', { hasText: 'Assigned Emergency Contacts' });
    await heading.locator('xpath=following::button[1]').click();

    await this.inputByLabel('Name').fill(name);
    await this.inputByLabel('Relationship').fill(relationship);
    await this.inputByLabel('Mobile').fill(mobile);
    // This dialog's own Save is a `type="submit"` button; the dialog's own
    // title — "Save Emergency Contact" (confirmed live; not the "Add
    // Emergency Contact" its own trigger button is labelled) — sits as a
    // sibling right before the `<form>` it belongs to, so that heading is
    // what actually disambiguates this Save from any other `type="submit"`
    // button on the page.
    const dialogTitle = this.page.locator('h6', { hasText: 'Save Emergency Contact' });
    await dialogTitle.locator('xpath=following-sibling::form[1]//button[@type="submit"]').click();
    await this.expectToast('Successfully Saved');
  }

  async expectContactListed(name: string) {
    await expect(this.page.getByText(name)).toBeVisible();
  }
}
