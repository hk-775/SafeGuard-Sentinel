# Changelog

All notable changes to SafeGuard Sentinel are documented here.

## Unreleased

### Changed

- Consequential Level 3 and Level 4 interventions now fail closed until an
  injected approval gate verifies an independently recorded human decision.
- Evidence access logs record object references instead of credential-bearing
  pre-signed URLs.
- The supported toolchain is Node.js 24 with current Vite and Vitest releases.
- CI actions are pinned to immutable revisions, and public-repository security
  workflows are prepared for CodeQL and dependency review.

### Added

- Community health files, release guidance, dependency license checks, and
  Dependabot configuration.

## 0.1.0

- Initial public-beta reference implementation.
