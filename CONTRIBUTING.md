# Contributing

Contributions are welcome when they preserve the project's customer-neutral,
synthetic-only boundary.

## Development

```bash
npm ci
npm run verify
```

## Pull requests

- Keep changes focused and explain the safety or product behavior affected.
- Add or update tests for behavior changes.
- Use only synthetic, non-geographic fixtures and opaque identifiers.
- Do not add personal data, production data, credentials, private endpoints,
  adopter branding, inherited deliverables, or copied metrics.
- Treat automated risk output as advisory; consequential actions require an
  independently authorized review boundary.
- Update `docs/architecture/safeguard-sentinel.drawio` and commit matching SVG
  and PNG exports whenever the architecture changes.
- Run a secret scanner in addition to `npm run verify`.

Security-sensitive reports belong in the private process described in
[SECURITY.md](SECURITY.md).
