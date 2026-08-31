# Changelog

All notable changes to SafeGuard Sentinel are documented here.

## Unreleased

### Changed

- Consequential Level 3 and Level 4 interventions now fail closed until an
  injected approval gate verifies an independently recorded human decision.
- Evidence access logs record object references instead of credential-bearing
  pre-signed URLs.
- The supported toolchain is Node.js 24 with current Vite and Vitest releases.
- React Router is updated to the patched 7.18 line.
- CI actions are pinned to immutable revisions, and public-repository security
  workflows are prepared for CodeQL and dependency review.
- Automated dependency-update pull requests are disabled; vulnerability alerts
  remain enabled, and maintainers apply reviewed dependency updates manually.

### Added

- Community health files, release guidance, and dependency license checks.
- A GitHub Pages workflow that publishes and browser-tests the canonical
  landing, architecture, guided tour, and synthetic dashboard.

## 0.1.0

- Initial public-beta reference implementation.
