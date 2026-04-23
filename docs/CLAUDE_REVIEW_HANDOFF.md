# CMCP Claude Review Handoff

Date: 2026-04-24  
Artifact: Continuity Memory Contract Plus (CMCP) for OpenClaw  
Purpose: Independent technical review by Claude

## What This Is

This is a technical review packet for CMCP.

CMCP is a policy-first continuity memory bundle for OpenClaw. It defines:

- what stays session-only
- what becomes staged continuity
- what is promoted to tracked follow-up
- what belongs in daily writeback only
- what may become durable personalization
- what must never persist
- how `/new` should carry continuity forward
- how onboarding may create initial durable state
- how user correction overrides prior memory

The current implementation includes:

- a contract
- a runtime guard
- a host integration boundary
- a reference file-backed adapter
- executable adversarial and end-to-end verification

## Review Goal

Please review this artifact as a technical system, not as product copy.

The review question is:

> Does the current CMCP contract match the current runtime behavior, and are there remaining bypasses, contradictions, or fail-closed gaps?

## Review Constraints

Please do not:

- assume prior review notes are correct without re-verification
- treat passing tests as proof that the system is complete
- evaluate CMCP as if it claims to solve semantic inference detection or distributed storage correctness
- judge the artifact as an end-user UI product

Please do:

- independently verify
- try to break the contract claims
- distinguish real bugs from design choices
- distinguish implemented scope from deliberately deferred scope

## Claimed Current Scope

The current artifact does claim:

- ordinary chat is read-only by default
- persistent writes require explicit authorized invocation areas
- forbidden content is rejected rather than silently persisted
- correction flows are fail-closed
- adapter writes should not bypass policy safety
- `/new` should not revive blocked, stale, or forbidden continuity
- host-provided storage and host-provided `/new` arrays are treated as untrusted inputs

The current artifact does not claim:

- universal semantic detection of all inference-forbidden content
- distributed transactional guarantees
- compliance certification
- complete protection against arbitrary hostile hosts

## Fastest Review Path

If you want the shortest serious path, use this order:

1. [README.md](../README.md)
2. [REVIEW_PACKET.md](REVIEW_PACKET.md)
3. [CMCP_AUDIT_SUMMARY.md](CMCP_AUDIT_SUMMARY.md)
4. [cmcp-contract-v1.yaml](../skills/cmcp-core/contract/cmcp-contract-v1.yaml)
5. [HOOK.md](../hooks/cmcp-guard/HOOK.md)
6. Runtime enforcement files:
   - [evaluate-cmcp-write-candidate.js](../src/cmcp-guard/evaluate-cmcp-write-candidate.js)
   - [persist-cmcp-write.js](../src/cmcp-guard/persist-cmcp-write.js)
   - [select-cmcp-new-anchor.js](../src/cmcp-guard/select-cmcp-new-anchor.js)
   - [apply-cmcp-correction-action.js](../src/cmcp-guard/apply-cmcp-correction-action.js)
   - [cmcp-content-safety.js](../src/cmcp-guard/cmcp-content-safety.js)
   - [detect-cmcp-forbidden-text.js](../src/cmcp-guard/detect-cmcp-forbidden-text.js)

## Commands To Run

Run from the repository root:

```bash
npm install
npm run check
npm run acceptance
npm run adversarial
npm run e2e
npm run host
npm run matrix
```

Optional:

```bash
npm run demo:host
```

## What To Challenge First

### 1. Ambient persistence

Try to persist ordinary content without:

- `writeMode = explicit_write_enabled`
- an authorized invocation area
- a valid target layer

### 2. Forbidden-content coverage

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

### 3. Delete and correction correctness

Try:

- delete with restricted `apply_to_layers`
- repeated delete
- phantom target ids
- replace with invalid replacement ids
- suppression / opt-out edge cases

### 4. `/new` revival paths

Try:

- expired staged records
- daily traces linked to blocked sources
- orphan daily traces
- host-provided arrays with hostile content
- background profile leakage

### 5. Adapter bypass paths

Try:

- schema-valid but content-invalid `writeSection`
- `upsertSection` with hostile records
- `setSettingsValue` with invalid targets or invalid types

## How To Report Findings

Please separate findings into:

1. confirmed bug
2. partial / scope-limited issue
3. design choice, not bug
4. claim mismatch between contract and runtime

For each real issue, include:

- a one-line summary
- severity
- the exact path or file
- a minimal reproduction payload or command
- why it violates the current CMCP claim

If you believe something is not a bug, say so explicitly.

## Useful Reference Docs

- [BUG_DISPOSITION.md](BUG_DISPOSITION.md)
- [PRODUCT_POSITIONING.md](PRODUCT_POSITIONING.md)
- [PUBLISH_PLAN.md](PUBLISH_PLAN.md)

These are useful for context, but runtime/code verification should take priority over prose.

## Short Cover Note

If you need one sentence to frame the review:

> CMCP is trying to make continuity-memory policy explicit and testable; the review task is to verify whether the current runtime actually deserves the boundaries it claims.
