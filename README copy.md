# OrangeHRM E2E Automation Framework

An end-to-end UI test automation framework built with **Playwright + TypeScript**,
targeting the public **[OrangeHRM demo](https://opensource-demo.orangehrmlive.com/web/index.php/auth/login)**
(`Admin` / `admin123`).

This isn't a single-feature smoke suite — it's a small but complete framework built
to demonstrate how the core Playwright concepts fit together in one coherent
project: the **Page Object Model**, **custom fixtures**, and **data-driven
testing**, applied across **20 Admin-focused HRM business workflows** rather than
disconnected demo scripts. A supplementary, clearly-separate spec
([Section 9](#9-playwright-technique-coverage)) also covers a handful of
Playwright techniques — native dialogs, iframes, drag-and-drop, native
`<select>` — that OrangeHRM's own Admin surface doesn't happen to have anywhere.

> **On avoiding duplicate workflows:** several requested business scenarios
> turned out to be the same underlying feature described twice (e.g.
> "Employee Transfer" and "Employee Status Change" are both just the PIM Job
> tab; a distinct "Termination" workflow would just re-test Workflow 5's own
> delete flow) — those were consolidated into one workflow each rather than
> shipped as near-duplicate spec files. One requested scenario (name-based
> "Duplicate Prevention") doesn't hold at all against the real app — confirmed
> live, not assumed — so it's covered instead as a test of what *actually*
> happens (Workflow 21). See [Section 10](#10-consolidated-and-reframed-workflows)
> for the full list of what was merged, reframed, or knowingly left out and why.

> **Scope note:** this suite is currently **Admin-only**. Employee Self-Service
> (ESS) role coverage — apply-for-leave, attendance punch in/out, ESS profile
> self-service, and the approve/reject side of Leave — was removed rather than
> parked, since testing it meaningfully requires a second authenticated role
> and its own session-management concerns. It can be reintroduced later behind
> a second `setup-ess` project and `essPage`-style fixtures, following the same
> patterns this suite already uses for Admin.

---

## 1. Why OrangeHRM

OrangeHRM's demo is a realistic, multi-module HR system (Admin, PIM, Leave, Time,
Recruitment) with real custom UI components (Vue-based dropdowns, autocompletes,
modals, toasts) and a public instance that never needs local setup. It's complex
enough to justify a proper framework, and stable enough to automate reliably.

## 2. What "20 Admin workflows" means here

Rather than arbitrary UI interactions, the suite follows the actual HR lifecycle
an employee's record moves through, plus the platform-administration and
supporting data (job titles, vacancies) it depends on:

```
Provision access → Onboard the employee → Maintain their record → Offboard
        ↓                    ↓                      ↓                ↓
 (Workflows 1–2)     (Workflows 3, 7, 14)   (Workflow 4, 11, 15,     (Workflow 5)
                                              16, 17, 19, 20)

   Leave (6), Recruitment (7–8, 12), Attendance (10), Directory (18) and
   Duplicate-Name behavior (21) run alongside, backed by the reference data
                       Workflow 9 manages directly
```

Numbering skips 13 on purpose — that slot is the supplementary, non-workflow
[Playwright Technique Coverage](#9-playwright-technique-coverage) spec, kept in
sequence with the rest of `tests/` without being counted as a 21st workflow.

Every workflow is a spec file with a clear "why this, not something else"
rationale — see [Section 5](#5-the-20-workflows) for the full breakdown.

## 3. Playwright concepts covered

| Concept                                                               | Where                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page Object Model (POM)**                                     | Every screen is a class under[`src/pages/`](src/pages/), extending a shared [`BasePage`](src/pages/BasePage.ts) that centralizes the label-based locator strategy the whole app's form components share.                                                                                                                                                          |
| **Custom fixtures**                                             | [`src/fixtures/index.ts`](src/fixtures/index.ts) composes fixtures on top of Playwright's `test`: one pre-authenticated `adminPage`, plus a Page-Object fixture per screen built on top of it, so specs ask for `adminUserPage` or `vacancyPage` directly instead of constructing anything.                                                                |
| **Data-driven testing**                                         | Applied where it earns its keep, not everywhere: invalid-login combinations (Workflow 1), both system-user platform roles (Workflow 2), and the three Employee List scope filters (Workflow 4) — see[`src/data/`](src/data/).                                                                                                                                     |
| **Setup projects / global auth**                                | [`tests/00-setup/`](tests/00-setup/) logs in as Admin *once* per run and persists `storageState` — every other spec starts already authenticated instead of repeating a login UI flow. A per-fixture session check (`ensureSession` in `src/fixtures/index.ts`) transparently re-authenticates if that session has expired by the time a later spec runs. |
| **Auto-waiting & web-first assertions**                         | No manual`waitForTimeout` sleeps in test logic; every action either uses Playwright's built-in actionability waits or an explicit `expect(...).toBeVisible()`/`toHaveURL()`.                                                                                                                                                                                  |
| **Cross-browser projects**                                      | Chromium is the default (`npm test`); Firefox/WebKit are configured and opt-in (`npm run test:cross-browser`) — see [Section 7](#7-running-the-suite).                                                                                                                                                                                                          |
| **Traces, screenshots, video, HTML/JUnit reports**              | Configured in[`playwright.config.ts`](playwright.config.ts): trace on first retry, screenshot on failure, video retained on failure, HTML report for local triage, JUnit XML (`test-results/junit.xml`) for CI systems that ingest that format.                                                                                                                  |
| **Sharding**                                                    | `npm run test:shard1` / `test:shard2` split the suite across two `--shard` invocations — see [Section 7](#7-running-the-suite).                                                                                                                                                                                                                               |
| **Checkboxes & radio buttons** (`.check()`, `isChecked()`)  | Workflow 11's Gender radios and Workflow 12's "Consent to keep data" checkbox — see[`PersonalDetailsPage.setGender()`](src/pages/pim/PersonalDetailsPage.ts) and [`RecruitmentPage`](src/pages/recruitment/RecruitmentPage.ts).                                                                                                                                  |
| **File upload** (`.setInputFiles()`)                          | Workflow 11's profile-photo upload and Workflow 12's résumé upload, against sample files in[`test-assets/`](test-assets/).                                                                                                                                                                                                                                       |
| **New tab / window** (`context.waitForEvent('page')`)         | Workflow 8's "Web Page" link, which opens OrangeHRM's public job listing in a new tab — see[`VacancyPage.openPublicJobListingInNewTab()`](src/pages/recruitment/VacancyPage.ts).                                                                                                                                                                                  |
| **Network mocking** (`page.route()`)                          | An extra Workflow 2 test stubs the System Users list's own API call with a fulfilled 500 to verify the UI degrades gracefully (empty state + error toast) — UI-only, no real API assertions.                                                                                                                                                                       |
| **Explicit hooks** (`test.beforeEach()`)                      | Workflow 4's Include-filter cases share one`beforeEach` that opens the Employee List, instead of repeating that call inside every data-driven case.                                                                                                                                                                                                               |
| **Native dialogs, iframes, drag-and-drop, native `<select>`** | Not present anywhere in OrangeHRM's Admin surface (confirmed live) — covered instead in a small supplementary spec against a purpose-built practice site. See[Section 9](#9-playwright-technique-coverage).                                                                                                                                                         |

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
│   │   ├── time/AttendancePage.ts
│   │   └── recruitment/{RecruitmentPage,VacancyPage}.ts
│   ├── fixtures/index.ts         # all custom fixtures (adminPage + page objects)
│   ├── data/                     # data-driven test tables
│   └── utils/{random,date}.ts    # faker-based unique test data
├── test-assets/                  # sample-photo.png / sample-resume.txt for .setInputFiles()
├── tests/
│   ├── 00-setup/                 # admin.setup.ts
│   ├── 01-authentication/ … 10-time-attendance/
│   ├── 11-pim-employee-photo-and-personal-info/   # Workflow 11
│   ├── 12-recruitment-candidate-resume/           # Workflow 12
│   ├── 13-playwright-technique-coverage/          # supplementary, not a "workflow" — see Section 9
│   ├── 14-employee-onboarding/                    # Workflow 14
│   ├── 15-employee-transfer-status/               # Workflow 15
│   ├── 16-employee-contact-emergency/             # Workflow 16
│   ├── 17-employee-attachments/                   # Workflow 17
│   ├── 18-employee-directory/                     # Workflow 18
│   ├── 19-advanced-multi-filter-search/           # Workflow 19
│   ├── 20-employee-audit/                         # Workflow 20
│   └── 21-employee-duplicate-names/               # Workflow 21
└── playwright/.auth/             # generated storageState (gitignored)
```

## 5. The 20 workflows

| #  | Workflow                                              | Key concepts exercised                                                                                                                                                                                                                                                                |
| -- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | **Authentication & Access Control**             | Data-driven invalid-login matrix; login/logout; forgot-password entry point. The gateway every other workflow depends on.                                                                                                                                                             |
| 2  | **Admin User Management** (System Users)        | Full CRUD on platform accounts; data-driven across both platform roles (`Admin`, `ESS`); editing an *existing* account's Status (Disable → Enable) via its own row, not just at creation time.                                                                                 |
| 3  | **PIM – Add Employee**                         | Creates the employee record every later PIM/Leave/Recruitment workflow needs.                                                                                                                                                                                                         |
| 4  | **PIM – Search, Filter & Update Employee**     | Data-driven across the Employee List's three scope filters; updates a record found via search.                                                                                                                                                                                        |
| 5  | **PIM – Employee Offboarding**                 | Closes the lifecycle opened by Workflow 3: delete + confirmation modal + verified removal. This is also this suite's*only* "remove someone" workflow — see [Section 10](#10-consolidated-and-reframed-workflows) for why a separate "Termination" workflow would just duplicate it. |
| 6  | **Leave – Assign Leave**                       | Admin books leave directly on an employee's behalf; confirms it finalizes immediately with no approval step (lands as *Scheduled* or *Taken* depending on the assigned date — see Section 8 — but never *Pending Approval*, confirmed by inspecting the row's own actions).                                                                               |
| 7  | **Recruitment – Add Candidate & Pipeline**     | Sourcing through the first hiring-pipeline transition (shortlist) through removing a candidate entirely; a candidate needs a Vacancy assigned to have an application stage at all.                                                                                                    |
| 8  | **Recruitment – Vacancy Management**           | The prerequisite Workflow 7 depends on: create a Vacancy, confirm it's listed.                                                                                                                                                                                                        |
| 9  | **Admin – Job Titles Management**              | The reference data every "Job Title" dropdown elsewhere (Add Employee, Add Vacancy) draws from: add, confirm listed, delete.                                                                                                                                                          |
| 10 | **Time – Attendance Punch In/Out**             | A stateful, server-side punch cycle, performed as Admin (this shared demo's`Admin` login has its own linked employee record) — modeled as one test that reads current state first, so it's correct regardless of prior runs.                                                       |
| 11 | **PIM – Employee Photo & Gender**              | Uploads a profile photo while adding an employee (`.setInputFiles()`), then sets/reads their Gender via Personal Details' radio buttons — the two interaction types no earlier workflow exercised.                                                                                 |
| 12 | **Recruitment – Candidate Résumé & Consent** | Drills into the two Add Candidate fields Workflow 7 skips: résumé upload (`.setInputFiles()`) and the "Consent to keep data" checkbox — both are driven by clicking their wrapping `<label>`, not the input directly (see Section 8).                                          |
| 14 | **Complete Employee Onboarding**                | Chains Add Employee (+ photo, + Gender) with provisioning login credentials as one continuous story, then verifies the result from both the PIM and System Users side — the integration Workflows 2/3/11 don't individually test.                                                    |
| 15 | **Employee Transfer & Status Change**           | PIM > Job tab: reassigns Job Title/Sub Unit, and converts Employment Status Probation → Permanent — confirmed live to be an employment*type* field, not an Active/Terminated lifecycle state.                                                                                     |
| 16 | **Contact Details & Emergency Contacts**        | Updates the address fields on Contact Details and adds an Emergency Contact — the two Personal-Info tabs Workflow 4/11 don't touch.                                                                                                                                                  |
| 17 | **Employee Document Attachments**               | Uploads and deletes a document via the Attachments widget embedded on Personal Details (confirmed live: not a separate top-level tab) — a third, distinct file-upload surface from Workflows 11/12.                                                                                  |
| 18 | **Employee Directory**                          | The company-wide, read-only Directory module — a different route and different filters (Job Title, Location) from PIM's own Employee List.                                                                                                                                           |
| 19 | **Advanced Multi-Filter Employee Search**       | Combines Job Title + Sub Unit + Employment Status in one Employee List search, distinct from Workflow 4's single-field "Include" filter.                                                                                                                                              |
| 20 | **Complete Employee Audit**                     | Reads across Personal Details, Contact Details, Job and Salary for one employee in a single pass — the read-side, cross-tab counterpart to the write-focused workflows above it.                                                                                                     |
| 21 | **Duplicate Employee Names**                    | Confirmed live that OrangeHRM has no name-based duplicate-prevention validation — this documents the real, verified behavior (two distinct, independently addressable records) instead of asserting an error that doesn't exist.                                                     |

## 6. End-to-end flow

```mermaid
flowchart TD
    subgraph Setup["00-setup (once per run)"]
        S1[Login as Admin] --> S4[Save Admin storageState]
    end

    S4 --> W1[1 . Authentication]
    S4 --> W2[2 . Admin User Management]
    S4 --> W3[3 . PIM Add Employee]
    W3 --> W4[4 . PIM Search & Update]
    W3 --> W5[5 . PIM Offboarding]
    W3 --> W6[6 . Assign Leave]
    S4 --> W7[7 . Recruitment Pipeline]
    S4 --> W8[8 . Vacancy Management]
    S4 --> W9[9 . Job Titles Management]
    S4 --> W10[10 . Attendance Punch In/Out]
    S4 --> W11[11 . Employee Photo & Gender]
    S4 --> W12[12 . Candidate Résumé & Consent]
    S4 --> W14[14 . Complete Onboarding]
    W3 --> W15[15 . Transfer & Status Change]
    W3 --> W16[16 . Contact & Emergency Details]
    W3 --> W17[17 . Document Attachments]
    S4 --> W18[18 . Employee Directory]
    S4 --> W19[19 . Advanced Multi-Filter Search]
    W3 --> W20[20 . Complete Employee Audit]
    W3 --> W21[21 . Duplicate Employee Names]

    W8 -. Vacancy needed for a candidate's application stage .-> W7
    W8 -. Vacancy needed for a candidate's application stage .-> W12
    W9 -. Job Title needed by Add Employee + Add Vacancy .-> W3
    W9 -. .-> W8
    W2 -. Login credentials provisioned as part of onboarding .-> W14
    W3 -. Add Employee chained directly into .-> W14

    style Setup fill:#f5f5f5,stroke:#999
```

## 7. Running the suite

```bash
npm install
npx playwright install        # first time only — installs browser binaries

npm test                      # setup project + all 20 workflows, Chromium
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
own response time is genuinely variable: under sustained heavy use (which this
suite's own development itself contributed to) it has been slow enough to time
out even a plain "click Save" a few requests in a row, or to race a fresh
navigation against another action's own in-flight redirect (`net::ERR_ABORTED`),
independent of any selector or logic issue. `BasePage.goto()` retries once on
exactly that error for this reason. If a run still comes back with plain
navigation timeouts, that's the demo server, not the framework — re-running
(or pointing at a private instance) is the fix, not editing a locator.

During one particular development session the demo showed the heaviest
contention observed all along: `AddEmployeePage.save()` hit its full 15-attempt
Employee-Id-collision ceiling on multiple, otherwise-unrelated workflows in the
same run, the site returned a hard `page.goto()` timeout on the login page
itself more than once, and Workflow 6 (Assign Leave) intermittently reported
its own "Successfully Saved" toast yet the just-created record didn't
consistently show up in an immediate Leave List search afterward — likely the
same class of index/read-after-write lag already documented for Employee
List's own search (`LeaveListPage.expectStatus()` now retries the search
itself for exactly this reason, not just the wait), just more severe than
elsewhere that session. None of this reproduced on lighter-traffic runs
earlier the same day. It's recorded here as evidence of how variable this
specific shared instance can get, not as a defect to chase further — if a
future run shows the same pattern, that's the same shared-demo condition
recurring, not a regression.

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
- **A dropdown's own placeholder is a selectable option.** `"-- Select --"`
  renders as a real `.oxd-select-option`, so "pick the first option" helpers
  must exclude it explicitly — otherwise "pick anything" ends up picking
  nothing at all. The same applies to a literal "No Records Found" placeholder
  when a list is asynchronously loaded and queried too early (see below).
- **A list's option data can load asynchronously after the dropdown itself is
  interactive.** Opening a Vacancy's Job Title dropdown (or a Leave Type
  dropdown) right after the form renders can catch a stale "No Records Found"
  placeholder rather than the real, just-fetched options — worth a short
  explicit wait or retry rather than assuming "the dropdown opened" means "the
  real data is in it."
- **What a Leave date field actually submits doesn't reliably match what was
  typed, and isn't even consistent run to run.** Two separate live
  investigations of this exact same masked field produced two different
  results: one where the typed string was submitted completely verbatim,
  and another where the submitted `fromDate`/`toDate` had day and month
  swapped from what was typed — confirmed both times by inspecting the real
  `POST .../leave-requests` payload directly, not assumed. Neither
  "it's verbatim" nor "it's yyyy-dd-mm" is a safe rule to code against; this
  field's own internal display-value-vs-submitted-value handling is simply
  unreliable. The practical fallout: a swap can silently push the assigned
  date into the past relative to the server's clock, and Admin-assigning
  leave for a past date finalizes it directly to **"Taken"** instead of
  "Scheduled" — a different status, but not a different underlying bug, and
  not a pending-approval state either. `LeaveListPage.searchByEmployeeName()`
  filters for both, and `expectStatus()` accepts either as valid — chasing
  the date widget's own inconsistency further wasn't worth it once it became
  clear the *actual* thing this workflow needs to prove (no approval step)
  holds either way. The field is also a masked input that doesn't reliably
  accept a bulk `.fill()`; `BasePage.setDateField()` clicks in, clears via
  keyboard, and types character-by-character instead.
- **A leave request that doesn't touch a currently-configured working day is
  rejected outright** — `400 "Failed to Submit: No Working Days Selected"`
  from the real API, surfaced in the UI as an error toast reading exactly
  that (confirmed by inspecting both directly, not assumed). This demo's Work
  Week (`Admin > Configure > Work Week`) is shared, mutable, admin-editable
  state — and it was observed changing *mid-investigation*: reading it live
  once up front (tried first) still isn't reliable, since another concurrent
  user of the same public instance can flip it again between that read and
  the actual submit. `AssignLeavePage.assign()` instead reacts to the actual
  rejection toast when it happens and retries the next calendar day — the
  same "detect the specific failure, retry with an adjustment" idiom
  `AddEmployeePage.save()`'s Employee-Id-collision retry already uses —
  rather than assuming any fixed set of weekdays. Within any 7 consecutive
  days at least one is virtually guaranteed to be a working day under
  whatever the config currently is. That 7-day retry's own worst case (each
  day retried once, each attempt up to 30s) can legitimately run longer than
  the suite's global 150s test timeout on a slow shared demo — Workflow 5's
  own spec raises its timeout via `test.setTimeout(300_000)` rather than
  inflating the global default for every other, much shorter workflow.
- **A brand-new employee has no leave entitlement and won't appear in "Assign
  Leave" at all**, not just show a zero balance. `EntitlementsPage` grants one
  first — and if the employee already has a 0.00 entitlement for that leave
  type/period, saving pops an "Existing Entitlement value 0.00 will be updated
  to X" confirmation modal that has to be accepted before the save actually
  goes through. Leave Periods are listed oldest-first, so picking blindly
  grants the wrong (long-expired) period — `EntitlementsPage` picks the
  current year specifically.
- **Assigned leave finalizes immediately — there's no approval step.**
  Unlike a self-service application, Admin booking leave on someone's behalf
  never lands on "Pending Approval." It usually finalizes to "Scheduled," but
  see the date-widget note above for why "Taken" is an equally valid, equally
  direct outcome depending on the actual submitted date. Confirmed by
  inspecting a "Scheduled" row's own actions cell: only a three-dot overflow
  menu, no Approve/Reject buttons at all (those render only on a "Pending
  Approval" row).
- **`Locator.isVisible()` doesn't wait — it's a one-shot check.** Pairing an
  optional-element check with a real timeout requires `.waitFor({ state: 'visible', timeout }).catch(() => false)` instead; `isVisible({ timeout })`
  looks like it polls but doesn't, and silently returns `false` if the element
  hasn't rendered yet.
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
  page (or hit a 404 if the route itself is wrong) under load**, where
  navigating there the way a user would — a full load of a reliably-loading
  page (the dashboard) followed by a client-side route change via the sidebar
  — does not. `EmployeeListPage.open()` uses this pattern for exactly that
  reason; it's also how a couple of genuinely wrong hard-coded routes
  surfaced during development (confirmed via direct network-response
  inspection, not guessed).
- **The shared demo's Employee-Id collision rate isn't constant — it tracks
  how much *other* traffic the public instance is under at that moment.**
  `AddEmployeePage.save()`'s retry budget was raised from 7 to 15 attempts
  after directly observing 7, then 15, consecutive real collisions in a row
  during a period of unusually heavy concurrent use (independently confirmed
  by the Work Week config — see the Assign Leave note below — changing out
  from under this same investigation). This is a ceiling sized against
  worse-than-typical contention, not a bug in the retry itself; it doesn't
  make the suite immune to a sufficiently busy moment on a public server, only
  more resilient to one.
- **The collision is avoidable up front, not just recoverable after the
  fact.** Employee Id turned out to be a plain, editable 4-digit text
  input — confirmed live, not a read-only display — the server just
  pre-fills it with its own next sequential value (e.g. `"0552"`). Every
  other concurrent user relying on that same unmodified default is exactly
  who it collides with. `AddEmployeePage.open()` now overwrites it with its
  own random 4-digit value (`randomEmployeeId()`) before the first save
  attempt at all, and `save()`'s own collision retry generates a *new*
  random value on each reload rather than trusting the next sequential
  default — which is exactly the value under contention in the first place.
  This doesn't make a collision impossible (a shared, never-reset instance
  with thousands of existing records can still coincidentally reuse a random
  4-digit value), but it avoids the specific, guaranteed-to-repeat collision
  every user of the unmodified default competes for. The retry still exists
  as a safety net for that residual chance, and because a hard reload is also
  what actually clears the collision error message itself — confirmed live
  that typing a new Id into the field does *not* hide the still-visible
  error from a previous attempt, so checking for it again without reloading
  first risks reading that stale element instead of a genuine new result.
- **The shared demo's `Admin` login has its own linked employee record** —
  other users of the same public instance have edited it over time (its
  display name and Job Title change between runs), but the practical effect
  is that Admin-only self-service pages like Attendance Punch In/Out work
  for it directly, the same as any other employee. Don't assume "Admin" means
  "no employee record attached" on this particular target.
- **Password strength is judged by pattern, not a character-class checklist.**
  A password built from a fixed template (e.g. ending in a literal `"123"`)
  gets scored "Very Weak" and silently blocks submission even though it has
  upper/lower/digit/symbol — `random.ts`'s `strongPassword()` shuffles
  independently-random character classes together instead.
- **A checkbox/radio's click handler lives on the wrapping `<label>`, not the
  `<input>` itself.** `.check()` (and even a forced `.click()`) on the raw
  `input[type="checkbox"]`/`input[type="radio"]` reports success but silently
  doesn't flip the app's own state — confirmed live on both Personal Details'
  Gender radios and Add Candidate's consent checkbox. Clicking the ancestor
  `<label>` is what an actual user's click on the visible widget hits, and is
  what `PersonalDetailsPage.setGender()` / `RecruitmentPage.fillCandidateForm()`
  both do instead of a bare `.check()`.
- **Neither field has an accessible name/label Playwright can match on.** The
  Gender radios are told apart by their `value` attribute (`"1"`/`"2"`); the
  consent checkbox has no `name`/`id`/`aria-label` at all, but is still the
  only element on its form with `role="checkbox"` — `getByRole('checkbox')`
  finds it despite that.
- **A page reload clears any file already picked in a file input.**
  `AddEmployeePage.save()`'s existing Employee-Id-collision retry reloads the
  form and refills the name fields — it also has to re-attach a previously
  uploaded photo for the same reason, or a collision on attempt 2+ silently
  drops the photo the caller thinks it already set.
- **`page.route()` mocking a real API to a 500 is genuinely revealing.**
  Stubbing `GET /api/v2/admin/users` this way (rather than letting the request
  reach OrangeHRM) shows the System Users list falls back to its normal empty
  state and surfaces the failure via the same toast component a successful
  save uses — not a broken/blank page. Confirmed live before writing the
  assertion, the same way every other locator/behavior in this suite was.
- **The public practice site used for [Section 9](#9-playwright-technique-coverage)'s
  iframe demo has since gone read-only.** Its embedded TinyMCE editor loads
  with `contenteditable="false"` and blocks even a forced click from typing
  into it (an outdated-API-key warning, not a Playwright/locator issue,
  confirmed by checking `document.designMode` and the notification banner
  directly) — that spec reads the iframe's content via `frameLocator()`
  rather than editing it, since editing genuinely isn't possible there anymore.
- **"Employment Status" is an employment *type*, not an Active/Terminated
  lifecycle field.** Its real options are Freelance, Full-Time/Part-Time
  Contract, Full-Time Permanent, Full-Time/Part-Time Probation/Internship —
  confirmed live before writing Workflow 15. There's no "Terminated" value to
  set, and no dedicated termination action distinct from deleting the record
  outright (Workflow 5 already covers that) — Workflow 15 uses the one
  genuinely real transition this field supports instead: Probation → Permanent.
- **Attachments is a widget embedded at the bottom of Personal Details (and
  reused, unchanged, on other tabs like Emergency Contacts) — it has no
  top-level route of its own.** A guessed URL like
  `/pim/viewAttachments/empNumber/X` renders a blank page — confirmed live,
  not assumed — because that route doesn't exist. Emergency Contacts,
  despite sitting right next to that same reused Attachments widget on its
  own page, *is* a genuine dedicated tab (`/pim/viewEmergencyContacts/empNumber/X`)
  with its own left-nav entry — an earlier version of this suite wrongly
  assumed both were embedded on Personal Details, purely from having
  investigated them together on the same page without checking each one's
  own route independently; `EmergencyContactsPage` was split out once that
  was caught. Both widgets' "Add" buttons share no distinguishing class of
  their own; they're told apart by walking forward from each section's own
  `<h6>` heading, and neither dialog fully unmounts the page behind it, so
  scoping any label/button lookup to the dialog's own `<form>` (found via its
  own dialog-title heading — "Add Attachment" / "Save Emergency Contact",
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
- **A dropdown/field can show its own value's placeholder instead of the real
  value immediately after navigating to a page that just reloaded it** — not
  just on first render of a truly-blank field (already documented for
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
- **OrangeHRM has no name-based duplicate-employee validation.** Creating the
  exact same First/Last name twice in a row succeeds both times, each
  assigned its own sequential Employee Id, confirmed live before writing
  Workflow 21. This is a different mechanism entirely from the genuine
  Employee-Id collision `AddEmployeePage.save()` already retries around —
  that's a race on the auto-generated Id between concurrent users, not a
  same-name check, and the two shouldn't be confused.

## 9. Playwright technique coverage

A handful of topics worth knowing Playwright for don't correspond to anything
that actually exists in OrangeHRM's Admin UI — confirmed live while building
Workflows 11 and 12, not assumed:

- No native browser dialog anywhere. Navigating away from an Add Employee form
  with unsaved changes doesn't trigger a `beforeunload` confirm; nothing else
  in the Admin surface calls `alert()`/`confirm()`/`prompt()` either.
- No `<iframe>` anywhere reachable from the Admin/PIM/Leave/Recruitment/Time
  modules (checked the Dashboard and several other pages directly).
- No drag-and-drop interaction anywhere in the app.
- No plain HTML `<select>` — every dropdown in OrangeHRM is a custom Vue
  component (`.oxd-select-text` + a `role="listbox"` popup), which is exactly
  why `BasePage.selectDropdownOption()` exists instead of `.selectOption()`.

Rather than skip these roadmap topics, or force a fake trigger for them onto a
target that genuinely doesn't have one,
[`tests/13-playwright-technique-coverage/framework-capabilities.spec.ts`](tests/13-playwright-technique-coverage/framework-capabilities.spec.ts)
exercises all four against **`the-internet.herokuapp.com`** — a small,
purpose-built practice site the wider Selenium/Playwright community already
uses to teach exactly these techniques. It's a deliberate exception to
"everything in this suite targets OrangeHRM": these four tests use
`@playwright/test`'s own `test`/`expect` directly rather than this repo's
`adminPage`/OrangeHRM fixtures, since none of them need an OrangeHRM login at
all. It is **not** counted among the 20 Admin workflows in Sections 2/5/6 —
it's supplementary technique coverage, not a business flow.

| Technique                                                            | Covered via                                                                                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Native`alert()`/`confirm()`/`prompt()` (`page.on('dialog')`) | `/javascript_alerts` — accepts an alert, accepts a confirm, and answers a prompt, asserting the page's own read-back of each result. |
| `page.frameLocator()` / iframe content                             | `/iframe` — reads the embedded editor's text through a `frameLocator()`. (Not edited — see the design note above on why.)         |
| `.dragTo()`                                                        | `/drag_and_drop` — drags one column onto another and confirms their contents swap.                                                   |
| Native`<select>` (`.selectOption()`)                             | `/dropdown` — a real `<select>` element, unlike anything in OrangeHRM itself.                                                      |

## 10. Consolidated and reframed workflows

A batch of additional business scenarios was requested as 21 individually
named workflows on top of what this suite already had. Several of them
turned out to be the same underlying feature asked for more than once, or
didn't hold up against the real app's actual behavior — those were merged,
reframed, or (in one case) deliberately left unimplemented rather than
shipped as near-duplicate or dishonest test coverage.

**Merged into an existing or single new workflow, not duplicated:**

| Requested as                                                     | Folded into                   | Why                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Employee Transfer Between Departments                            | Workflow 15                   | Same PIM > Job tab as Employee Status Change — one form, two fields, one workflow covers both.                                                                                                                                                                                             |
| Employee Status Change                                           | Workflow 15                   | See above.                                                                                                                                                                                                                                                                                  |
| Employee Termination Workflow                                    | *(not a separate workflow)* | OrangeHRM has no termination action distinct from deleting the employee record — that's Workflow 5 (Offboarding) already. A dedicated "Termination" spec would just re-test the same delete-confirm-verify flow under a different name.                                                    |
| Employee Personal Information Update (Contact/Address/Emergency) | Workflow 16                   | One workflow covering both tabs is more coherent than two near-identical "update a field, save, verify" specs.                                                                                                                                                                              |
| Employee Document Management                                     | Workflow 17                   | Distinct from Workflows 11/12's photo/résumé uploads — a third upload surface, via the Attachments widget embedded on Personal Details (see Section 8).                                                                                                                                  |
| Complete Employee Lifecycle                                      | *(not a separate workflow)* | Its own steps — search, edit Personal Details, update Job Details, upload attachment, delete, verify — are exactly Workflows 4 + 15 + 17 + 5 in sequence. A combined "lifecycle" spec would just replay them back-to-back without adding a new assertion; each already stands on its own. |

**Reframed to match confirmed real behavior, rather than implemented as literally requested:**

- **Employee Duplicate Prevention** was requested as: create an employee,
  attempt the same again, expect a validation error. Confirmed live before
  writing anything: **no such validation exists** — the second save succeeds
  with its own new Employee Id every time. Workflow 21 tests the real,
  verified behavior (duplicate names are allowed; each gets a distinct,
  independently addressable record) instead of asserting an error that
  doesn't happen.

**Knowingly left out, with the reason documented rather than silently skipped:**

- **Leave Management's Approve/Reject step** isn't implemented. Reaching a
  "Pending Approval" leave request requires an employee *applying* for leave
  via Employee Self-Service — and this suite's own [scope note](#orangehrm-e2e-automation-framework)
  removed ESS coverage earlier on. Admin's own Assign Leave (Workflow 6)
  finalizes straight to *Scheduled* with nothing left to approve — confirmed
  live and already documented in Section 8. Search/filter *by* status still
  works and is exercised elsewhere (Workflow 6 confirms a Scheduled status
  after assigning); it's specifically the approval *action* that has no
  reachable trigger under Admin-only coverage. Reintroducing ESS (see the
  scope note) would unlock this the same way it would unlock the rest of the
  originally-removed ESS-only flows.
