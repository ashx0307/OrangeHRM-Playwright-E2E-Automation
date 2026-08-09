import { test, expect } from '../../src/fixtures';
import { randomVacancy } from '../../src/utils/random';

/**
 * Workflow 7 — Recruitment: Vacancy Management (Admin).
 * A Vacancy is the prerequisite every candidate needs an application stage at
 * all (a candidate with no Vacancy never gets a Status/Reject/Shortlist
 * section on their own page — see RecruitmentPage) — this workflow covers
 * creating one directly, independent of the candidate pipeline in Workflow 7.
 */
test.describe('Workflow 7 — Recruitment Vacancy Management', () => {
  test('Admin adds a vacancy and it appears in the Vacancies list', async ({ vacancyPage }) => {
    const vacancy = randomVacancy();

    await vacancyPage.addVacancy(vacancy);

    await vacancyPage.openList();
    await vacancyPage.expectVacancyVisible(vacancy.name);
  });

  test('Add Vacancy\'s "Web Page" link opens the public job listing in a new tab', async ({ vacancyPage }) => {
    await vacancyPage.openList();
    await vacancyPage.clickAdd();

    const publicListingPage = await vacancyPage.openPublicJobListingInNewTab();
    await expect(publicListingPage).toHaveURL(/recruitmentApply\/jobs\.html/);
    await expect(publicListingPage).toHaveTitle('OrangeHRM');
    await publicListingPage.close();
  });
});
