import { test, expect } from '../../src/fixtures';
import { randomJobTitle } from '../../src/utils/random';

/**
 * Workflow 8 — Admin: Job Titles Management.
 * Job Titles are the pool every "Job Title" dropdown elsewhere in the app
 * (Add Employee, Add Vacancy) draws from — this workflow covers the full
 * CRUD loop for the admin side of that data: add, confirm it's listed, delete.
 */
test.describe('Workflow 8 — Admin Job Titles Management', () => {
  test('Admin adds a job title, finds it listed, then deletes it', async ({ jobTitlePage }) => {
    const jobTitle = randomJobTitle();

    await jobTitlePage.addJobTitle(jobTitle);

    await jobTitlePage.open();
    await jobTitlePage.expectJobTitleVisible(jobTitle.title);

    await jobTitlePage.deleteJobTitle(jobTitle.title);
    await jobTitlePage.open();
    await expect(jobTitlePage.rowByTitle(jobTitle.title)).toHaveCount(0);
  });
});
