# CMCP Bug Disposition

Date: 2026-04-23
Project: Continuity Memory Contract Plus (CMCP) for OpenClaw
Scope: Independent disposition of third-party review findings against the current CMCP implementation

## Purpose

This document classifies the reported issues as `confirmed`, `fixed`, `partial`, `deferred`, or `misframed`.
It is not a point-by-point alignment exercise. Each item was checked against the current implementation and then handled according to the actual failure mode.

## Verification Basis

The current disposition is backed by executable verification, not prose-only review.

Executed successfully:

- `npm run check`
- `npm run acceptance`
- `npm run adversarial`
- `npm run e2e`
- `npm run pipeline`
- `npm run host`
- `npm run schema`
- `npm run demo:host`
- `npm run matrix`

The adversarial coverage was added specifically to validate failure paths that were previously under-tested.
An additional end-to-end integration smoke was added to validate that the same candidate object can flow across evaluation, persistence, correction, expiry, and `/new` selection without shape drift.

## Disposition Summary

1. Forbidden text not connected to persistence path: `confirmed`, `fixed`
2. No field length limits: `confirmed`, `fixed`
3. Expired staged records still eligible for `/new`: `confirmed`, `fixed`
4. Delete cascade left deleted content visible through `daily_memory`: `confirmed`, `fixed` for the current v1 deletion model
5. No staged-to-staged same-focus dedup: `confirmed`, `fixed`
6. No tracked-to-tracked same-focus dedup: `confirmed`, `fixed`
7. `target_scope` inconsistency: `misframed`; the real defect was silent failure in direct correction apply
8. `applyCmcpCorrectionAction()` did not self-validate: `confirmed`, `fixed`
9. Correction short-circuits before forbidden filter: `partial`, `deferred`
10. `inference_forbidden` had no runtime detector: `confirmed` as a coverage gap, `partially addressed` with a host-supplied fail-closed seam, not auto-solved in CMCP v1

## Detailed Disposition

### 1. Forbidden text not connected to persistence

Status: `confirmed`, `fixed`

The original review was correct on the core issue. Forbidden-text detection existed, but persistence decisions did not depend on it. That meant a caller could omit `forbiddenCategory` and still persist secret-like text.

The fix was not just "add a scan." The runtime now applies a fail-closed safety assessment across persisted text-bearing fields:

- `continuityValue`
- string `storedValue`
- `latestUserOwnedClause`
- `source_ref`
- `anchor_turns[*].text`

If the scanner detects forbidden content, the write is rejected. The system does not accept-and-redact. It records the reason category without copying the secret text into a persistence-side audit trail. If a caller-supplied forbidden category and scanner result disagree, the more restrictive result wins.

This is enforced in both the decision path and the persistence path, so a caller cannot bypass it by constructing an accepted decision manually.
The detection dictionary was also widened to catch common natural-language forms such as `my password is ...` and `my api key is ...`, not only `key: value` syntax.

### 2. No length limits

Status: `confirmed`, `fixed`

The review was correct. There were no runtime caps on persisted fields. CMCP now rejects oversized writes before persistence and also sanitizes unsafe control characters and bidi override/isolate characters from persisted text.

Current caps are:

- `continuityValue`: 4096 chars
- `latestUserOwnedClause`: 4096 chars
- string `storedValue`: 1024 chars
- `source_ref`: 512 chars
- `anchor_turns[*].text`: 1024 chars

These limits are now reflected in both runtime and contract.

### 3. Expired staged records still eligible for `/new`

Status: `confirmed`, `fixed`

The review was correct. Selection logic did not check `expires_at`. CMCP now filters expired staged records out of `/new` anchor eligibility.

Important scope note: this fix is currently implemented as a selection-time guard. It does not yet perform a background sweep that mutates stale staged records into `expired`. That is an intentional narrow fix for v1 because it closes the user-visible continuity leak without introducing a larger lifecycle scheduler.

After retest, the daily fallback path was tightened as well. A `daily_memory` linked trace may no longer revive a blocked, expired, or tombstoned structured source, and background-only daily fallback does not repopulate `recent_user_context` or `latest_user_owned_clause`.
CMCP now also fails closed when a daily linked trace references a source whose liveness cannot be established from structured state.

### 4. Delete cascade left deleted content visible through `daily_memory`

