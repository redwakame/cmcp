# CMCP Audit Summary

Date: 2026-04-24  
Project: Continuity Memory Contract Plus (CMCP) for OpenClaw  
Scope: Current implementation baseline, executable invariants, and deliberately deferred boundaries

## Purpose

This document is not a product page and not an RFC introduction.
It exists so a reviewer can inspect the current CMCP state without reverse-engineering intent from code, tests, and proposals.

It answers three questions:

1. What invariants are currently enforced?
2. What failure paths are actually exercised?
3. What is still intentionally out of scope?

## Current Baseline

CMCP currently consists of:

- policy contract: `skills/cmcp-core/contract/*`
- runtime enforcement: `src/cmcp-guard/*`
- host hook surface: `hooks/cmcp-guard/*`
- executable verification: `scripts/*.mjs`

The current implementation is designed around a fail-closed posture:

- ordinary chat does not persist by default
- explicit invocation area is required for persistent writes
- forbidden content blocks persistence instead of being silently accepted
- `/new` consumes structured state, not transcript replay
- host-provided storage and host-provided `/new` arrays are both treated as untrusted inputs

## Enforced Invariants

### 1. Persistent writes are explicit, not ambient

Persistent writes require:

- `writeMode = explicit_write_enabled`
- an authorized `invocationArea`
- a compatible owner surface
- a target layer that matches the contract

Otherwise the decision falls back to `session`.

### 2. Forbidden content is rejected at runtime

Forbidden-content checks currently cover:

- `continuity_value`
- string `stored_value`
- `latest_user_owned_clause`
- `source_ref`
- `resolution_condition`
- `field_key`
- `personalization_type`
- `anchor_turns[*].text`
- `correction.reason`
- string settings values

Current detection includes:

- obvious secret-like regex patterns
- natural language forms such as `my password is ...`
- prefixed token forms such as `apikey_sk-...`
- Unicode NFKC normalization
- separated password keyword detection such as `p.a.s.s.w.o.r.d`

If detection fires, persistence is rejected. CMCP does not accept-and-redact.

### 3. Adapter writes do not bypass policy safety

The bundled file adapter now enforces:

- record shape validation
- content safety validation
- settings target validation
- settings type validation
- forbidden-content rejection in tombstone reasons

That means schema-valid but content-invalid records are rejected instead of becoming a bypass lane around policy evaluation.

### 4. Correction flows are fail-closed

Current correction invariants:

- invalid `apply_to_layers` fails closed
- `single_record` target must exist or the operation fails closed
- repeated delete of the same target is idempotent
- `replace` requires a live replacement record
- delete always cleans prior derived daily traces, even if `apply_to_layers` omits `daily_memory`

Current correction semantics:

- `delete` removes the target from future anchor selection and redacts deletion writeback
- `suppress` and `resolve` require a live target
- `opt_out` persists suppression state for future writes instead of only mutating existing records

### 5. `/new` is guarded against stale or unsafe continuity

Current `/new` invariants:

- expired staged records are not eligible anchors
- daily linked traces cannot outlive blocked structured sources
- tombstoned sources cannot be revived through daily traces
- orphan daily traces fail closed
- host-supplied `/new` arrays are sanitized and forbidden-scanned before selection
- host-supplied `backgroundProfile` values are filtered before surfacing back to the user

### 6. Snapshot loading is section-fail-closed

For the bundled file store:

- a corrupted section file falls back to an empty/default value for that section
- healthy sections remain readable
- one bad file does not collapse the whole snapshot

This is a pragmatic containment model, not a distributed consistency claim.

## Executable Verification

The current baseline is backed by executable verification, not contract prose alone.

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

## What The Test Layers Cover

### Acceptance

The acceptance harness validates intended product behavior:

- plain chat stays session-only
- explicit follow-up becomes tracked
- disclosed onboarding routes settings and profile writes
- forbidden secrets never persist

### Adversarial

The adversarial harness validates failure paths and bypass attempts, including:

- forbidden content hidden in persisted fields
- invalid storage descriptors
- invalid settings targets and invalid settings value types
- schema-valid adapter writes with forbidden content
- correction reason leakage
- stale daily trace revival attempts
- invalid correction target layers
- phantom correction targets
- repeated delete idempotency
- Unicode and separated-keyword secret detection
- host-supplied `/new` arrays containing forbidden content

### End-to-End

The end-to-end smoke validates that the same candidate object can flow through:

- evaluate -> persist
- write -> delete -> `/new`
- write -> expire -> `/new`
- opt-out -> future write suppression
- corrupted snapshot section isolation

## Current Result Model

The persistence result now keeps backward compatibility while exposing clearer semantics.

Existing field:

- `persisted`

Additional fields:

- `memoryPersisted`
- `settingsPersisted`
- `correctionPersisted`
- `persistenceKinds`

This avoids overloading one boolean to answer multiple questions.
For example, a settings-only write can now be read as:

- `persisted = true`
- `settingsPersisted = true`
- `memoryPersisted = false`

## Deliberately Deferred Boundaries

The following are not being misrepresented as solved:

### 1. Semantic inference detection

CMCP does not pretend to auto-detect categories such as:

- mental health diagnosis
- personality labeling
- legal risk guesses
- financial status guesses

That remains a host-supplied seam via `hostClassifiedForbiddenCategory` / `inferenceForbiddenCategory`.

### 2. Distributed storage guarantees

The bundled file adapter is a reference backend.
CMCP does not claim:

- cross-process transactional consistency
- distributed locking
- multi-section atomic transactions

### 3. Storage quota policy

CMCP currently defines record-level limits, not full storage quota strategy.
Section growth and retention policy beyond current layer semantics remain host/storage concerns.

### 4. Full semantic normalization of all disguised secrets

CMCP now handles several practical bypass patterns, but regex-based secret detection remains best-effort.
It is not a complete semantic DLP system.

## Reviewer Guidance

If reviewing the current CMCP state, focus on:

- whether the enforced invariants match the contract
- whether fail-closed claims are supported by executable tests
- whether host integration is prevented from widening write authority

Do not read the current implementation as claiming:

- universal semantic understanding
- production-grade distributed storage correctness
- final completeness of all privacy classification

The current implementation is best understood as:

- a policy-first continuity layer
- with executable adversarial coverage
- and explicit seams where host/runtime responsibility begins
