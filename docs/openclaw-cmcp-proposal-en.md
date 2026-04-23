# Proposal for OpenClaw Maintainers

## Why OpenClaw is a strong place to adopt a memory policy contract

This note is aimed at OpenClaw maintainers and contributors who are shaping how long-lived assistant behavior is expressed across skills, hooks, host surfaces, and runtime integrations.

OpenClaw is an unusually good environment for working on memory policy because it already has the right ingredients: skills, hooks, sessions, explicit surfaces, and a self-hosted runtime where implementation details are visible. That is exactly why I think memory policy should become more explicit inside this ecosystem.

The problem is not that OpenClaw lacks memory-related mechanisms. The problem is that memory semantics can still drift unless there is a single contract that answers, in one place:

- what belongs in session only
- what qualifies for staged continuity
- what should be promoted to tracked follow-up
- what belongs in daily writeback only
- what may become long-term personalization
- what is forbidden to persist
- how `/new` should carry forward continuity
- how onboarding should create initial durable state
- how user correction should override prior memory

Without a contract, those rules tend to leak across too many layers. A skill implies one behavior. A hook enforces another. An installer or UI explains a third. A downstream host integration adds edge-case logic. Over time, “memory” becomes a pile of adjacent features rather than a coherent policy.

That is the problem CMCP is trying to address for OpenClaw.

CMCP, or Continuity Memory Contract Plus, is not intended as another generic skill pack. It is meant to be a policy baseline for continuity memory. In practical terms, it defines five layers:

- `session`
- `staged`
- `tracked`
- `daily_memory`
- `long_term_personalization`

But more importantly, it defines the transitions and prohibitions between them. The default rule is strict: ordinary content is read-only and does not persist by default. Persistent writes require authorized invocation areas. Restricted personalization requires explicit user ownership and disclosed capture. Forbidden categories never persist.

I chose that posture because OpenClaw is already flexible enough that looser defaults will produce divergence quickly. The same system can run with multiple hosts, multiple runtime actions, onboarding flows, UI affordances, and third-party integrations. That flexibility is a strength, but it also means memory behavior must be legible or it will fragment.

The current CMCP bundle is structured around that idea:

- `CMCP Core` is the canonical contract owner
- `CMCP Guard` is the enforcement hook
- `CMCP Setup` is the onboarding / installer capture surface
- `CMCP Policy` is the inspection and manual edit surface
- host runtime actions map explicit in-chat memory actions into the contract

I also made the host integration boundary explicit. That matters because memory policy should not be tied to a single storage backend. The current reference path uses a file-backed adapter, but the policy logic resolves through a storage adapter interface. That allows hosts to change persistence mechanics without changing memory semantics.

Just as important, the bundle is testable. I added:

- acceptance harnesses
- write pipeline smoke tests
- host integration smoke tests
- runtime shape validation
- a mock host demo
- a multi-host, multi-version, multi-modal integration matrix

That last point is where I think this becomes useful to OpenClaw rather than merely interesting. A maintainer can inspect whether a passive multimodal capture fails closed, whether `/new` respects tracked-over-staged priority, whether deleted records are blocked from future anchors, and whether disclosed onboarding data becomes long-term personalization without widening other write paths.

What I am proposing to OpenClaw is not that CMCP should be adopted wholesale as-is. The narrower proposal is:

1. treat memory policy as a first-class contract rather than distributed behavior
2. keep skills, hooks, UI, and installers mapped to the same contract
3. make host integrations prove they preserve that contract

If OpenClaw wants to remain a flexible runtime for long-lived assistants, this is the kind of boundary that helps. Otherwise every new surface can accidentally redefine memory behavior in small, locally reasonable ways that accumulate into system drift.

I am sharing CMCP as a concrete artifact because it is easier to argue from running code and verified paths than from abstract principles. The current bundle includes:

- the contract
- the guard
- the host integration boundary
- adversarial verification
- end-to-end verification
- a multi-host and multi-modal integration matrix
- an audit summary of what is and is not currently enforced

What I am not claiming:

- that CMCP should be merged wholesale
- that every boundary is already final
- that semantic inference detection is solved inside CMCP v1

If useful, the next step should be a technical review of the contract, the hook behavior, and the host integration matrix. That is the right place to decide whether OpenClaw should adopt, adapt, or reject parts of this approach.
