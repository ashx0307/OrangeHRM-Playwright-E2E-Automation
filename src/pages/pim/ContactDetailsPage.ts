import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/** PIM > Contact Details tab — address and phone/email fields, distinct
 *  from Personal Details' own name/nationality/gender fields and from
 *  Emergency Contacts' own separate set of phone fields. */
export class ContactDetailsPage extends BasePage {
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' }).first();

  constructor(page: Page) {
    super(page);
  }

  async open(employeeId: string) {
    await this.goto(`/pim/contactDetails/empNumber/${employeeId}`);
    await this.inputByLabel('Street 1').waitFor();
    // The field shell renders before the employee's own (possibly already
    // saved) address data has loaded — a read right after `waitFor()` alone
    // can still see it empty even when a real value exists server-side.
    // Unlike Personal Details' name, this field can be genuinely blank on a
    // brand-new employee, so waiting for "not empty" isn't safe here —
    // waiting for the load itself to settle is what actually generalizes.
    await this.page.waitForLoadState('networkidle');
  }

  async updateAddress(street1: string, city: string) {
    await this.inputByLabel('Street 1').fill(street1);
    await this.inputByLabel('City').fill(city);
    await this.saveButton.click();
    await this.expectToast('Successfully Updated');
  }

  async currentStreet1(): Promise<string> {
    return this.inputByLabel('Street 1').inputValue();
  }
}
