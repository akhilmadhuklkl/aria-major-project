# Dependency Security Audit

## Current Status

The production dependency tree was audited with:

```bash
npm audit --omit=dev --audit-level=high
```

The current baseline has **0 critical vulnerabilities** and **23 moderate/high advisories**. The compatible fixes already applied include:

- Express `5.3.0` with `proxy-addr` `2.0.8`
- `body-parser` `2.4.0`
- `@fastify/busboy` `3.2.6`
- `ip-address` `10.7.6`
- `nanoid` `3.3.20`
- `tar` `7.5.23`
- `qs` `6.17.1`

These versions are enforced through the `overrides` section in `package.json` and are covered by the normal test, lint, and build checks.

## Remaining Upgrade Boundary

The remaining advisories are primarily transitive dependencies of the AI and Mastra stack. The available npm fixes include major-version changes for:

- `@huggingface/transformers` and its `sharp` dependency
- `@mastra/core` and the Mastra package family
- `zod` and related schema compatibility packages

These upgrades must be handled as a separate compatibility task because they can change model loading, agent endpoints, schema behavior, and retrieval runtime behavior. Do not use `npm audit fix --force` on the working application without a dedicated upgrade branch and a full browser/API regression run.

## Operational Mitigations

- Keep `AUTH_REQUIRED=true` for public deployments.
- Restrict `CORS_ORIGINS` to the deployed frontend origin.
- Keep upload size limits and rate limits enabled.
- Store provider credentials only in the deployment secret store.
- Re-run the audit after every Mastra or Hugging Face upgrade.
