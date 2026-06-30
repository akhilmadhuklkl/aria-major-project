# Mastra Platform Checklist

Purpose: prepare the exact steps for connecting ARIA to Mastra Platform after credits reset.

Target date: July 1, 2026 or later

## Current Status

| Item | Status |
|---|---|
| Mastra organization created | Complete |
| Mastra project named `Major Project` created | Complete |
| Local ARIA backend has Mastra-compatible endpoint support | Complete |
| Gemini API key configured locally | Complete |
| Mastra Cloud credits | Available for deployment |
| GitHub repository linked | Complete |
| Mastra Server deployment | Complete |
| Mastra Studio deployment | Complete |
| Cloud deployment/observability | Complete |
| Local ARIA backend connected to Mastra Cloud | Complete |

## Before Opening Mastra Platform

Run these from `aria-app/`:

```bash
npm run lint
npm run build
npm run validate:final
```

Confirm `.env` contains local values only and is not committed:

```env
PORT=8787
ENABLE_MASTRA_SERVER=true
MASTRA_MODEL=google/gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=
MASTRA_AGENT_URL=http://localhost:8787/api/agents/aria-support-agent/generate
```

Do not paste API keys into GitHub, screenshots, reports, or public documents.

## Mastra Platform Steps

1. Open Mastra Platform.
2. Select Akhil's organization.
3. Open the `Major Project` project.
4. Confirm credits are available after the reset.
5. Link the GitHub repository if required:

```text
akhilmadhuklkl/aria-major-project
```

6. Open project setup or deploys.
7. Configure the project/server environment variables only inside Mastra Platform:

```env
ENABLE_MASTRA_SERVER=true
MASTRA_MODEL=google/gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=
```

8. Deploy or connect the Mastra server endpoint.
9. Copy the deployed Mastra agent generate endpoint.
10. Update local `.env` if the frontend/backend should call the cloud agent:

```env
MASTRA_AGENT_URL=<mastra-cloud-agent-generate-endpoint>
```

11. Restart the local backend.
12. Test:

```bash
npm run validate:final
```

13. Open the ARIA Customer Chat page.
14. Ask a support question.
15. Confirm the response shows:

- confidence
- retrieval method
- source evidence
- provider path
- no frontend console errors

## Mastra Cloud Build Notes

Mastra Platform builds expect the Mastra project entrypoint at:

```text
aria-app/src/mastra/index.ts
```

ARIA keeps the Express API under `aria-app/server`, but the Mastra agent configuration is shared through `aria-app/src/mastra` so both Mastra Cloud and the local Express adapter can use the same agent definition.

If a deploy fails with:

```text
npx --yes mastra build failed
Missing required file ... src/mastra/index.ts
```

push the latest code containing `src/mastra/index.ts`, then redeploy from the Mastra Platform Deploys page.

## Observability Checks

After sending a test request:

1. Open Mastra Platform observability.
2. Check metrics.
3. Check traces.
4. Check logs.
5. Capture notes for the final demo if telemetry appears.

Expected result:

```text
ARIA can demonstrate Mastra-connected response generation or show local fallback behavior clearly if cloud limits block the request.
```

## Verified Mastra Cloud Setup - 30 June 2026

| Item | Verified Value |
|---|---|
| GitHub repository | `akhilmadhuklkl/aria-major-project` |
| Project root | `aria-app` |
| Deploy path | `aria-app` |
| Branch | `master` |
| Server URL | `https://major-project.server.mastra.cloud` |
| Agent id | `aria-support-agent` |
| Generate endpoint | `https://major-project.server.mastra.cloud/api/agents/aria-support-agent/generate` |
| Model | `google/gemini-2.5-flash` |
| Local backend health | `agentProvider=mastra-remote` |

Verified customer query:

```text
How long does a refund take after approval?
```

Observed result:

- ARIA returned the approved refund answer with `5-7 business days`.
- UI showed `88% confidence`.
- UI showed `semantic retrieval`.
- UI showed `Mastra + Gemini`.
- UI showed `Refund and return policy` source evidence with learned feedback adjustment.
- Mastra Metrics showed `1` agent run and `419` total tokens.
- Mastra Traces showed successful `ARIA Support Agent` execution using `gemini-2.5-flash`.
- Mastra Logs showed one non-blocking license validation warning, but the agent run completed successfully.

## Fallback Plan

If Mastra Cloud is unavailable, out of credits, or deployment fails:

1. Keep `MASTRA_AGENT_URL` pointed to the local Express Mastra endpoint or leave it unset.
2. Use the local knowledge fallback for demo reliability.
3. Explain Mastra Cloud as the planned observability/deployment layer.
4. Show that the architecture is Mastra-ready through:

- backend agent boundary
- local Mastra-compatible endpoint
- Gemini configuration support
- Settings modal status
- README setup instructions

## Final Acceptance Criteria

| Check | Required Result |
|---|---|
| Local validation | `npm run validate:final` passes 9/9 |
| Cloud/local agent path | One working path confirmed |
| Customer chat | Response generated successfully |
| Evidence chips | Sources and confidence visible |
| Feedback | Rating storage works |
| Analytics | Learning summary updates |
| Mastra observability | Metrics/logs/traces checked if available |
| Secrets | No keys committed or shown publicly |
