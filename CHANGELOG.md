# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/). Versions before 1.0.0 are **betas**: they are built and tested by a single
author as a personal tool, and interfaces and data models may still change.

## [Unreleased]

### Added
- **The app has its own icon.** The iOS and Android icons, the adaptive Android layers (foreground and monochrome, on the brand colour) and the splash image were still the Expo defaults; they are now the same white **M** on indigo as the installed web app. They are generated from that mark by `npm run icons` (`apps/mobile/scripts/generate-icons.js`, no image library needed), and a test checks that the committed PNGs are exactly that output, that the iOS icon has no transparency and that the Android foreground fits the adaptive safe zone.
- **The browser tab has a title.** The web had an empty `<title>`, so tabs, history and the installed web app showed nothing. It now reads "Presupuesto · MyMoney" (screen · app) and follows the screen you are on, both in the static HTML and when navigating; in the *pre* environment it says "MyMoney (Pre)".

### Changed
- The adaptive Android icon uses the brand colour as a plain background instead of the default image layer, which is removed.

## [0.4.0] — 2026-11-04 — Beta

> Budget release: an expense is written down once (from *Movimientos* or from the budget) and ticking a planned line registers the payment, plus budgets for future months.

### Added
- **One-off expenses no longer need to be written twice.** An expense that comes out of a budget group (for example a beer from *Deseos*) is now created once and shows up in both places.
  - In the expense form, the *Presupuesto* field has a new section **Gasto nuevo en un grupo**: choosing a group creates the expense **and**, at the same time, a one-off line already paid and linked to it in the budget of the expense's month (named after the description, or the category if there is none). Linking to an existing line still works from the new section *Enlazar con una línea*.
  - In *Presupuesto*, each group has a **+** button (current and past months) that opens the same form with the group already chosen and, in a past month, its last day as the date.
  - The line follows its expense: editing the amount or the description updates it, changing the date to another month recreates it in that month, and **deleting the expense, turning it into an income or linking it to another line deletes the line that was born with it**. A one-off line you wrote yourself is never deleted this way (it just goes back to unpaid), and deleting the line from the budget leaves the expense in *Movimientos*.
  - API: `POST` and `PATCH /api/transactions` take `budgetGroupId` (not together with `budgetEntryId`; only expenses; `404` for a group of another user) and do everything in one transaction. `BudgetEntry.fromTransaction` is a new column with a default (only adds a column) that marks the lines created this way. The transaction's `budgetEntry` now includes it.
- **Ticking a planned line registers the payment.** In *Presupuesto*, ticking an unpaid line of the current or a past month (the insurance, Netflix...) no longer just marks it: it opens a small sheet, **Marcar como pagada**, with the amount (the planned one, editable if the real bill was different) and the category, and confirming creates the expense in *Movimientos* already linked to the line.
  - **The category is remembered per line.** The first time you choose it; afterwards the sheet opens with the category of the last expense that paid that same recurring line already chosen, so confirming takes one tap. A one-off line has nothing to remember from.
  - The expense is dated today, or the last day of the month when the line belongs to a past month, and takes the line's name as its description.
  - Not changed: a future month is still ticked by hand (nothing has been paid yet), a refund line is too, and a line that is already paid or linked is still undone from *Movimientos* (a tap never deletes an expense).
  - API: each unpaid recurring line of `GET /api/budgets/months/:year/:month` carries `suggestedCategoryId` (the category of the latest expense linked to that recurring line, `null` if none). No new column or migration.
- **Plan future months in the budget.** The month selector of *Presupuesto* can now go up to **12 months ahead** (it used to stop at the current month), so a known charge or expense, such as the car insurance, can be written down in advance.
  - A future month is **not saved just by looking at it**: it is shown as it would be (recurring template and last salary) with a "Mes por preparar" note, and it is only saved when you edit it, tick a line or set its expected salary. Browsing ahead therefore never freezes a month with today's template.
  - **Recurring changes reach the later months that are already saved.** Adding a recurring line, editing a line with *Este y los siguientes* or removing it with that option now also applies to the following months you had already saved (for example the one where you wrote the car insurance). Lines that are **paid, linked to an expense or edited by hand for their own month** are left alone (a removed recurring line that was paid or edited stays as a one-off line). Editing a line again with *Este y los siguientes* makes it follow the template again. Earlier months never change.
  - API: `GET /api/budgets/months/:year/:month` answers `preview: true` for a future month that is not saved (its lines carry a provisional `preview:` id and cannot be edited), and `POST .../open` saves it. The server accepts one month more than the app offers and answers `400` beyond that.
  - API: `BudgetEntry.edited` (new column with a default, no data changes) remembers the lines edited by hand for one month. `PATCH /api/budgets/entries/:id` and `DELETE /api/budgets/entries/:id?scope=template` take a `scope` (`month` by default, or `template`) and do the whole change in one transaction; the app no longer makes two requests for it.
  - In *Movimientos* the budget link of an expense dated in an unsaved future month offers no lines yet: edit that month in *Presupuesto* first.

