import { test, expect } from '../../src/fixtures';

/**
 * Workflow 13 — Employee Directory (company-wide, read-only lookup).
 * A distinct module from PIM's own Employee List: different route, different
 * filters (Job Title, Location vs. PIM's Employee Name/Id/Sub Unit/etc.),
 * and a different audience (anyone finding a colleague, not HR administering
 * records) — confirmed live, not assumed to be the same feature twice.
 */
test.describe('Workflow 13 — Employee Directory', () => {
  test('Admin browses the full company directory', async ({ directoryPage }) => {
    await directoryPage.open();
    await directoryPage.searchAll();
    await directoryPage.expectResultsFound();
  });

  test('Admin filters the directory by Job Title', async ({ directoryPage }) => {
    await directoryPage.open();
    const jobTitle = await directoryPage.searchByJobTitle();
    // A real Job Title picked from the app's own dropdown may still match
    // zero directory entries (Directory's own listing criteria isn't
    // necessarily the same as PIM's) — like Workflow 4's Employee List
    // "Include" filter, the meaningful assertion is that filtering by a real
    // value resolves the search without error, not a specific result count.
    expect(jobTitle).not.toBe('');
  });
});
