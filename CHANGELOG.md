# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/). Versions before 1.0.0 are **betas**: they are built and tested by a single
author as a personal tool, and interfaces and data models may still change.

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

[0.2.0]: https://github.com/Jump0ts/mymoney/releases/tag/v0.2.0-beta
[0.1.0]: https://github.com/Jump0ts/mymoney/releases/tag/v0.1.0-beta