### Changed
- Dependency updates: `zod` 3 → 4 in the backend (the only branch with the fix for the memory use when validating huge collections; same error format for the client), `vitest` 2 → 4 (clears the critical development-only alerts; tests only, it does not reach the production image) and the minor-and-patch group (`dotenv`, `tsx`, `supertest`, `typescript-eslint`, `@tanstack/react-query`, `react-hook-form`, `zustand`).
- Database: this release applies two migrations, `BudgetEntry.edited` and `BudgetEntry.fromTransaction`. Both only **add a column with a default** (no data is touched).

### Fixed
- Narrow phones (360-430 px): the legend of the category chart in the Overview no longer shrinks every category name to a single letter (it moves under the chart when it does not fit beside it); the date of a transaction is no longer split over three lines (category and date wrap onto two lines instead); and on the web the month selector and the calendar button of *Movimientos* no longer overlap (the "next month" arrow was hidden under the button).

## [0.3.0] — 2026-10-26 — Beta

> Everyday-use release: link expenses with the budget, install the web as an app, and several budget fixes.

### Added
- **Link an expense with a budget line.** In the expense form, a new *Presupuesto* field lists the free expense lines of the budget of the
  expense's month. Linking marks the line as paid with the **real amount** of the expense (the planned amount stays and is shown underneath when
  it differs) and the transaction shows which line and group it covers. One expense per line. If the amount or the description is empty when
  linking, they are filled with the planned amount and the name of the line; anything already typed is left alone.
  - API: `Transaction.budgetEntryId` (unique, `ON DELETE SET NULL`), added by a migration that only adds a column and an index. Only expenses,
    only expense lines of the same user, `409` for a second expense on the same line (the unique index also covers simultaneous requests).
    Unlinking, deleting the expense or turning it into income leaves the line unpaid; deleting the line keeps the expense, only unlinked.
    A linked line cannot be un-marked as paid or turned into a refund.
- **Install the web as an app (PWA)**: web manifest, home-screen icons (including a maskable one and the iOS touch icon), standalone display,
  light/dark system-bar colours, safe-area support (`viewport-fit=cover`) and no pull-to-refresh bounce.

### Changed
- The type of a budget line is now **Expense / Refund** (it said "Fixed / Refund", which did not read as a pair).
- Transactions refresh every time you come back to that tab: tabs stay mounted and the cache lasts 30 s, so a change made from another client
  (the phone) could show in one filter (*Gastos*) and not in another (*Todo*).
- Dependabot opens its pull requests against `pre`, and leaves out what is tied to the Expo SDK or to React (`eslint-config-expo`,
  `react-test-renderer`) and the major jumps of `zod`, `@hookform/resolvers` and Prisma, which are done on purpose and tested by hand.
- Dependency updates: `docker/login-action` 4.7, `body-parser` 1.20.9.
- Documentation: the web is served from the VPS and the Cloudflare static hosting (and its `wrangler.jsonc`) is gone from the repository.

### Fixed
- **The budget's "remainder" group now subtracts the limit of the other groups.** Its available amount was the salary minus the planned *lines*,
  so a group limit subtracted nothing until it was filled with lines: with 300 € left and a group limited to 120 €, the remainder kept showing
  300 €. Each group now sets aside the greater of its limit and the sum of its lines, and the remainder shows 180 €.
- The labels of the bottom tab bar no longer lose the descenders of "p", "g" and "j" (Presupuesto, Categorías, Ajustes) on iOS.

## [0.2.0] — 2026-10-25 — Beta

> Production-readiness release: the web app can now be served from the same VPS as the API, and the dependency and branch workflow was tightened.

