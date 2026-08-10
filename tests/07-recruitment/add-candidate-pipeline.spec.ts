import path from 'path';
import { test, expect } from '../../src/fixtures';
import { randomCandidate, randomVacancy } from '../../src/utils/random';
import { PublicJobListingPage } from '../../src/pages/recruitment/PublicJobListingPage';

const SAMPLE_RESUME = path.join(__dirname, '..', '..', 'test-assets', 'sample-resume.txt');

/**
 * Workflow 7 — Recruitment: Add Candidate & Move Through the Hiring Pipeline.
 * Covers every way a candidate actually enters and moves through the
 * pipeline — sourced directly by an Admin, or arriving on their own through
 * the public "Web Page" job listing (Workflow 6's own Vacancy is the
 * prerequisite either path needs, but *applying* to one is a candidate-side
 * outcome, so it lives here) — through the first pipeline transition
 * (shortlist) and back out again (removal).
 */
test.describe('Workflow 7 — Recruitment Pipeline', () => {
  test('adds a candidate and finds them in the candidate list', async ({ recruitmentPage }) => {
    const candidate = randomCandidate();
    const fullName = `${candidate.firstName} ${candidate.lastName}`;

    await recruitmentPage.addCandidate(candidate);

    await recruitmentPage.openCandidateList();
    await recruitmentPage.expectCandidateVisible(fullName);
  });

  test('a candidate who applies through the public "Web Page" job listing shows up as a real Candidate', async ({
    vacancyPage,
    recruitmentPage,
  }) => {
    const vacancy = randomVacancy();
    await vacancyPage.addVacancy(vacancy);

    await vacancyPage.openList();
    await vacancyPage.clickAdd();
    const publicPage = await vacancyPage.openPublicJobListingInNewTab();
    const publicJobListingPage = new PublicJobListingPage(publicPage);

    const candidate = randomCandidate();
    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    await publicJobListingPage.apply(vacancy.name, {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      resumePath: SAMPLE_RESUME,
    });
    await publicPage.close();

    // The real proof the application portal works isn't the "Application
    // Received" message alone — a broken portal could still show that and
    // create nothing. It's that a genuine Candidate record now exists on
    // the Admin side, tied to this exact Vacancy. The Vacancy List page
    // itself has no per-vacancy application count to check (confirmed
    // live: its own table is just Vacancy/Job Title/Hiring Manager/Status/
    // Actions) — Recruitment's own Candidate list is where an application
    // actually shows up, the same list an Admin-created candidate lands on.
    await recruitmentPage.openCandidateList();
    await recruitmentPage.expectCandidateVisible(fullName);
    await recruitmentPage.expectCandidateStatus(fullName, 'Application Initiated');

    // Clean up the Vacancy this test created for itself.
    await vacancyPage.openList();
    await vacancyPage.deleteVacancy(vacancy.name);
  });

  test('shortlists a newly added candidate, confirmed independently from the candidate list itself', async ({
    recruitmentPage,
    vacancyPage,
  }) => {
    // A pre-existing, shared Vacancy on this never-reset demo can carry a
    // Hiring Manager reference that's since been deleted by some other
    // run — confirmed live: finalizing *any* status change against a
    // candidate on one of those fails outright with a generic
    // "Unexpected Error Occurred", unrelated to anything this test itself
    // does. Creating a fresh Vacancy first avoids that entirely — the same
    // "avoid the problem, don't just react to it" idiom already used for
    // Employee Id collisions.
    const vacancy = randomVacancy();
    await vacancyPage.addVacancy(vacancy);

    const candidate = randomCandidate();
    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    await recruitmentPage.addCandidate({ ...candidate, vacancyName: vacancy.name });

    await recruitmentPage.openCandidateList();
    // The button on the candidate's own page is labelled "Shortlist" (the
    // action verb), not "Shortlisted" (the resulting status shown elsewhere)
    // — and clicking it alone isn't the end of the story: it only opens a
    // confirmation form, which `advanceStage()` now completes.
    await recruitmentPage.advanceStage(fullName, 'Shortlist');

    // Cross-checked from a completely different screen than the one the
    // action was performed on, rather than trusting the confirmation
    // form's own toast alone — the same pattern Workflow 9 uses to confirm
    // a punch cycle from the Attendance Summary Report.
    await recruitmentPage.openCandidateList();
    await recruitmentPage.expectCandidateStatus(fullName, 'Shortlisted');

    // Clean up the Vacancy this test created for itself.
    await vacancyPage.openList();
    await vacancyPage.deleteVacancy(vacancy.name);
    await expect(vacancyPage.rowByName(vacancy.name)).toHaveCount(0);
  });

  test('removes a candidate from the pipeline entirely', async ({ recruitmentPage }) => {
    const candidate = randomCandidate();
    const fullName = `${candidate.firstName} ${candidate.lastName}`;

    await recruitmentPage.addCandidate(candidate);
    await recruitmentPage.openCandidateList();
    await recruitmentPage.expectCandidateVisible(fullName);

    await recruitmentPage.deleteCandidate(fullName);
    await expect(recruitmentPage.rowByCandidateName(fullName)).toHaveCount(0);
  });
});
