# OrangeHRM E2E Automation Framework

An end-to-end UI test automation framework built with **Playwright + TypeScript**,
targeting the public **[OrangeHRM demo](https://opensource-demo.orangehrmlive.com/web/index.php/auth/login)**
(`Admin` / `admin123`).

This isn't a single-feature smoke suite — it's a small but complete framework built
to demonstrate how the core Playwright concepts fit together in one coherent
project: the **Page Object Model**, **custom fixtures**, and **data-driven
testing**, applied across **16 Admin-focused HRM business-workflow specs**
(37 tests total) rather than disconnected demo scripts.

> **On the workflow numbering:** each spec file's `test.describe` block is
> labelled `Workflow N` in the order it was built, matching the `tests/NN-*`
> directory it lives in — with one exception worth calling out plainly rather
> than hiding: **`Workflow 1` is used twice** (`00-authentication` and
> `01-employee-onboarding`), a leftover from how this suite evolved in stages
> rather than a numbering bug to "fix" — the directory prefix (`00`–`15`) is
> the actual unambiguous index; the in-code label is a description, not a
> primary key. See [Section 5](#5-the-16-workflows) for the full, verified list.

> **Scope note:** this suite is currently **Admin-only**. Employee Self-Service
> (ESS) role coverage — apply-for-leave, ESS profile self-service, and the
> approve/reject side of Leave — isn't implemented, since testing it
> meaningfully requires a second authenticated role and its own
> session-management concerns. It could be added later behind a second
> `setup-ess` project and `essPage`-style fixtures, following the same
> patterns this suite already uses for Admin.

---

## 1. Why OrangeHRM

OrangeHRM's demo is a realistic, multi-module HR system (Admin, PIM, Leave, Time,
Recruitment, Claim) with real custom UI components (Vue-based dropdowns,
autocompletes, modals, toasts) and a public instance that never needs local
setup. It's complex enough to justify a proper framework, and stable enough to
automate reliably — with the caveats about a *shared* public demo covered in
[Section 7](#7-running-the-suite).

## 2. What this suite covers

Rather than arbitrary UI interactions, the suite follows the actual HR lifecycle
an employee's record moves through, plus the platform-administration and
supporting data (job titles, vacancies) it depends on:

```
Authenticate → Onboard the employee → Maintain their record → Offboard
     ↓                   ↓                       ↓                ↓
(Workflow 1)   (Workflow 1, 2, 3, 15)   (Workflow 5, 10, 11,   (Workflow 4)
                                          12, 14)

  Leave (5), Recruitment Vacancies & Pipeline (6–7), Job Titles (8),
  Attendance (9) and Directory (13) round out the platform-administration
                and reference data the lifecycle above depends on
```

Every workflow is a spec file with a clear "why this, not something else"
rationale — see [Section 5](#5-the-16-workflows) for the full breakdown.

## 3. Playwright concepts covered

| Concept                                                | Where                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Page Object Model (POM)**                        | Every screen is a class under [`src/pages/`](src/pages/), extending a shared [`BasePage`](src/pages/BasePage.ts) that centralizes the label-based locator strategy the whole app's form components share.                                                             |
| **Custom fixtures**                                | [`src/fixtures/index.ts`](src/fixtures/index.ts) composes fixtures on top of Playwright's `test`: one pre-authenticated `adminPage` (with automatic re-login if its session has expired), plus a Page-Object fixture per screen built on top of it.                    |
| **Data-driven testing**                            | Invalid-login combinations (Workflow 1/Authentication), both system-user platform roles (Workflow 3), and the three Employee List scope filters (Workflow 2) — see [`src/data/`](src/data/).                                                                          |
| **Setup projects / global auth**                   | [`tests/setup/admin.setup.ts`](tests/setup/admin.setup.ts) logs in as Admin *once* per run and persists `storageState` — every other spec starts already authenticated. `ensureSession()` in `src/fixtures/index.ts` transparently re-authenticates if that session expires mid-run. |
| **Auto-waiting & web-first assertions**            | No manual `waitForTimeout` sleeps in test logic; every action either uses Playwright's built-in actionability waits or an explicit `expect(...).toBeVisible()`/`toHaveURL()`.                                                                                          |
| **Cross-browser projects**                         | Chromium is the default (`npm test`); Firefox/WebKit are configured and opt-in (`npm run test:cross-browser`) — see [Section 7](#7-running-the-suite).                                                                                                                 |
| **Traces, screenshots, video, HTML/JUnit reports** | Configured in [`playwright.config.ts`](playwright.config.ts): trace on first retry, screenshot on failure, video retained on failure, HTML report for local triage, JUnit XML (`test-results/junit.xml`) for CI systems that ingest that format.                       |
| **Sharding**                                       | `npm run test:shard1` / `test:shard2` split the suite across two `--shard` invocations — see [Section 7](#7-running-the-suite).                                                                                                                                        |
| **Checkboxes & radio buttons** (`.check()`, `isChecked()`) | Workflow 1/Onboarding's Gender radios — see [`PersonalDetailsPage.setGender()`](src/pages/pim/PersonalDetailsPage.ts). `RecruitmentPage` has the same label-click handling built for a consent checkbox, but no current spec drives it — see the design note in Section 8. |
| **File upload** (`.setInputFiles()`)               | Workflow 1/Onboarding's profile-photo upload and Workflow 12's document upload, against sample files in [`test-assets/`](test-assets/).                                                                                                                                |
| **New tab / window** (`context.waitForEvent('page')`) | Workflow 7's own use of the "Web Page" link, which opens OrangeHRM's public job listing in a new tab — see [`VacancyPage.openPublicJobListingInNewTab()`](src/pages/recruitment/VacancyPage.ts). That new tab is then driven by its own page object, [`PublicJobListingPage`](src/pages/recruitment/PublicJobListingPage.ts), to submit a real job application — see Section 8. |
| **Network mocking** (`page.route()`)               | A Workflow 3 test stubs the System Users list's own API call with a fulfilled 500 to verify the UI degrades gracefully (empty state + error toast) — UI-only, no real API assertions.                                                                                 |
| **Explicit hooks** (`test.beforeEach()`)           | Workflow 2's Include-filter cases share one `beforeEach` that opens the Employee List, instead of repeating that call inside every data-driven case.                                                                                                                   |
| **Custom autocomplete-binding handling**           | Workflow 15/Claim's Employee Name field binds to "First Middle Last" — a different binding shape from every other Employee Name autocomplete in the app ("First Last" only) — handled by `ClaimPage`'s own `selectEmployee()` rather than the shared helper. See Section 8. |
| **Cross-screen verification of a stateful action** | Workflow 9's punch cycle is confirmed independently from Time > Reports > Attendance Summary (`AttendanceSummaryReportPage`), not just from the punch action's own toast — see Section 8 for why that comparison is a "not decreased" check rather than an exact value. |

## 4. Project structure

```
playwright_ts_automation/
├── playwright.config.ts        # projects, timeouts, reporters
├── tsconfig.json
├── .env.example                 # BASE_URL / ADMIN_USERNAME / ADMIN_PASSWORD
├── src/
│   ├── config/env.ts             # env loading + storageState file path
│   ├── pages/                    # Page Object Model
│   │   ├── BasePage.ts           # shared label-based locator helpers, toasts, nav
│   │   ├── LoginPage.ts / DashboardPage.ts / DirectoryPage.ts
│   │   ├── admin/{AdminUserPage,JobTitlePage}.ts
│   │   ├── pim/{AddEmployeePage,EmployeeListPage,PersonalDetailsPage,
│   │   │        ContactDetailsPage,JobDetailsPage,EmergencyContactsPage}.ts
│   │   ├── leave/{AssignLeavePage,LeaveListPage,EntitlementsPage}.ts
│   │   ├── time/{AttendancePage,AttendanceSummaryReportPage}.ts
│   │   ├── recruitment/{RecruitmentPage,VacancyPage,PublicJobListingPage}.ts
│   │   └── claim/ClaimPage.ts
│   ├── fixtures/index.ts         # all custom fixtures (adminPage + page objects)
│   ├── data/                     # data-driven test tables
│   │   ├── invalid-login.data.ts
│   │   ├── system-user-roles.data.ts
│   │   └── employee-search.data.ts
│   └── utils/{random,date}.ts    # faker-based unique test data
├── test-assets/                  # sample-photo.png / sample-resume.txt for .setInputFiles()
├── tests/
│   ├── setup/admin.setup.ts                       # Admin login, persists storageState
│   ├── 00-authentication/                         # Workflow 1 — Authentication
│   ├── 01-employee-onboarding/                    # Workflow 1 — Complete Employee Onboarding
│   ├── 02-pim-search-update-employee/             # Workflow 2
│   ├── 03-admin-user-management/                  # Workflow 3
│   ├── 04-pim-employee-lifecycle/                 # Workflow 4 — Offboarding
│   ├── 05-leave-management/                       # Workflow 5 — Assign Leave
│   ├── 06-recruitment-vacancies/                  # Workflow 6 — Vacancy Management
│   ├── 07-recruitment/                            # Workflow 7 — Candidate pipeline
│   ├── 08-admin-job-titles/                       # Workflow 8
│   ├── 09-time-attendance/                        # Workflow 9
│   ├── 10-employee-transfer-status/                # Workflow 10
│   ├── 11-employee-contact-emergency/             # Workflow 11
│   ├── 12-employee-attachments/                   # Workflow 12
│   ├── 13-employee-directory/                     # Workflow 13
│   ├── 14-advanced-multi-filter-search/           # Workflow 14
│   └── 15-claim-management/                       # Workflow 15
└── playwright/.auth/             # generated storageState (gitignored)
```

## 5. The 16 workflows

| Dir | Workflow (as labelled in code)                | Key concepts exercised                                                                                                                                                                                            |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00  | **1 — Authentication**                     | Data-driven invalid-login matrix (wrong credentials, missing username/password/both); valid login; session-backed logout; forgot-password entry point. The gateway every other workflow depends on.             |
| 01  | **1 — Complete Employee Onboarding**       | Chains Add Employee (+ photo upload, + Gender radio) with provisioning an Admin login account as one continuous story, then verifies the result from both the PIM and System Users side.                        |
| 02  | **2 — PIM Search & Update Employee**       | Data-driven across the Employee List's three "Include" scope filters (Current/Past/Current & Past); updates an existing employee's Last Name via Personal Details and confirms it persisted.                    |
| 03  | **3 — Admin User Management**              | Full CRUD on platform accounts, data-driven across both roles (`Admin`, `ESS`); non-existent-username search; disabling then re-enabling an *existing* account via its own row; a `page.route()`-mocked 500 on the list's API call. |
| 04  | **4 — PIM Employee Offboarding**           | Deletes an employee record via its confirmation modal and verifies the row is actually gone from the list.                                                                                                       |
| 05  | **5 — Assign Leave (Admin)**               | Grants a leave entitlement, then Admin books leave directly on an employee's behalf; confirms it finalizes immediately with no approval step (lands as *Scheduled* or *Taken* depending on the submitted date — see Section 8 — but never *Pending Approval*). |
| 06  | **6 — Recruitment Vacancy Management**     | Full Vacancy CRUD (add, list, delete, verify gone) — the reference record every candidate needs an application stage at all, created and deleted independently of the candidate pipeline in Workflow 7.  |
| 07  | **7 — Recruitment Pipeline**               | Every way a candidate enters and moves through the pipeline: sourced directly by an Admin; arriving through the public "Web Page" job listing (confirming a real Candidate record lands on the Admin side, not just that the link opens); shortlisted — confirming the shortlist's own confirmation-form Save actually finalized, independently cross-checked from the Candidate List's own Status column, the same idiom Workflow 9 uses; and removed from the pipeline entirely. Creates and deletes its own Vacancy for each case that needs one, to avoid a shared, pre-existing Vacancy's own broken Hiring Manager reference (see Section 8). |
| 08  | **8 — Admin Job Titles Management**        | The reference data every "Job Title" dropdown elsewhere (Add Employee, Add Vacancy) draws from: add, confirm listed, delete.                                                                                     |
| 09  | **9 — Attendance Punch In/Out (Admin)**    | A stateful, server-side punch cycle performed as Admin (this shared demo's `Admin` login has its own linked employee record) — reads current state first, so it's correct regardless of prior runs. Independently cross-checked from Time > Reports > Attendance Summary: that report's cumulative total for the same employee is confirmed to not have decreased across the cycle. |
| 10  | **10 — Employee Transfer & Status Change** | PIM > Job tab: reassigns Job Title/Sub Unit, and converts Employment Status Probation → Permanent — confirmed live to be an employment *type* field, not an Active/Terminated lifecycle state.                   |
| 11  | **11 — Contact Details & Emergency Contacts** | Updates the address fields on Contact Details and adds an Emergency Contact — two separate PIM routes with their own left-nav entries, not the same widget.                                                   |
| 12  | **12 — Employee Document Attachments**     | Uploads and deletes a document via the Attachments widget embedded at the bottom of Personal Details (confirmed live: not a separate top-level tab) — a distinct upload surface from the onboarding photo upload. |
| 13  | **13 — Employee Directory**                | The company-wide, read-only Directory module — a different route and different filters (Job Title, Location) from PIM's own Employee List.                                                                      |
| 14  | **14 — Advanced Multi-Filter Employee Search** | Combines Job Title + Sub Unit + Employment Status in one Employee List search, distinct from Workflow 2's single-field "Include" filter.                                                                       |
| 15  | **15 — Claim Management**                  | Assigns a claim to an employee, confirms it starts "Initiated," submits it, and confirms it resolves straight to "Paid" — the same "no approval step" shape as Assign Leave, on a different module.              |

## 6. End-to-end flow

```mermaid
flowchart TD
    subgraph Setup["tests/setup (once per run)"]
        S1[Login as Admin] --> S4[Save Admin storageState]
    end

    S4 --> W1a["1 . Authentication"]
    S4 --> W1b["1 . Complete Onboarding"]
    S4 --> W2["2 . PIM Search & Update"]
    S4 --> W3["3 . Admin User Management"]
    S4 --> W4["4 . PIM Offboarding"]
    S4 --> W5["5 . Assign Leave"]
    S4 --> W6["6 . Vacancy Management"]
    S4 --> W7["7 . Recruitment Pipeline"]
    S4 --> W8["8 . Job Titles Management"]
    S4 --> W9["9 . Attendance Punch In/Out"]
    S4 --> W10["10 . Transfer & Status Change"]
    S4 --> W11["11 . Contact & Emergency Details"]
    S4 --> W12["12 . Document Attachments"]
    S4 --> W13["13 . Employee Directory"]
    S4 --> W14["14 . Advanced Multi-Filter Search"]
    S4 --> W15["15 . Claim Management"]

    W8 -. Job Title is reference data Add Employee/Add Vacancy draw from .-> W1b
    W8 -. .-> W6

    style Setup fill:#f5f5f5,stroke:#999
```

Most workflows create their own employee inline via `addEmployeePage.addEmployee()`
rather than depending on a separate "Add Employee" spec having run first — there
is no longer a standalone Add Employee workflow; every workflow that needs an
employee record creates its own fresh one via `randomEmployee()`, which keeps
each test independent and collision-resistant on this shared, never-reset demo.

## 7. Running the suite

```bash
npm install
npx playwright install        # first time only — installs browser binaries

npm test                      # setup project + all 16 workflow specs, Chromium
npm run test:headed           # same, with a visible browser
npm run test:ui               # Playwright's interactive UI mode
npm run test:debug            # Playwright Inspector, step through actions
npm run test:cross-browser    # adds Firefox + WebKit
npm run test:report           # opens the last HTML report
npm run test:shard1           # first half of the suite (--shard=1/2)
npm run test:shard2           # second half of the suite (--shard=2/2)
```

Sharding splits the *same* suite across multiple machines/processes for wall-clock
speedup — `test:shard1`/`test:shard2` are one concrete 2-way split; CI could run
each as its own parallel job and merge the JUnit results after.

Environment variables (optional — defaults already point at the public demo):

```bash
cp .env.example .env
```

CI runs the same `npm test` on every push/PR via
[`.github/workflows/playwright.yml`](.github/workflows/playwright.yml), uploading
both the HTML report and `test-results/` (traces, screenshots, video, and the
JUnit XML — the report only *links* to these, it doesn't embed them) as build
artifacts.

There is no `webServer` entry in `playwright.config.ts` — that field boots a
*locally-built* app before the run starts, which doesn't apply here: the target
is OrangeHRM's already-running public demo, not something this repo builds
or serves itself.

### A note on the target site

This suite runs against OrangeHRM's **shared public demo**, not a private
environment: it is noticeably slower than a real app under test, its data is
never reset, and its dataset grows with everyone's runs — including this suite's.
`playwright.config.ts` reflects that on purpose (generous timeouts, capped
worker count, 2 retries locally, `randomEmployee()`/`randomCandidate()` helpers
with unique suffixes so parallel/repeated runs never collide). Point `BASE_URL`
at a private instance and those settings can be tightened.

Every workflow in this suite has been driven against the live demo during
development to find and fix real, non-obvious defects (see [Section 8](#8-design-notes-worth-knowing))
— this wasn't written from documentation alone. That said, the public demo's
own response time is genuinely variable: under sustained heavy use it has been
slow enough to time out even a plain "click Save" a few requests in a row, or
to race a fresh navigation against another action's own in-flight redirect
(`net::ERR_ABORTED`), independent of any selector or logic issue.
`BasePage.goto()` retries once on exactly that error for this reason. If a run
still comes back with plain navigation timeouts, that's the demo server, not
the framework — re-running (or pointing at a private instance) is the fix, not
editing a locator.

During periods of unusually heavy demo contention, `AddEmployeePage.save()` has
hit double-digit consecutive Employee-Id collisions on otherwise-unrelated
workflows in the same run, and Assign Leave's own "Successfully Saved" toast
has appeared before the just-created record was reliably visible in an
immediate Leave List search — the same class of index/read-after-write lag
documented for Employee List's own search. Both are handled by retrying the
specific, detected failure (a fresh random Employee Id; re-running the search)
rather than by inflating a blanket wait — see Section 8 for the details.

## 8. Design notes worth knowing

- **Label-based locators, not brittle CSS.** OrangeHRM's Vue components don't
  consistently expose `name`/`id` attributes, so `BasePage.inputByLabel()` /
  `dropdownByLabel()` / `textareaByLabel()` locate a field via its visible label
  text and scope strictly to that field's own `.oxd-input-group` — not the
  shared grid row it sits in, which multi-field forms (e.g. Admin > Add User)
  reuse across several fields. A plain label string can still be ambiguous
  when one label is a substring of another on the same form (e.g. "Password"
  vs. "Current Password") — these helpers accept a RegExp for that case.
- **Autocomplete selection waits out the "Searching...." placeholder.** The
  suggestion dropdown renders a loading placeholder with the same `role="option"`
  as real results; selecting the first `option` without excluding it can click
  that placeholder and silently fail to bind a real employee.
  `BasePage.selectAutocompleteOption()` also retries if the click lands but the
  input is left holding the raw typed text instead of a real bound value.
- **Claim's Employee Name autocomplete doesn't bind the same way every other
  one in the app does.** Every other Employee Name field (Add User, Assign
  Leave, Entitlements, Leave List search, Employee List search) binds to
  "First Last" only, which is exactly what `randomEmployee().fullName` is
  built to match. Claim's own Employee Name field, confirmed live, binds to
  "First Middle Last" instead — searching and then validating against
  "First Last" there fails every time. `ClaimPage.selectEmployee()` searches
  using "First Last" (to actually find the suggestion) but validates the
  post-click bound value against "First Middle Last" — the shared
  `selectAutocompleteOption()` helper can't be reused as-is for this one field.
- **Clicking a candidate's "Shortlist" (or "Reject") button doesn't finalize
  anything by itself.** Confirmed live: it only navigates to its own
  confirmation form (`changeCandidateVacancyStatus?candidateId=X&selectedAction=N`)
  showing the Candidate/Vacancy/Hiring Manager/Current Status read-only and
  an optional Notes field — the candidate's actual status doesn't change
  until that form's own Save is clicked too. The original version of
  Workflow 6's shortlist test only clicked the button and stopped there,
  so it never actually verified the status changed at all; `advanceStage()`
  now completes the confirmation form, and the spec cross-checks the result
  from the Candidate List's own Status column afterward — the same
  "verify from a second screen, not just the action's own toast" idiom
  `AttendanceSummaryReportPage` uses for Workflow 9.
- **That confirmation form can fail outright with a generic "Unexpected
  Error Occurred" if the candidate's Vacancy has a Hiring Manager reference
  that's since been deleted** — confirmed live, reproducibly, against one of
  this shared demo's own pre-existing Vacancies (accumulated over who knows
  how many other runs, several of which now show `(Deleted)` as their
  Hiring Manager on the Vacancy List itself). This has nothing to do with
  the candidate or the shortlist action — it's a real, standing data-
  integrity defect on this specific shared instance. Creating a fresh
  Vacancy (with a Hiring Manager picked moments earlier, guaranteed still
  live) before shortlisting sidesteps it entirely, the same "avoid the
  problem, don't just react to it" idiom already used for Employee Id
  collisions — and that fresh Vacancy is deleted again once the test is
  done with it, so this suite's own runs don't add to that same pile.
- **The public job-application form genuinely requires a Résumé — the
  Admin-side Add Candidate form does not.** Confirmed live: submitting the
  public `/recruitmentApply/applyVacancy/id/N` form without a file attached
  is silently rejected with an inline "Required" error and creates nothing,
  even though every other field on that form (Contact Number, Keywords,
  Notes, Consent) is genuinely optional. `PublicJobListingPage.apply()`
  always attaches one for exactly this reason.
- **A submitted public application does land as a real Candidate record**
  — same shape, same "Application Initiated" starting status, as one added
  directly by an Admin — confirmed live by searching the Admin-side
  Candidate list by name right after submitting. The Vacancy List page
  itself has no per-vacancy application count anywhere in its own table
  (just Vacancy/Job Title/Hiring Manager/Status/Actions, confirmed live) —
  so despite the feature living on the Vacancy screen, the Candidate list is
  the only place that actually proves an application went through.
- **A dropdown's own placeholder is a selectable option.** `"-- Select --"`
  renders as a real `.oxd-select-option`, so "pick the first option" helpers
  must exclude it explicitly — otherwise "pick anything" ends up picking
  nothing at all. The same applies to a literal "No Records Found" placeholder
  when a list is asynchronously loaded and queried too early (see below).
- **A list's option data can load asynchronously after the dropdown itself is
  interactive.** Opening a Vacancy's Job Title dropdown, or a candidate's own
  Vacancy dropdown, right after the form renders can catch a stale "No
  Records Found" placeholder rather than the real, just-fetched options —
  `VacancyPage.selectJobTitle()` / `RecruitmentPage.selectVacancy()` both
  retry the open-and-check cycle for exactly this reason.
- **What a Leave date field actually submits doesn't reliably match what was
  typed.** Two separate live investigations of this exact masked field
  produced two different results — once fully verbatim, once with day and
  month swapped from what was typed — confirmed both times by inspecting the
  real `POST .../leave-requests` payload directly, not assumed. Neither rule
  is safe to code against; this field's own display-value-vs-submitted-value
  handling is simply unreliable run to run. The practical fallout: a swap can
  silently push the assigned date into the past relative to the server's
  clock, and Admin-assigning leave for a past date finalizes it directly to
  **"Taken"** instead of "Scheduled" — a different status, but not a
  different underlying bug, and not a pending-approval state either.
  `LeaveListPage.searchByEmployeeName()` filters for Scheduled, Taken, *and*
  Rejected, and `expectStatus()` accepts an array of acceptable statuses —
  chasing the date widget's own inconsistency further wasn't worth it once it
  became clear the *actual* thing Workflow 5 needs to prove (no approval
  step) holds either way. The field is also a masked input that doesn't
  reliably accept a bulk `.fill()`; `BasePage.setDateField()` clicks in,
  clears via keyboard, and types character-by-character instead.
- **A leave request that doesn't touch a currently-configured working day is
  rejected outright** — `400 "Failed to Submit: No Working Days Selected"`
  from the real API, surfaced in the UI as an error toast reading exactly
  that (confirmed by inspecting both directly, not assumed). This demo's Work
  Week (`Admin > Configure > Work Week`) is shared, mutable, admin-editable
  state — and it was observed changing *mid-investigation*, so reading it
  live once up front isn't reliable either, since another concurrent user of
  the same public instance can flip it again before the actual submit.
  `AssignLeavePage.assign()` instead reacts to the actual rejection toast when
  it happens and retries the next calendar day — the same "detect the
  specific failure, retry with an adjustment" idiom `AddEmployeePage.save()`'s
  Employee-Id-collision retry already uses. Within any 7 consecutive days at
  least one is virtually guaranteed to be a working day under whatever the
  config currently is. That 7-day retry's own worst case can legitimately run
  longer than the suite's global 150s test timeout on a slow shared demo —
  Workflow 5's own spec raises its timeout via `test.setTimeout(300_000)`
  rather than inflating the global default for every other, much shorter
  workflow.
- **A brand-new employee has no leave entitlement and won't appear in "Assign
  Leave" at all**, not just show a zero balance. `EntitlementsPage` grants one
  first — and if the employee already has a 0.00 entitlement for that leave
  type/period, saving pops an "Existing Entitlement value 0.00 will be updated
  to X" confirmation modal that has to be accepted before the save actually
  goes through. Leave Periods are listed oldest-first, so picking blindly
  grants the wrong (long-expired) period — `EntitlementsPage` picks the
  current year specifically.
- **Assigned leave and an assigned claim both finalize immediately — neither
  has an approval step under Admin.** Unlike a self-service application,
  Admin booking leave (or assigning a claim) on someone's behalf never lands
  on a pending state. Leave usually finalizes to "Scheduled" (see the
  date-widget note above for why "Taken" is an equally valid, equally direct
  outcome); a Claim starts "Initiated" and goes straight to "Paid" the moment
  it's submitted, with nothing in between. Confirmed by inspecting a
  "Scheduled" leave row's own actions cell: only a three-dot overflow menu, no
  Approve/Reject buttons at all (those render only on a "Pending Approval" row).
- **`Locator.isVisible()` doesn't wait — it's a one-shot check.** Pairing an
  optional-element check with a real timeout requires
  `.waitFor({ state: 'visible', timeout }).catch(() => false)` instead;
  `isVisible({ timeout })` looks like it polls but doesn't, and silently
  returns `false` if the element hasn't rendered yet.
- **A row's edit and delete icon buttons share the same generic class**
  (`.oxd-icon-button`), and their DOM order isn't reliable enough to pick by
  position — `.last()` has landed on the wrong icon (or an unrelated overflow
  menu) more than once across different list screens. The trash-icon-specific
  class (`.bi-trash`) — or, where the action renders as its own labelled
  button rather than an icon, `getByRole('button', { name })` — is what
  actually disambiguates them.
- **"No Records Found" isn't unique to the table.** The same literal text also
  flashes as a toast on some actions, and the *real* empty-state message turns
  out to sit outside `.oxd-table` despite rendering right above its header —
  the tag (`<span>` vs. the toast's `<p>`) is what actually distinguishes them,
  not container scoping.
- **A cold `page.goto()` straight into a deep app route can render a blank
  page under load**, where navigating there the way a user would — a full load
  of a reliably-loading page (the dashboard) followed by a client-side route
  change via the sidebar — does not. `EmployeeListPage.open()` uses this
  pattern for exactly that reason; it's also how a genuinely wrong hard-coded
  route (`/attendance/punchInOut`, which 404s — the real route is
  `/attendance/punchIn`) surfaced during development.
- **The shared demo's Employee-Id collision rate isn't constant — it tracks
  how much *other* traffic the public instance is under at that moment.**
  `AddEmployeePage.save()`'s retry budget is 15 attempts, sized after directly
  observing 7, then 15, consecutive real collisions in a row during a period
  of unusually heavy concurrent use. This is a ceiling sized against
  worse-than-typical contention, not a bug in the retry itself.
- **The collision is avoidable up front, not just recoverable after the
  fact.** Employee Id turned out to be a plain, editable 4-digit text
  input — confirmed live, not a read-only display — the server just
  pre-fills it with its own next sequential value (e.g. `"0552"`). Every
  other concurrent user relying on that same unmodified default is exactly
  who it collides with. `AddEmployeePage.open()` overwrites it with its own
  random 4-digit value (`randomEmployeeId()`) before the first save attempt
  at all, and `save()`'s own collision retry generates a *new* random value
  on each reload rather than trusting the next sequential default — which is
  exactly the value under contention in the first place. This doesn't make a
  collision impossible (a shared, never-reset instance with thousands of
  existing records can still coincidentally reuse a random 4-digit value),
  but it avoids the specific, guaranteed-to-repeat collision every user of
  the unmodified default competes for. The retry still exists as a safety
  net for that residual chance, and because a hard `page.reload()` is also
  what actually clears the collision error message itself — confirmed live
  that typing a new Id into the field does *not* hide the still-visible
  error from a previous attempt, so checking for it again without reloading
  first risks reading that stale element instead of a genuine new result. A
  reload also clears any file already picked in the photo input, so `save()`
  re-attaches it too, not just the name fields, on every retry.
- **The shared demo's `Admin` login has its own linked employee record** —
  other users of the same public instance have edited it over time (its
  display name and Job Title change between runs), but the practical effect
  is that Admin-only self-service pages like Attendance Punch In/Out work
  for it directly, the same as any other employee. Don't assume "Admin" means
  "no employee record attached" on this particular target.
- **That same shared Admin attendance record can be left "Punched In" at a
  Date genuinely in the future**, left behind by another user/run of this
  same public instance — confirmed live via `GET /api/v2/attendance/records/latest`
  returning a real `punchIn.userDate` several days ahead of the actual
  current date. The Punch Out form always defaults its own Date/Time to
  "right now," which the real API then rejects outright with
  `400 "Punch out Time Should Be Later Than Punch in Time"` — a permanent
  block, not a timing race, since "now" can never be later than a
  still-future Punch In. `AttendancePage.punchOut()` reads that record via
  the same read-only API call first (parsing the page's own "Punched in
  time" display isn't reliable — that display's own template has day/month
  swapped, the same class of quirk already documented for the Leave date
  field) and, only if needed, advances the Date field to one day past it.
  Oddly, the page's own inline validation message — raised once, against the
  original, since-invalid "now" default — stays visibly stuck on screen even
  after the correction goes through and the actual save succeeds; it's a
  stale leftover, the same "doesn't clear itself" quirk already documented
  for the Employee Id collision message, not a sign the fix didn't work.
  Also worth noting: this Date field's own placeholder is "yyyy-dd-mm" — a
  different day/month order than Leave's own From/To Date field
  ("yyyy-mm-dd") — confirmed live, not assumed to match just because both
  are "a date field in the same app."
- **A punch cycle's own "Successfully Saved" toast isn't the only signal
  Workflow 9 checks — it's also confirmed from a completely different
  screen.** Time > Reports > Attendance Summary
  (`AttendanceSummaryReportPage`, `/time/displayAttendanceSummaryReportCriteria`)
  reports each employee's cumulative Punch In/Out duration as one all-history
  total, and its own on-page heading is literally "Attendance Total Summary
  Report." Its Employee Name field binds to "First Middle Last" the same way
  Claim's does — but unlike `ClaimPage`, this page never needs to *validate*
  the bound value against one specific known name, only select whichever
  real suggestion a "First Last" search surfaces, so the shared
  `selectAutocompleteOption()` is reused as-is. The reported total is a
  **lifetime, shared figure** — confirmed live that a single ~6-second punch
  cycle was followed by a jump far larger than 6 seconds' worth of hours,
  consistent with other concurrent users of this same public instance
  punching the exact same Admin-linked employee record in between the two
  reads. Because of that, Workflow 9 snapshots the total before its own
  cycle and asserts the total *after* is not less than that snapshot,
  rather than asserting it grew by any specific amount — the only thing a
  live, concurrently-used shared instance can actually promise is that this
  total never decreases, not by how much any one actor's action moved it.
- **Password strength is judged by pattern, not a character-class checklist.**
  A password built from a fixed template (e.g. ending in a literal `"123"`)
  gets scored "Very Weak" and silently blocks submission even though it has
  upper/lower/digit/symbol — `random.ts`'s `strongPassword()` shuffles
  independently-random character classes together instead.
- **A checkbox/radio's click handler lives on the wrapping `<label>`, not the
  `<input>` itself.** `.check()` (and even a forced `.click()`) on the raw
  `input[type="checkbox"]`/`input[type="radio"]` reports success but silently
  doesn't flip the app's own state — confirmed live on Personal Details'
  Gender radios (currently exercised, by Workflow 1's onboarding test) and
  Add Candidate's consent checkbox (the handling exists on `RecruitmentPage`,
  but no current spec drives that particular field). Clicking the ancestor
  `<label>` is what an actual user's click on the visible widget hits, and is
  what both page objects do instead of a bare `.check()`. Neither field has
  an accessible name/label Playwright can match on directly either: the
  Gender radios are told apart by their `value` attribute (`"1"`/`"2"`); the
  consent checkbox has no `name`/`id`/`aria-label` at all, but is still the
  only element on its form with `role="checkbox"`.
- **`page.route()` mocking a real API to a 500 is genuinely revealing.**
  Stubbing `GET /api/v2/admin/users` this way (rather than letting the request
  reach OrangeHRM) shows the System Users list falls back to its normal empty
  state and surfaces the failure via the same toast component a successful
  save uses — not a broken/blank page. Confirmed live before writing the
  assertion, the same way every other locator/behavior in this suite was.
- **"Employment Status" is an employment *type*, not an Active/Terminated
  lifecycle field.** Its real options are Freelance, Full-Time/Part-Time
  Contract, Full-Time Permanent, Full-Time/Part-Time Probation/Internship —
  confirmed live before writing Workflow 10. There's no "Terminated" value to
  set, and no dedicated termination action distinct from deleting the record
  outright (Workflow 4/Offboarding already covers that) — Workflow 10 uses
  the one genuinely real transition this field supports instead:
  Probation → Permanent.
- **Attachments is a widget embedded at the bottom of Personal Details — it
  has no top-level route of its own.** A guessed URL like
  `/pim/viewAttachments/empNumber/X` renders a blank page — confirmed live,
  not assumed — because that route doesn't exist. Emergency Contacts, despite
  sitting conceptually close to Attachments, *is* a genuine dedicated tab
  (`/pim/viewEmergencyContacts/empNumber/X`) with its own left-nav entry — an
  earlier version of this suite wrongly assumed both were embedded the same
  way, purely from having investigated them together without checking each
  route independently; `EmergencyContactsPage` was split out once that was
  caught. Both widgets' "Add" buttons share no distinguishing class of their
  own; they're told apart by walking forward from each section's own `<h6>`
  heading, and neither dialog fully unmounts the page behind it, so scoping
  any label/button lookup to the dialog's own `<form>` (found via its own
  dialog-title heading — "Add Attachment" / "Save Emergency Contact",
  confirmed live, not the same text as either trigger button) matters once
  one is open — a bare page-wide `button[type="submit"]` filtered by "Save"
  resolves to multiple elements, a strict-mode violation.
- **A fresh employee record is what makes that heading-based lookup reliable.**
  On an employee already carrying earlier attachment/emergency-contact rows,
  the same `xpath=following::button[1]` walk can land on a *row's own* button
  instead of the section's Add button, since each row adds its own buttons
  earlier in DOM order — confirmed by hitting this directly on a reused
  employee during development. Every workflow that uses this pattern creates
  its own employee via `randomEmployee()` specifically to avoid it.
- **A dropdown/field can show its own placeholder instead of the real value
  immediately after navigating to a page that just reloaded it** — not just
  on first render of a truly-blank field (already documented for
  autocompletes above), but on *any* re-navigation to a page whose fields are
  populated by their own async fetch. Confirmed directly: reading Job tab's
  Employment Status right after `goto()` showed "-- Select --" for an
  employee with "Full-Time Probation" already saved, and only the real value
  after `waitForLoadState('networkidle')`. `JobDetailsPage.open()`,
  `ContactDetailsPage.open()`, and `AdminUserPage.editUser()` all wait on
  that rather than on the field merely being present.
- **Directory is a genuinely separate module from PIM's Employee List** —
  different route (`/directory/viewDirectory`), different filter fields (Job
  Title, Location vs. PIM's Employee Name/Id/Sub Unit/Employment Status), and
  a different results-count signal (`"(N) Records Found"` text, not
  `.oxd-table-card` rows — its markup isn't the same table component).

## 9. Known duplication / consolidation

A handful of previously-planned, more granular workflows were consolidated
into the 16 above rather than shipped as near-duplicate spec files — most
notably, "Employee Transfer" and "Employee Status Change" are the same PIM Job
tab form (Workflow 10 covers both), and there is no separate "Termination"
workflow since OrangeHRM has no termination action distinct from deleting the
record outright (Workflow 4/Offboarding already covers that). The one
remaining, intentional oddity is the reused `Workflow 1` label described at
the top of this file — Authentication and Complete Employee Onboarding are
genuinely two different specs, just numbered the same by history rather than
by design.
