# Proposal for Anthropic

## Memory policy should be a runtime contract, not a side effect of model capability

This note is aimed at the people thinking about long-running agent behavior, safety, and product infrastructure at Anthropic.

The problem I want to isolate is narrow but increasingly important: once an agent is expected to carry continuity across sessions, tools, and hosts, memory behavior needs an explicit contract. Without that contract, safety posture and user expectations depend too heavily on prompt wording, host-specific glue code, and model heuristics.

The core failure is not that models cannot summarize or retrieve. The failure is that many systems still lack a precise answer to questions like:

- What enters memory at all?
- What remains session-scoped only?
- When does short-term unresolved context become formal tracked follow-up?
- Which profile facts can persist over time?
- Which categories must never persist even if the model notices them?
- How does explicit user correction override old summaries and inferred state?

These decisions are often implemented indirectly. Some are encoded in prompts. Some are buried in tool handlers. Some are assumed by product teams. Some are left to “common sense.” That is exactly where systems become fragile. Two hosts can use the same model and produce different memory behavior. Two teams can think they are preserving continuity while actually widening persistence in inconsistent ways.

My proposal is that this layer should be treated as a contract in its own right.

I built a prototype called Continuity Memory Contract Plus, or CMCP. It is not a memory model and not a vector store. It is a policy contract that defines:

- memory layers and their boundaries
- write authorization rules
- promotion from short-term continuity into tracked continuity
- forbidden persistence categories
- new-session carry-over behavior
- onboarding-derived memory
- user correction semantics
- host integration and storage adapter boundaries

The guiding default is intentionally strict: **read by default, do not write by default**. Regular conversation can be used for the immediate turn, but that alone does not authorize persistence. Persistent writes require a valid invocation path. Restricted personalization requires explicit user ownership plus a disclosed surface. Passive multimodal input should not quietly become durable memory just because the system extracted something useful from it.

That default matters for safety and interpretability. A system should be able to say:

- this stayed in session because no authorized write action occurred
- this became tracked because the user explicitly requested follow-up
- this became personalization because it was disclosed, user-owned onboarding data
- this was rejected because it matched a forbidden category
- this was deleted because the user correction path overrode prior state

Those are product statements, but they are also safety statements. They tell you whether the system’s memory posture can be inspected and constrained by design instead of being discovered after the fact.

Why does this matter for Anthropic specifically?

Because a lot of useful agent behavior depends on model honesty about uncertainty, scope, and authority. Memory persistence is part of that authority boundary. A model should not be placed in the position of implicitly deciding what becomes durable user state without a runtime contract constraining the write path. Even if the model is well-behaved, the surrounding product surfaces can drift.

CMCP is my attempt to make that drift testable. I implemented it as a runnable bundle with:

- a canonical human-readable and machine-readable contract
- a runtime guard that enforces write decisions
- storage adapter resolution and fail-closed behavior
- runtime schema validation
- host integration examples
- a multi-host, multi-version, multi-modal wiring matrix

The point of building it this way was to force the policy to survive contact with runtime details. It is easy to write a clean safety principle. It is harder to prove that the same principle still holds when the host passes arrays instead of storage, when a setup wizard discloses profile capture, or when a passive camera scan should remain session-only.

I am not claiming CMCP is the final shape of an industry standard. I am claiming the underlying problem is real enough that agent platforms should stop treating memory semantics as mostly implicit. If Anthropic is thinking about durable agents, policy-aligned memory needs a layer that is separable from training and separable from any one host implementation.

The current CMCP artifact is meant to support that technical discussion. It includes:

- a canonical contract
- a runtime guard
- a host integration boundary
- adversarial verification
- end-to-end verification
- a multi-host and multi-modal integration matrix
- an audit summary that distinguishes enforced invariants from deliberately deferred boundaries

What I am not claiming:

- that CMCP solves semantic inference detection
- that the file-backed adapter proves distributed storage guarantees
- that this is a compliance framework

The concrete ask is modest: evaluate whether an explicit memory policy contract should exist in the runtime architecture itself. If the answer is yes, then I would rather have a technical discussion about boundaries, failure modes, and integration points than a general discussion about “memory features.” That is where the meaningful difference is.
