import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  private readonly userDropdown = this.page.locator('.oxd-userdropdown-tab');
  private readonly logoutLink = this.page.locator('a', { hasText: 'Logout' });

  constructor(page: Page) {
    super(page);
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/dashboard\/index/);
    await expect(this.pageHeader).toHaveText('Dashboard');
  }

  async logout() {
    await this.userDropdown.click();
    await this.logoutLink.click();
  }

  async changePassword() {
    await this.userDropdown.click();
    await this.page.locator('a', { hasText: 'Change Password' }).click();
  }
}
