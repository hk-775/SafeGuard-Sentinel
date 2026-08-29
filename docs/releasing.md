# Release and publication checklist

Repository publication is an explicit maintainer action. Preparing a release
does not change repository visibility.

## Verify the candidate

1. Use the exact Node.js version in `.nvmrc` and the npm version declared in
   `package.json`.
2. Start from a clean checkout and run:

   ```bash
   npm ci --ignore-scripts --no-audit
   npm run verify
   ```

3. Run an approved secret scanner across the working tree and Git history.
4. Review dependency advisories and licenses. When the repository is still
   private, obtain approval before using a registry audit that submits the
   dependency graph to an external service.
5. Build and smoke-test the container as a non-root user.
6. Confirm the dashboard contains synthetic fixtures only and the architecture
   exports match the editable Draw.io source.
7. Update `CHANGELOG.md`, version metadata, and public-beta limitations.

## Repository settings

Before changing visibility:

- Enable vulnerability alerts, automated security updates, private
  vulnerability reporting, and secret scanning where the hosting plan permits.
- Require pull requests, passing CI, resolved review conversations, and no
  force pushes on `main`.
- Prefer squash merging and delete merged branches automatically.
- Confirm issue templates, the security policy, license detection, topics, and
  the repository description render correctly.

After publication, verify that dependency review and CodeQL run successfully;
their workflows intentionally skip while the repository is private.

## Publish a release

Create a signed or otherwise verifiable tag from a reviewed `main` revision,
publish concise release notes from the changelog, and attach only reproducible,
non-sensitive artifacts. Do not publish packages or deployment artifacts until
their independent support and security commitments are defined.
