# Security policy

SafeGuard Sentinel is security-sensitive reference software. The `main` branch
receives security fixes during the public beta; older revisions are best
effort.

## Supported versions

Only the latest revision of `main` and the most recent tagged public-beta
release receive coordinated fixes.

## Report a vulnerability

Do not publish credentials, personal data, sensitive logs, exploit details, or
an unpatched proof of concept in a public issue.

Use the repository host's **Report a vulnerability** flow in the Security tab.
If private reporting is unavailable, open a public issue titled `Security
contact request` without vulnerability details so a private channel can be
arranged.

Include the affected revision, impact, prerequisites, the smallest synthetic
reproduction available, redacted evidence, and any suggested mitigation.

Testing must remain confined to systems, accounts, and repositories you are
authorized to use. This project does not authorize testing third-party
services or live users.

## Deployment warning

The repository is not a production-ready AWS stack. Before deployment, add
least-privilege IAM, input validation, idempotency, explicit timeouts,
dead-letter handling, encryption, log retention, alarms, dependency scanning,
and an independently authorized approval gate for consequential actions.

Pre-signed URLs, session tokens, approval artifacts, and other bearer
capabilities must be treated as credentials and excluded from logs. The
reference intervention handler will not execute Level 3 or Level 4 actions
unless an injected service verifies an approval reference; deployers are
responsible for making that verification tamper-resistant, scoped, expiring,
bound to the exact target account set, and auditable.
