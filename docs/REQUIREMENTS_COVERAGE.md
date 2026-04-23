# CMCP Requirements Coverage

Date: 2026-04-24  
Artifact: Continuity Memory Contract Plus (CMCP) for OpenClaw

## Purpose

This file checks the current CMCP artifact against the original product scope.

The rule for this review is:

- do not remove requested scope
- additions are acceptable if they support the original scope
- deferred boundaries must be explicit

## Original Scope Coverage

### New session carries old session

Status: covered

Defined in:

- `skills/cmcp-core/contract/cmcp-contract-v1.yaml`
- `skills/cmcp-core/contract/cmcp-runtime-policy.json`
- `src/cmcp-guard/select-cmcp-new-anchor.js`
- `scripts/run-cmcp-end-to-end-integration-smoke.mjs`

Current behavior:

- `/new` selects structured continuity, not transcript replay.
- priority is tracked, staged, daily trace, then background profile.
- expired, deleted, orphaned, and unsafe sources are blocked.

### What enters session

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `evaluate-cmcp-write-candidate.js`

Current behavior:

- ordinary content defaults to session-only.
- failed or unauthorized persistent writes fall back to session.

### What does not enter session

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`

Current behavior:

- session is not long-term truth.
- deleted memory cannot be revived from session cache.
- session does not grant persistent write authority.

### What enters staged

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `cmcp-runtime-policy.json`
- `evaluate-cmcp-write-candidate.js`
- `persist-cmcp-write.js`

Current behavior:

- staged requires explicit write mode and authorized invocation area.
- default staged TTL is 12h.
- same-focus active staged records are deduplicated.

### What promotes to tracked

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `cmcp-runtime-policy.json`
- `evaluate-cmcp-write-candidate.js`
- `persist-cmcp-write.js`

Current behavior:

- explicit follow-up or equivalent authorized signals can promote to tracked.
- same-focus active tracked records are deduplicated.
- tracked records survive `/new` when active and unresolved.

### What writes daily memory

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `persist-cmcp-write.js`

Current behavior:

- daily memory is derived writeback.
- it is not the primary truth source.
- deletion cleanup prevents stale derived daily traces from reviving deleted content.

### What can become long-term personalization

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `cmcp-runtime-policy.json`
- `cmcp-settings-policy.js`
- `evaluate-cmcp-write-candidate.js`

Current behavior:

- long-term personalization requires explicit write authorization.
- restricted profile fields require disclosed capture and user ownership.
- opt-out suppression can block future matching personalization writes.

### What must never be written

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `cmcp-content-safety.js`
- `detect-cmcp-forbidden-text.js`
- `evaluate-cmcp-write-candidate.js`
- `cmcp-file-storage-adapter.js`

Current behavior:

- forbidden content is scanned across persisted text fields, correction reasons, settings strings, and host-supplied `/new` inputs.
- schema-valid but content-invalid adapter writes are rejected.
- semantic inference forbidden categories remain host-supplied, not automatic.

### `/new` carryover

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `select-cmcp-new-anchor.js`
- `run-cmcp-end-to-end-integration-smoke.mjs`

Current behavior:

- `/new` returns structured continuity payloads.
- stale, expired, tombstoned, orphaned, or forbidden anchors are blocked.
- background profile is sanitized before surfacing.

### Onboarding initial memory

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `cmcp-surface-map.yaml`
- `evaluate-cmcp-write-candidate.js`
- `persist-cmcp-write.js`

Current behavior:

- onboarding routes settings separately from durable memory.
- disclosed profile capture can produce long-term personalization.
- current unfinished tasks remain session-only by default.

### User correction

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `cmcp-correction-action.schema.json`
- `apply-cmcp-correction-action.js`
- `persist-cmcp-write.js`

Current behavior:

- latest explicit user correction wins.
- delete, resolve, suppress, replace, and opt-out are modeled.
- invalid target layers and phantom targets fail closed.
- repeated delete is idempotent.
- correction reasons are sanitized and forbidden-scanned.

### UI / addon / product page / installer mapping

Status: covered

Defined in:

- `cmcp-contract-v1.yaml`
- `cmcp-surface-map.yaml`
- `PRODUCT_POSITIONING.md`
- `PUBLISH_PLAN.md`

Current behavior:

- `CMCP Core` owns the contract.
- `CMCP Guard` owns enforcement.
- `CMCP Setup` owns disclosed capture.
- `CMCP Policy` owns inspection/manual correction surface semantics.
- product page and outreach copy are explanatory, not canonical.

## Additions Beyond Original Scope

These were added to make the original scope testable and publishable:

- storage adapter interface
- reference file-backed adapter
- runtime schema validation
- adversarial harness
- end-to-end smoke harness
- multi-host and multi-modal integration matrix
- audit summary
- review packet
- publish plan
- OpenAI / Anthropic / OpenClaw proposal drafts
- outreach templates

These additions do not replace the original scope.
They make the original scope inspectable.

## Explicitly Deferred

Current artifact does not claim:

- automatic semantic inference detection
- distributed storage transaction guarantees
- formal compliance certification
- polished end-user UI
- turnkey installer UX

These are documented in:

- `docs/CMCP_AUDIT_SUMMARY.md`
- `docs/PRODUCT_POSITIONING.md`
- `docs/PUBLISH_PLAN.md`

## Coverage Conclusion

The current CMCP artifact covers all originally requested topics and adds supporting verification, packaging, and review materials.

No original topic is intentionally removed.

