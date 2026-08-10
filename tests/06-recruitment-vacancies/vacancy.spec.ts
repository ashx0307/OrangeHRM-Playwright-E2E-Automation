import { test, expect } from '../../src/fixtures';
import { randomVacancy } from '../../src/utils/random';

/**
 * Workflow 6 — Recruitment: Vacancy Management (Admin).
 * A Vacancy is the prerequisite every candidate needs an application stage at
 * all (a candidate with no Vacancy never gets a Status/Reject/Shortlist
 * section on their own page — see RecruitmentPage) — this workflow covers
 * its own CRUD lifecycle (add, list, delete) independent of the candidate
 * pipeline in Workflow 7. What a Vacancy is actually *for* — a candidate
 * finding and applying to it through the public "Web Page" listing — is a
 * candidate-side outcome, not a vacancy-management one, so that flow lives
 * in Workflow 7 instead, alongside the rest of the candidate pipeline.
 */
test.describe('Workflow 6 — Recruitment Vacancy Management', () => {
  test('Admin adds a vacancy, confirms it listed, then deletes it', async ({ vacancyPage }) => {
    const vacancy = randomVacancy();

    await vacancyPage.addVacancy(vacancy);
    await vacancyPage.openList();
    await vacancyPage.expectVacancyVisible(vacancy.name);

    await vacancyPage.deleteVacancy(vacancy.name);
    await expect(vacancyPage.rowByName(vacancy.name)).toHaveCount(0);
  });
});