### Added
- **Web served from the VPS (optional, `WEB_DOMAIN`).** The API image now also carries the compiled web and the generated config of its own
  nginx container (non-root, read-only filesystem, no capabilities, no published ports, 48 MB limit). The shared nginx terminates TLS for the
  web domain and proxies to it, so one image, one digest and one human approval deploy API and web together at the same version.
  The CSP is computed at build time (one hash per inline script) and every security header is sent exactly once.
  This keeps the web reachable when Spanish ISPs block shared CDN addresses during football matches.
- `nginx-apply.sh` and `bootstrap-cert.sh` manage both domains (each in its HTTP or HTTPS phase depending on its certificate) with a single
  `nginx -t` and a joint rollback; 14 new shell tests, and CI now builds the image with the web and starts its server under the production restrictions.

### Changed
- Dependency updates: `actions/checkout`, `setup-node` and `upload-artifact` v4 → v7, `bcryptjs` 2 → 3, `dotenv` 16 → 18, `shell-quote` and `source-map-js` patches.
- Dependabot now opens its pull requests against `pre` and ignores the Expo/React Native stack (pinned by the Expo SDK) and major jumps of `node` and `postgres`.
- `develop` and `pre` are protected like `master` (pull request, passing CI, no force-push or deletion, also for administrators).
- Documentation: the web is described as Cloudflare static assets (the earlier host) or the VPS, with the gotchas found while setting it up,
  and the 0.1.0 notes no longer claim that off-server backups are automatic (a verified-pull script is provided).

## [0.1.0] — 2026-10-22 — Beta

> **First public beta.** The core product is feature-complete and covered by automated tests. Production went live right after the
> tag: the API on a VPS (2026-10-22) and the web app on Cloudflare (2026-10-23). It is a personal tool, so there is no support commitment.

### Added

**Tracking**
- Income and expense transactions with categories: create, edit, delete and paginate; filters by type, category and month.
- Overview with monthly totals, a category donut chart and monthly bars, plus a month/year picker.
- Loading skeletons and a smooth donut animation when changing month.

**Budget (Excel-style)**
- Colour-coded groups with lines that can be ticked as *paid*.
- A recurring template that is copied into every new month (idempotent, tolerant of concurrent requests), and one-off lines for a single month.
- Monthly salary, total to spend (planned vs. actual) and remaining amount.
- Optional limit per group, with a progress bar ("€X left" / "€X over").
- A group that receives whatever is left of the salary (treats, surprises), with its own available amount.
- Refunds as negative lines; reordering of groups and lines with accessible up/down buttons (changes are announced to screen readers).
- Edit mode with a confirmation before discarding unsaved changes.

**Accounts**
- Individual, private accounts with JWT authentication; every query is scoped to the authenticated user.
- `REGISTRATION_ENABLED` to close public sign-up in production.

### Accessibility
- Four audit-and-fix rounds: screen-reader labels, headings, announced errors, large-text support, reduce-motion support, touch targets and AA contrast
  (the light-theme income/expense/danger colours were darkened to reach 4.5:1).

### Security and infrastructure
- Deployment setup for a shared DigitalOcean VPS (rolled out with this release): non-root, read-only API container, database without published ports, nginx with rate limiting
  and strict routing, Let's Encrypt, and a forced-command SSH key for CI that can only request a deployment.
- Deployment by image digest with the build's provenance attestation verified, gated by a human approval in a protected environment.
- Strict Content Security Policy for the web build; backups taken before every migration, plus a script that pulls SHA-256-verified copies off the server (restore-tested).
- Secrets never live in the repository (`.gitignore` hardening); secret scanning, push protection and Dependabot enabled; `master` protected.

### Quality and tooling
- Automated tests: 300+ client tests (Jest, React Native Testing Library), 70+ API tests (Vitest + supertest against PostgreSQL, including tenant isolation)
  and shell tests for the deployment scripts.
- CI on every pull request: lint, typecheck, build, tests with coverage, a Docker image build and boot under production restrictions, and `shellcheck`.
- API tests refuse to run against any database whose name does not end in `_test`.

### Not included yet
- Automatic payment detection (Android only), multiple accounts/wallets, and recurring expenses outside the budget.
- Screenshots and a public demo.

[0.4.0]: https://github.com/Jump0ts/mymoney/releases/tag/v0.4.0-beta
[0.3.0]: https://github.com/Jump0ts/mymoney/releases/tag/v0.3.0-beta
[0.2.0]: https://github.com/Jump0ts/mymoney/releases/tag/v0.2.0-beta
[0.1.0]: https://github.com/Jump0ts/mymoney/releases/tag/v0.1.0-beta
