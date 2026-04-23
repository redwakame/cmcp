# GitHub Pre-Publish Checklist

Date: 2026-04-24  
Artifact: Continuity Memory Contract Plus (CMCP) for OpenClaw

## Purpose

This checklist defines what must be true before CMCP is uploaded to GitHub or shared as a public repository.

## Repository Shape

- `README.md` exists at repository root.
- `package.json` uses the canonical artifact name `cmcp-openclaw`.
- `.codex-plugin/plugin.json` uses the canonical artifact name `cmcp-openclaw`.
- `skills/cmcp-core/` exists.
- `hooks/cmcp-guard/` exists.
- `src/cmcp-guard/` exists.
- `scripts/` contains executable verification scripts.
- `docs/` contains review, audit, publish, and proposal documents.

## Required Documents

- `README.md`
- `docs/REVIEW_PACKET.md`
- `docs/CMCP_AUDIT_SUMMARY.md`
- `docs/BUG_DISPOSITION.md`
- `docs/PRODUCT_POSITIONING.md`
- `docs/PUBLISH_PLAN.md`
- `docs/OPENAI_ANTHROPIC_SEND_LIST.md`
- `docs/openai-cmcp-proposal-en.md`
- `docs/anthropic-cmcp-proposal-en.md`
- `docs/openclaw-cmcp-proposal-en.md`

## Required Contract Files

- `skills/cmcp-core/contract/cmcp-contract-v1.yaml`
- `skills/cmcp-core/contract/cmcp-runtime-policy.json`
- `skills/cmcp-core/contract/cmcp-host-integration-v1.yaml`
- `skills/cmcp-core/contract/cmcp-surface-map.yaml`

## Required Verification Commands

Run before publishing:

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

## Metadata Checks

- package name: `cmcp-openclaw`
- plugin name: `cmcp-openclaw`
- package version and plugin version match
- package is not marked private if public GitHub/npx/npm review is intended
- license is declared
- Node engine is declared

## Link And Path Checks

- no local machine absolute paths
- no desktop workspace paths
- no local file URI links
- no editor URI links
- Markdown links in docs are repo-relative
- generated zip names use `cmcp-openclaw-*`

## Privacy And Scope Checks

- no `V2` source package is included as part of the review artifact
- no private workspace notes are included
- no unrelated desktop files are included
- no credentials, API keys, tokens, or private config files are included
- `runtime-data/` contents are demo outputs only and do not contain private material

## Claim Checks

The repository may claim:

- policy-first continuity memory for OpenClaw
- explicit persistent write authorization
- forbidden-content rejection
- correction fail-closed behavior
- guarded `/new` continuity selection
- adversarial and end-to-end verification

The repository must not claim:

- semantic inference detection is fully solved
- distributed storage correctness is solved
- compliance certification
- universal prevention of host-side misuse
- immediate adoption by OpenAI, Anthropic, or OpenClaw

## Release Checklist

Before tagging a release:

- full verification passes
- zip artifact is rebuilt after final edits
- release zip contains the latest docs
- release notes link to `README.md` and `docs/REVIEW_PACKET.md`
- targeted review zips are rebuilt if recipient-specific packages are used

## Suggested First GitHub Release

Recommended tag:

- `v0.1.0-review`

Recommended release title:

- `CMCP OpenClaw Review Artifact v0.1.0`

Recommended release description:

```text
Continuity Memory Contract Plus (CMCP) for OpenClaw.

This release is a technical review artifact containing the contract, runtime guard, host integration boundary, reference adapter, adversarial verification, end-to-end verification, and reviewer-facing documentation.

Start with README.md and docs/REVIEW_PACKET.md.
```
