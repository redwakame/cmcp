# CMCP Review Packet

Date: 2026-04-24  
Artifact: Continuity Memory Contract Plus (CMCP) for OpenClaw

## Purpose

This document is the fastest correct way to review CMCP.

It is not a product page and not a design essay.
It exists so a technical reviewer can answer, quickly:

1. what CMCP claims
2. what CMCP actually enforces
3. what can be challenged immediately

## Review In One Sentence

CMCP is a policy-first continuity memory bundle for OpenClaw with an explicit contract, a runtime guard, a storage boundary, and executable adversarial verification.

## 10-Minute Review Path

If you only have 10 minutes, use this order:

1. Read [CMCP_AUDIT_SUMMARY.md](CMCP_AUDIT_SUMMARY.md)
2. Read [cmcp-contract-v1.yaml](../skills/cmcp-core/contract/cmcp-contract-v1.yaml)
3. Read [HOOK.md](../hooks/cmcp-guard/HOOK.md)
4. Run:

```bash
npm run check
npm run adversarial
npm run e2e
```

If those three steps make sense, you have already seen the contract, the enforcement path, and the hostile-input coverage.

## 30-Minute Technical Review Path

If you want the shortest serious review:

1. Contract:
   [cmcp-contract-v1.yaml](../skills/cmcp-core/contract/cmcp-contract-v1.yaml)
2. Runtime policy:
   [cmcp-runtime-policy.json](../skills/cmcp-core/contract/cmcp-runtime-policy.json)
3. Host boundary:
   [cmcp-host-integration-v1.yaml](../skills/cmcp-core/contract/cmcp-host-integration-v1.yaml)
4. Runtime enforcement:
   [evaluate-cmcp-write-candidate.js](../src/cmcp-guard/evaluate-cmcp-write-candidate.js)
   [persist-cmcp-write.js](../src/cmcp-guard/persist-cmcp-write.js)
   [select-cmcp-new-anchor.js](../src/cmcp-guard/select-cmcp-new-anchor.js)
5. Content safety:
   [cmcp-content-safety.js](../src/cmcp-guard/cmcp-content-safety.js)
   [detect-cmcp-forbidden-text.js](../src/cmcp-guard/detect-cmcp-forbidden-text.js)
6. Correction logic:
   [apply-cmcp-correction-action.js](../src/cmcp-guard/apply-cmcp-correction-action.js)
7. Verification:

```bash
npm run acceptance
npm run adversarial
npm run e2e
npm run host
npm run matrix
```

## What To Challenge First

If you are reviewing adversarially, challenge these claims first:

### 1. Ordinary chat does not persist by default

Test whether ambient text can become durable memory without:

- `writeMode = explicit_write_enabled`
- an authorized invocation area
- a valid target layer

### 2. Forbidden content never persists

Try secrets in:

- `continuityValue`
- `storedValue`
- `latestUserOwnedClause`
- `evidenceRef`
- `resolutionCondition`
- `fieldKey`
- `anchorTurns`
- `correction.reason`
- settings string values
- host-supplied `/new` arrays

### 3. Delete really deletes what the contract claims

Try:

- deleting a staged or tracked record
- repeating the delete
- limiting `apply_to_layers`
- reviving continuity through `daily_memory`
- reviving continuity through `/new`

### 4. Adapter writes cannot bypass policy

Try schema-valid but content-invalid records through:

- `writeSection`
- `upsertSection`
- `setSettingsValue`

### 5. `/new` cannot revive stale or unsafe state

Try:

- expired staged records
- orphan daily traces
- tombstoned sources
- host-provided tracked/staged arrays with secrets
- hostile `backgroundProfile` values

## Suggested Commands

Run from the repo root:

```bash
npm install
npm run check
npm run acceptance
npm run adversarial
npm run e2e
npm run host
npm run matrix
```

If you want a concrete output artifact:

```bash
npm run demo:host
```

Generated demo files appear under:

- `runtime-data/mock-host-demo/`

## How To Read The Results

### If you care about policy correctness

Start with:

- [CMCP_AUDIT_SUMMARY.md](CMCP_AUDIT_SUMMARY.md)
- [BUG_DISPOSITION.md](BUG_DISPOSITION.md)

### If you care about host integration

Start with:

- [cmcp-host-integration-v1.yaml](../skills/cmcp-core/contract/cmcp-host-integration-v1.yaml)
- [cmcp-storage-adapter.js](../src/cmcp-guard/cmcp-storage-adapter.js)
- [run-cmcp-host-integration-smoke.mjs](../scripts/run-cmcp-host-integration-smoke.mjs)

### If you care about product framing

Start with:

- [PRODUCT_POSITIONING.md](PRODUCT_POSITIONING.md)
- [PUBLISH_PLAN.md](PUBLISH_PLAN.md)

## What CMCP Does Not Claim

Do not review CMCP as if it claims to solve:

- semantic classification of all inference-forbidden content
- distributed storage guarantees
- formal compliance certification
- universal protection against arbitrary hostile hosts

Those boundaries are intentionally documented as deferred or host-owned.

## What A Good Review Outcome Looks Like

A useful review does not need to agree with CMCP.

A useful review should be able to say one of these:

- the contract is coherent and the runtime matches it
- the contract is coherent but the runtime drifts in these places
- the runtime is solid but the contract boundary is too narrow or too broad
- the host integration seam needs different assumptions

That is the level CMCP is intended to be reviewed at.

## If You Need One File To Send First

Send:

- [README.md](../README.md)

Then point the reviewer to:

- [CMCP_AUDIT_SUMMARY.md](CMCP_AUDIT_SUMMARY.md)
- [REVIEW_PACKET.md](REVIEW_PACKET.md)

That pair is the shortest honest entry into the project.
