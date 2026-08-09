import { test, expect } from '../../src/fixtures';
import { randomCandidate } from '../../src/utils/random';

/**
 * Workflow 6 — Recruitment: Add Candidate & Move Through the Hiring Pipeline.
 * Covers sourcing (add candidate) through the first pipeline transition
 * (shortlist), the two steps every recruitment flow starts with.
 */
test.describe('Workflow 6 — Recruitment Pipeline', () => {
  test('adds a candidate and finds them in the candidate list', async ({ recruitmentPage }) => {
    const candidate = randomCandidate();
    const fullName = `${candidate.firstName} ${candidate.lastName}`;

    await recruitmentPage.addCandidate(candidate);

    await recruitmentPage.openCandidateList();
    await recruitmentPage.expectCandidateVisible(fullName);
  });

  test('shortlists a newly added candidate', async ({ recruitmentPage }) => {
    const candidate = randomCandidate();
    const fullName = `${candidate.firstName} ${candidate.lastName}`;

    await recruitmentPage.addCandidate(candidate);
    await recruitmentPage.openCandidateList();
    // The button on the candidate's own page is labelled "Shortlist" (the
    // action verb), not "Shortlisted" (the resulting status shown elsewhere).
    await recruitmentPage.advanceStage(fullName, 'Shortlist');
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
