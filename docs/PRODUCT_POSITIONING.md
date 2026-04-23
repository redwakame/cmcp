# CMCP Product Positioning

Date: 2026-04-24  
Product: Continuity Memory Contract Plus (CMCP) for OpenClaw

## Positioning Statement

CMCP is a policy-first continuity memory layer for OpenClaw.

It is designed for builders who want long-lived agent behavior without leaving memory semantics to prompt drift, UI copy, or storage heuristics.

The product is not "better memory" in the abstract.
The product is an explicit, inspectable contract for what may persist, what must remain session-only, what may be corrected, and what must never be written.

## What CMCP Is

CMCP is:

- a canonical continuity memory contract
- a runtime guard for enforcing the contract
- a host integration boundary for consistent wiring
- a reference storage adapter path
- an executable verification package

In product terms, CMCP gives a host one shared baseline across:

- chat surfaces
- onboarding/setup surfaces
- policy/edit surfaces
- runtime actions
- `/new` continuation behavior

## What CMCP Is Not

CMCP is not:

- a generic chatbot skill pack
- a UI theme
- a marketing shell around memory
- a compliance certification product
- a semantic classifier for every risky inference
- a replacement for host identity, auth, or storage controls

## Core Product Promise

CMCP gives an agent system a single answer to questions that usually drift across layers:

- what enters session only
- what becomes staged continuity
- what is promoted to tracked follow-up
- what belongs in daily writeback only
- what qualifies as durable personalization
- what must never persist
- how `/new` should carry continuity forward
- how onboarding can create initial durable state
- how user correction overrides prior memory

## Default Posture

The product posture is intentionally strict:

- content is read-only by default
- persistent writes require explicit authorized invocation areas
- restricted personalization requires disclosed capture and explicit user ownership
- forbidden content is rejected, not silently accepted
- host-provided state is treated as untrusted input

This strictness is part of the product value.
CMCP is for environments where memory behavior must be legible and defensible, not merely convenient.

## Product Components

### CMCP Core

The canonical contract owner.

Responsibility:

- layer definitions
- promotion rules
- forbidden categories
- `/new` semantics
- onboarding memory rules
- user correction semantics

### CMCP Guard

The enforcement layer.

Responsibility:

- write evaluation
- content safety
- fail-closed correction behavior
- `/new` selection safety
- storage boundary enforcement

### CMCP Setup

The disclosed capture surface.

Responsibility:

- collect setup/profile answers
- distinguish settings from durable memory
- ensure disclosed capture for restricted personalization

### CMCP Policy

The inspection and manual control surface.

Responsibility:

- explain memory decisions
- support manual write and correction flows
- show why something was blocked, staged, tracked, or rejected

## Primary Audience

### 1. OpenClaw Maintainers and Integrators

They need one baseline that skills, hooks, hosts, setup flows, and future UI surfaces can share.

### 2. Self-Hosted Agent Builders

They want continuity behavior without hidden persistence rules.

### 3. Platform and Runtime Reviewers

They care less about whether memory exists and more about whether memory behavior is inspectable, consistent, and testable.

## Product Value

CMCP reduces drift in four places at once:

### 1. Across Surfaces

It keeps setup flows, runtime actions, `/new`, and manual correction mapped to the same contract.

### 2. Across Hosts

It separates memory semantics from the persistence backend so hosts can change storage without redefining policy.

### 3. Across Reviews

It makes memory behavior challengeable with tests rather than defended with prose alone.

### 4. Across Product Claims

It narrows what can honestly be promised in UI, docs, and product pages to what the runtime actually enforces.

## Evidence-Based Proof Points

These are the strongest product proof points today:

- explicit write authorization model
- forbidden-content rejection
- correction fail-closed behavior
- `/new` continuity source selection
- hostile-input handling for host-supplied state
- adversarial verification
- end-to-end integration verification

These should be used as proof points because they are inspectable and runnable.

## Positioning Against Common Alternatives

### "Memory by prompt only"

Weakness:

- hard to inspect
- drifts across hosts and UI surfaces
- weak failure-path guarantees

CMCP position:

- memory behavior should be contract-driven, not prompt-implied

### "Memory by storage heuristics"

Weakness:

- persistence becomes implementation-defined
- difficult to explain to users
- correction semantics are often inconsistent

CMCP position:

- storage should implement policy, not invent it

### "Memory as a single feature"

Weakness:

- ignores transitions between session, follow-up, daily writeback, and personalization

CMCP position:

- memory is not one thing; it is a governed set of layers and transitions

## Safe Messaging

Use wording like:

- policy-first continuity memory
- inspectable memory semantics
- fail-closed memory enforcement
- explicit persistence boundaries
- cross-surface consistency for agent memory

Avoid wording like:

- perfect safety
- full compliance
- human-level judgment
- autonomous memory governance
- remembers only what matters

The safe path is to describe control surfaces and enforced boundaries, not intelligence claims.

## Short Product Description

CMCP is a policy-first continuity memory product for OpenClaw that defines what an agent may persist, what must stay session-only, how `/new` carries continuity, how onboarding creates durable state, and how user correction wins over prior memory.

## One-Line Category

Continuity memory policy and enforcement for OpenClaw.

## Reviewer-Facing Position

For technical reviewers:

CMCP is best understood as a memory-policy contract with executable enforcement and adversarial verification.

## Buyer/User-Facing Position

For self-hosted builders:

CMCP gives your OpenClaw assistant a clear memory policy instead of a pile of memory side effects.

## Platform-Facing Position

For OpenAI or Anthropic reviewers:

CMCP is a concrete argument that long-lived agent memory needs an explicit runtime policy layer orthogonal to model training.

## Current Product Boundary

What is in scope now:

- contract
- guard
- host boundary
- reference adapter
- executable tests
- review materials

What is not the product focus right now:

- polished end-user UI
- turnkey installer UX
- semantic risk classifier
- enterprise storage backend

## Current Positioning Recommendation

Position CMCP as:

- technically credible
- narrow in claims
- strong on inspectability
- strong on failure-path verification
- useful as a review artifact and integration baseline first

That is the right product posture for the current stage.