Status: `confirmed`, `fixed` for current v1 behavior

The review correctly identified a real deletion leak. A deleted source record could still be reintroduced through derived `daily_memory` content.

CMCP now handles this in two parts:

- prior derived `daily_memory` entries linked to the deleted record are removed as part of the correction cascade
- the new deletion writeback record is redacted and does not restate `latest_user_owned_clause` or `anchor_turns`

Important scope note: CMCP v1 does not automatically delete a separately promoted tracked record just because an earlier staged source was deleted. That is a policy decision, not a mechanical bug, and currently requires an explicit correction against the promoted record.

### 5. No staged-to-staged same-focus dedup

Status: `confirmed`, `fixed`

The review was correct. Repeated writes on the same focus could create multiple active staged records. CMCP now supersedes older active staged records for the same focus when a new staged record is persisted.

### 6. No tracked-to-tracked same-focus dedup

Status: `confirmed`, `fixed`

The review was correct. Repeated writes on the same focus could create multiple active tracked records. CMCP now supersedes older active tracked records for the same focus when a new tracked record is persisted.

### 7. `target_scope` inconsistency

Status: `misframed`

The reported symptom was not the most important issue. The schema and normalization path were already aligned on supported target scopes. The actual problem was that a caller could bypass pre-checks and call `applyCmcpCorrectionAction()` directly, which produced a silent no-op instead of a fail-closed error.

That real defect is captured in item 8.

### 8. `applyCmcpCorrectionAction()` did not self-validate

Status: `confirmed`, `fixed`

The review was correct. `applyCmcpCorrectionAction()` assumed the caller had already invoked `canApplyCmcpCorrectionAction()`. That violated fail-closed expectations.

CMCP now validates inside `applyCmcpCorrectionAction()` and throws on invalid input rather than silently returning an unchanged array.

After retest, the full correction pipeline was also normalized across the evaluate-to-persist boundary. The runtime now accepts both canonical correction fields and integration aliases such as `correctionAction`, `targetMemoryId`, `targetScope`, `preserveTombstone`, `redactContent`, `replacementMemoryId`, `invocation_area`, and `write_mode`, so the same candidate object can flow end to end without shape mismatch.

### 9. Correction short-circuits before forbidden filter

Status: `partial`, `deferred`

This is a real structural concern, but it is not currently an exploit in CMCP v1 because correction actions do not persist new user-supplied content. They only mutate or remove existing records.

The review is directionally right: if future correction actions support payload-carrying mutations such as merge or annotate operations, this ordering could become a real bypass. That is now tracked as a future-risk item, not as a currently exploitable persistence failure.

### 10. `inference_forbidden` had no runtime detector

Status: `confirmed` as a gap, `partially addressed`

The review was correct that CMCP had no real semantic detector for categories such as:

- `mental_health_diagnosis`
- `personality_label`
- `relationship_guess`
- `financial_status_guess`
- `legal_risk_guess`

This cannot be honestly fixed with regex. The correct v1 response is to expose a host-supplied fail-closed seam rather than pretend CMCP already performs semantic classification.

CMCP now accepts:

- `hostClassifiedForbiddenCategory`
- `inferenceForbiddenCategory`

If the host provides one of these, CMCP will block persistence accordingly. If the host does not provide a semantic classifier, CMCP v1 does not claim automatic inference-forbidden detection.

## Deferred / Non-v1 Items

These are real engineering considerations, but they are not being misrepresented as solved in the current version:

- background expiry sweep that mutates stale staged records to `expired`
- multi-process locking and cross-process atomic read-modify-write semantics in the reference file adapter
- automatic semantic inference classifiers for `inference_forbidden`
- future correction-action ordering review if CMCP adds payload-carrying correction actions

## Current Position

The main gap in the earlier implementation was not the contract; it was the mismatch between contract intent and adversarial runtime verification. That gap has been reduced by:

- wiring forbidden detection into actual persistence decisions
- enforcing same-focus dedup in primary layers
- preventing expired staged records from anchoring `/new`
- tightening deletion behavior so deleted content is not restated via `daily_memory`
- adding explicit adversarial smoke coverage instead of relying on happy-path tests

The current CMCP state is not "perfect" or "final." It is materially more defensible because the fail-closed claims now have executable coverage behind them.
