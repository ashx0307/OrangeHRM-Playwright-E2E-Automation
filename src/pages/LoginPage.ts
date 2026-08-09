import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  private readonly usernameInput = this.page.locator('input[name="username"]');
  private readonly passwordInput = this.page.locator('input[name="password"]');
  private readonly loginButton = this.page.locator('button[type="submit"]');
  private readonly errorAlert = this.page.locator('.oxd-alert-content-text');
  private readonly fieldRequiredError = this.page.locator('.oxd-input-field-error-message');
  private readonly forgotPasswordLink = this.page.locator('.orangehrm-login-forgot-header');

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/auth/login');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginError(message = 'Invalid credentials') {
    await expect(this.errorAlert).toHaveText(message);
  }

  async expectRequiredFieldErrors(count = 1) {
    await expect(this.fieldRequiredError.first()).toBeVisible();
    await expect(this.fieldRequiredError).toHaveCount(count);
  }

  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}
