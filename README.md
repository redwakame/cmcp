# Continuity Memory Contract Plus (CMCP) for OpenClaw

CMCP is a policy-first continuity memory bundle for OpenClaw.

It is designed for builders who want long-lived agent behavior without leaving memory semantics to prompt drift, UI copy, storage heuristics, or host-local guesswork.

The bundle includes:

- `CMCP Core`: the canonical continuity memory contract
- `CMCP Guard`: runtime enforcement for write decisions, correction flows, and `/new`
- `CMCP Setup`: the disclosed capture model for onboarding/setup
- `CMCP Policy`: the inspection and manual-control surface model

## What Problem CMCP Solves

CMCP makes one shared policy explicit across memory layers and product surfaces.

It answers:

- what stays session-only
- what becomes staged continuity
- what is promoted to tracked follow-up
- what belongs in daily writeback only
- what may become durable personalization
- what must never persist
- how `/new` should carry continuity forward
- how onboarding may create initial durable state
- how user correction overrides prior memory

The core posture is strict:

- ordinary chat is read-only by default
- persistent writes require explicit authorized invocation areas
- restricted personalization requires disclosed capture and explicit user ownership
- forbidden content is rejected rather than silently persisted
- host-provided storage and host-provided `/new` inputs are treated as untrusted

## What Is In This Repository

```text
.codex-plugin/   Plugin metadata
docs/            Audit, positioning, proposal, and publish docs
hooks/           CMCP Guard hook entry
scripts/         Acceptance, adversarial, end-to-end, and integration verification
skills/          CMCP Core contract and schemas
src/             Runtime policy, storage, correction, and safety logic
```

Key entry points:

- Contract: [skills/cmcp-core/contract/cmcp-contract-v1.yaml](skills/cmcp-core/contract/cmcp-contract-v1.yaml)
- Runtime policy: [skills/cmcp-core/contract/cmcp-runtime-policy.json](skills/cmcp-core/contract/cmcp-runtime-policy.json)
- Host integration boundary: [skills/cmcp-core/contract/cmcp-host-integration-v1.yaml](skills/cmcp-core/contract/cmcp-host-integration-v1.yaml)
- Guard hook: [hooks/cmcp-guard/HOOK.md](hooks/cmcp-guard/HOOK.md)
- Audit summary: [docs/CMCP_AUDIT_SUMMARY.md](docs/CMCP_AUDIT_SUMMARY.md)
- Review packet: [docs/REVIEW_PACKET.md](docs/REVIEW_PACKET.md)

## Current Product State

CMCP is currently strongest as:

- a technical review artifact
- an integration baseline for OpenClaw hosts
- a policy contract with executable enforcement
- a failure-path-verifiable memory layer

CMCP is not currently positioned as:

- a polished end-user UI product
- a turnkey installer UX
- a semantic classifier for all risky inferences
- a distributed storage system

## Verification

CMCP includes executable verification, not only prose.

Available scripts:

```bash
npm run check
npm run acceptance
npm run adversarial
npm run e2e
npm run pipeline
npm run host
npm run schema
npm run demo:host
npm run matrix
```

The current verification layers cover:

- intended product behavior
- adversarial failure paths
- end-to-end integration flows
- host integration behavior
- runtime shape validation
- multi-host and multi-modal wiring checks

## Install / Run Locally

Requirements:

- Node.js 18 or newer

Run:

```bash
npm install
npm run check
npm run adversarial
```

If you want a concrete runnable example, use:

```bash
npm run demo:host
```

Generated demo artifacts appear under:

- `runtime-data/mock-host-demo/`

## Recommended Reading Order

For a reviewer who wants the shortest correct path:

1. [docs/REVIEW_PACKET.md](docs/REVIEW_PACKET.md)
2. [docs/CMCP_AUDIT_SUMMARY.md](docs/CMCP_AUDIT_SUMMARY.md)
3. [skills/cmcp-core/contract/cmcp-contract-v1.yaml](skills/cmcp-core/contract/cmcp-contract-v1.yaml)
4. [hooks/cmcp-guard/HOOK.md](hooks/cmcp-guard/HOOK.md)
5. [docs/openclaw-cmcp-proposal-en.md](docs/openclaw-cmcp-proposal-en.md) or another target-specific proposal

For a host integrator:

1. [skills/cmcp-core/contract/cmcp-host-integration-v1.yaml](skills/cmcp-core/contract/cmcp-host-integration-v1.yaml)
2. [src/cmcp-guard/cmcp-storage-adapter.js](src/cmcp-guard/cmcp-storage-adapter.js)
3. [scripts/run-cmcp-host-integration-smoke.mjs](scripts/run-cmcp-host-integration-smoke.mjs)
4. [scripts/run-cmcp-integration-matrix.mjs](scripts/run-cmcp-integration-matrix.mjs)

## Docs

- Claude review handoff: [docs/CLAUDE_REVIEW_HANDOFF.md](docs/CLAUDE_REVIEW_HANDOFF.md)
- Review packet: [docs/REVIEW_PACKET.md](docs/REVIEW_PACKET.md)
- Audit summary: [docs/CMCP_AUDIT_SUMMARY.md](docs/CMCP_AUDIT_SUMMARY.md)
- Requirements coverage: [docs/REQUIREMENTS_COVERAGE.md](docs/REQUIREMENTS_COVERAGE.md)
- OpenAI / Anthropic send list: [docs/OPENAI_ANTHROPIC_SEND_LIST.md](docs/OPENAI_ANTHROPIC_SEND_LIST.md)
- GitHub prep checklist: [docs/GITHUB_PREP_CHECKLIST.md](docs/GITHUB_PREP_CHECKLIST.md)
- Bug disposition: [docs/BUG_DISPOSITION.md](docs/BUG_DISPOSITION.md)
- Outreach email templates: [docs/OUTREACH_EMAIL_TEMPLATES.md](docs/OUTREACH_EMAIL_TEMPLATES.md)
- Product positioning: [docs/PRODUCT_POSITIONING.md](docs/PRODUCT_POSITIONING.md)
- Publish plan: [docs/PUBLISH_PLAN.md](docs/PUBLISH_PLAN.md)
- OpenAI proposal: [docs/openai-cmcp-proposal-en.md](docs/openai-cmcp-proposal-en.md)
- Anthropic proposal: [docs/anthropic-cmcp-proposal-en.md](docs/anthropic-cmcp-proposal-en.md)
- OpenClaw proposal: [docs/openclaw-cmcp-proposal-en.md](docs/openclaw-cmcp-proposal-en.md)

## Safe Claims

These claims are supportable by the current artifact:

- CMCP is policy-first continuity memory for OpenClaw
- the bundle includes executable adversarial and end-to-end verification
- persistent memory is not ambient by default
- forbidden content is rejected rather than silently persisted
- correction flows are fail-closed
- `/new` uses structured continuity rather than transcript replay

## Deliberately Deferred Boundaries

CMCP does not currently claim:

- automatic semantic detection of all inference-forbidden categories
- distributed storage guarantees
- full compliance certification
- elimination of every possible leak in arbitrary hosts

Those boundaries are intentionally documented rather than hand-waved away.
