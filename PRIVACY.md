# Privacy and data policy

SafeGuard Sentinel is published with synthetic fixtures only. Contributions
must not include production data, personal data, confidential material, or
content copied from an adopter environment.

## Repository data rules

- Use explicit `DEMO-*`, `TEST-*`, or documentation-reserved identifiers.
- Do not commit names, personal email addresses, phone numbers, street
  addresses, precise coordinates, production IP addresses, device
  identifiers, access tokens, account identifiers, or message transcripts.
- Use opaque references for contacts and locations.
- Redact message and evidence content unless the content is newly written,
  minimal, and unmistakably synthetic.
- Do not copy production metrics, geography, incident names, screenshots, or
  diagrams into examples.
- Do not import Git history from a private or adopter-specific repository.

`npm run privacy:check` enforces a narrow automated baseline. It does not
replace human review, secret scanning, dependency review, or repository-host
security features.

## Runtime responsibility

This repository does not provide a lawful basis for processing personal data.
Deployers are responsible for data minimization, purpose limitation, consent or
other legal basis, retention, access controls, regional requirements, incident
response, deletion, appeals, and human oversight.
