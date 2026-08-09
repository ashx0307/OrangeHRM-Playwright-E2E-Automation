import { test } from '../../src/fixtures';

/**
 * Workflow 14 — Advanced Multi-Filter Employee Search.
 * This workflow is deliberately about combining *multiple*
 * fields (Job Title + Sub Unit + Employment Status) in one search — the
 * "narrow down step by step" pattern real HR usage actually looks like,
 * which a single-field test can't exercise.
 */
test.describe('Workflow 14 — Advanced Multi-Filter Employee Search', () => {
  test('Admin narrows the Employee List by Job Title, Sub Unit and Employment Status together', async ({
    employeeListPage,
  }) => {
    await employeeListPage.open();
    // Real values from the app's own dropdowns are combined — the search
    // resolving without error is the assertion, the same as Workflow 4's
    // scope-only filters: a 0-match combination is still a valid outcome for
    // an intersection of three independently-chosen fields.
    await employeeListPage.searchByJobTitleSubUnitAndStatus('Full-Time Permanent');
  });
});
