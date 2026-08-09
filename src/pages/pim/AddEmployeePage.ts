import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import { randomEmployeeId } from '../../utils/random';

export interface NewEmployeeInput {
  firstName: string;
  middleName?: string;
  lastName: string;
}

export class AddEmployeePage extends BasePage {
  private readonly firstNameInput = this.page.locator('input[name="firstName"]');
  private readonly middleNameInput = this.page.locator('input[name="middleName"]');
  private readonly lastNameInput = this.page.locator('input[name="lastName"]');
  private readonly employeeIdInput = this.page
    .locator('.oxd-input-group')
    .filter({ has: this.page.locator('label', { hasText: 'Employee Id' }) })
    .locator('input');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly employeeIdCollisionError = this.page.getByText('Employee Id already exists');
  // The only file input on this form — no name/id/label to disambiguate by,
  // but there's exactly one, so a bare type selector is unambiguous here.
  private readonly photoInput = this.page.locator('input[type="file"]');
  // This widget has no filename text anywhere (unlike Add Candidate's Resume
  // field) — the only visible confirmation a file was actually picked is this
  // `<img>` preview's `src` swapping from the static default-photo path to a
  // `data:image/...;base64,...` URI of the picked file's own bytes.
  private readonly photoPreview = this.page.locator('img.employee-image');

  private lastFilledEmployee: NewEmployeeInput | undefined;
  private lastPhotoPath: string | undefined;

  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/pim/addEmployee');
    await this.firstNameInput.waitFor();
    // The server pre-fills this field with its own next sequential value —
    // confirmed live to be a plain, editable 4-digit text input, not a
    // read-only display. Overwriting it with our own random 4-digit value
    // up front sidesteps the exact collision `save()` below still retries
    // around, rather than only reacting to it after the fact.
    await this.setRandomEmployeeId();
  }

  private async setRandomEmployeeId() {
    await this.employeeIdInput.click();
    await this.employeeIdInput.press('Control+A');
    await this.employeeIdInput.press('Delete');
    await this.employeeIdInput.pressSequentially(randomEmployeeId());
  }

  async fillEmployeeName(employee: NewEmployeeInput) {
    this.lastFilledEmployee = employee;
    await this.firstNameInput.fill(employee.firstName);
    if (employee.middleName) await this.middleNameInput.fill(employee.middleName);
    await this.lastNameInput.fill(employee.lastName);
  }

  /** Uploads a profile photo via the form's single `<input type="file">`. */
  async uploadPhoto(filePath: string) {
    this.lastPhotoPath = filePath;
    await this.photoInput.setInputFiles(filePath);
  }

  async expectPhotoPreviewUpdated() {
    await expect(this.photoPreview).toHaveAttribute('src', /^data:image/);
  }

  /**
   * The saved employee's numeric Id, read from the URL after `save()` lands
   * on their Personal Details page. Reading the Employee Id *field* doesn't
   * work here — Personal Details has no "Employee Id"-labelled field in the
   * same structure Add Employee does, so that locator matches nothing and
   * silently yields an empty string. The URL is also the only value guaranteed
   * to reflect the Id actually saved if `save()` had to retry after a collision.
   */
  currentEmployeeIdFromUrl(): string {
    const match = this.page.url().match(/empNumber\/(\d+)/);
    if (!match) {
      throw new Error(`AddEmployeePage.currentEmployeeIdFromUrl(): not on a Personal Details URL (${this.page.url()})`);
    }
    return match[1];
  }

  /**
   * `open()` already overwrites the server's own pre-filled Employee Id with
   * a fresh random one, so a collision here means that random 4-digit value
   * happened to already be taken too — still possible on a shared, never-reset
   * demo instance with thousands of existing records, just far less likely
   * than colliding with everyone else's shared sequential default. Retry by
   * reloading the form and setting a *new* random Id, rather than trusting
   * whatever the server pre-fills next (which is exactly the value under
   * contention in the first place).
   *
   * A hard reload (rather than a goto() back to this same URL, which a
   * client-side router can no-op on) is also what actually clears the
   * collision error itself — confirmed live that typing a new Id into the
   * field alone does *not* hide the still-visible error from the previous
   * attempt, so checking for it again without reloading first risks reading
   * that stale, already-visible element instead of a genuine new result.
   *
   * 7, then 15, consecutive collisions were observed here directly (not
   * guessed) during periods of unusually heavy concurrent traffic on the
   * shared demo — other users/automation were active enough at the time to
   * also flip this same instance's Work Week configuration mid-investigation
   * (see `AssignLeavePage.assign()`). The budget below is sized for that
   * heavier-than-typical contention rather than the lighter load this retry
   * was originally written against.
   */
  async save() {
    const attempts = 15;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await this.saveButton.click();

      const outcome = await Promise.race([
        this.page
          .waitForURL(/pim\/viewPersonalDetails/, { timeout: 20_000 })
          .then(() => 'saved' as const)
          .catch(() => 'timeout' as const),
        this.employeeIdCollisionError
          .waitFor({ state: 'visible', timeout: 20_000 })
          .then(() => 'collision' as const)
          .catch(() => 'timeout' as const),
      ]);

      if (outcome === 'saved') return;

      if (outcome === 'collision') {
        if (attempt === attempts) {
          throw new Error(`AddEmployeePage.save(): Employee Id collided ${attempts} times in a row`);
        }
        if (!this.lastFilledEmployee) {
          throw new Error('AddEmployeePage.save(): Employee Id collided but no employee name was filled in to retry with');
        }
        // The reload also clears any file already picked in the photo input,
        // so it needs re-attaching too, not just the name fields.
        await this.page.reload();
        await this.firstNameInput.waitFor();
        await this.setRandomEmployeeId();
        await this.fillEmployeeName(this.lastFilledEmployee);
        if (this.lastPhotoPath) await this.uploadPhoto(this.lastPhotoPath);
        continue;
      }

      // Neither a collision nor the expected navigation showed up in time —
      // fall through to the original wait so the failure surfaces with
      // Playwright's own descriptive timeout error.
      await this.page.waitForURL(/pim\/viewPersonalDetails/);
      return;
    }
  }

  async addEmployee(employee: NewEmployeeInput) {
    await this.open();
    await this.fillEmployeeName(employee);
    await this.save();
  }

  async expectOnPersonalDetailsPage() {
    // The header breadcrumb only ever shows the module name ("PIM"), not the
    // sub-page, on this page — the URL is the reliable signal of navigation.
    await expect(this.page).toHaveURL(/pim\/viewPersonalDetails/);
    await expect(this.firstNameInput).toBeVisible();
  }
}
