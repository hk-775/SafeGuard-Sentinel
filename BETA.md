# Public beta status

SafeGuard Sentinel is an MIT-0-licensed reference implementation for
evaluation and collaboration, but it is not a production-ready deployment.

## What is supported

- Building and testing the TypeScript packages with the pinned Node.js runtime
- Running the synthetic operations dashboard locally or in its demo container
- Reviewing and extending dependency-injected workflow logic
- Reusing the architecture source as a starting point for an adopter design

## What is intentionally not included

- Deployable CDK, SAM, Terraform, or CloudFormation infrastructure
- AWS credentials, account identifiers, private endpoints, or production data
- Production IAM policies, authentication, authorization, or tenant isolation
- A validated model, calibrated thresholds, legal basis, or safety
  certification
- Operational service levels or backward-compatibility guarantees

## Production adoption gates

Before connecting the reference interfaces to live systems, adopters must add
and validate:

- Independently authorized human approval for consequential actions, with
  decisions bound to the exact user, session, action, target account set, and
  expiry
- Least-privilege IAM, encryption, secret management, network controls, and
  authenticated administrative access
- Idempotency, bounded retries, dead-letter handling, explicit timeouts,
  concurrency controls, and replay-safe event processing
- Structured logs that exclude credentials and sensitive payloads, plus
  metrics, traces, alarms, dashboards, and tested incident procedures
- Data minimization, retention, deletion, access review, regional controls,
  appeals, due process, and abuse-resistant evidence access
- Unit, integration, end-to-end, load, failure-injection, and rollback testing
  against representative and lawfully obtained data

The root package remains marked `private` to prevent accidental publication to
a package registry. Opening the source repository and publishing npm packages
are separate decisions.
