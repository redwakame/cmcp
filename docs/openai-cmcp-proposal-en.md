# Proposal for OpenAI Agents / Platform

## Why AI agents need a memory policy contract that is orthogonal to model training

This note is aimed at the product and engineering leads responsible for OpenAI’s agent platform surface.

The claim is simple: as agents become long-lived, tool-using, and cross-session, memory should stop being treated as an implementation detail and start being treated as a platform contract.

Today, most agent systems can already summarize, extract, and reuse prior context. The hard part is no longer “can the model remember something useful?” The hard part is governance:

- What is allowed to persist?
- What should stay session-only?
- What qualifies as short-term unresolved continuity versus formal tracked follow-up?
- What may become durable personalization?
- What must never be written?
- How does a user correct or delete memory in a way that reliably wins over older summaries and inferences?

These are not training problems. They are runtime policy problems.

The same user utterance can map to different outcomes depending on the surface and invocation path. “Remind me tomorrow” inside an explicit follow-up action may reasonably become tracked continuity. The same sentence in ordinary chat should often remain session-only. “My timezone is UTC+8” inside onboarding with clear disclosure may become personalization. The same fact inferred indirectly from behavior should not. A system that leaves those distinctions to vague prompting or model intuition will eventually become inconsistent across hosts, UIs, and integrations.

That is the problem CMCP is trying to solve.

CMCP, short for Continuity Memory Contract Plus, is a policy-first contract for agent memory behavior. It defines memory layers, write authorization, promotion rules, forbidden categories, `/new` carry-over behavior, onboarding-derived memory, correction semantics, and host integration boundaries. The important part is not the names of the layers. The important part is that each layer has explicit entry conditions and explicit non-goals.

For example:

- `session` is ephemeral working context, not persistent truth.
- `staged` is for short-to-medium unresolved continuity.
- `tracked` is for explicit or repeated follow-up that must survive a new session.
- `daily_memory` is derived writeback, not the primary truth source.
- `long_term_personalization` is for stable, user-owned profile information under stricter rules.

The contract also enforces a default posture that I think matters at platform level: **content read only, no write by default**. Ordinary conversation may be read and used for the current response, but it does not automatically create persistent memory. Persistent memory requires an authorized invocation area. Restricted long-term personalization requires explicit user ownership and a disclosed write surface. Forbidden categories never persist.

Why does this matter for OpenAI specifically?

Because a platform that supports multiple host environments, app surfaces, tools, and runtimes will otherwise re-implement memory semantics in too many places at once. Product teams will explain one thing in UI. SDK samples will encode another thing in code. storage layers will evolve their own heuristics. integrators will add host-local behavior. eventually the model gets blamed for inconsistency that is actually a missing contract problem.

CMCP is an argument that memory policy should sit alongside tool calling, auth, and sandboxing as a first-class control surface. Not because memory is more important than those systems, but because it has the same failure mode when left implicit: it works in demos and drifts in production.

This is not just a document exercise. I built CMCP as a runnable bundle with:

- a canonical contract
- a runtime guard
- a storage adapter boundary
- host integration rules
- runtime shape validation
- multi-host and multi-modal wiring verification

That matters because I am not arguing for “better memory” in the abstract. I am arguing that memory behavior can be made inspectable and testable. A host can prove that a passive multimodal input fails closed to session-only. A setup surface can prove that disclosed timezone capture becomes durable personalization. A `/new` flow can prove which continuity source won, and why.

What I am asking from OpenAI is not immediate product adoption. The narrower question is whether agent memory policy deserves to become an explicit platform concern. If the answer is yes, then the next step is not a marketing conversation. The next step is to evaluate whether a contract like CMCP should exist at SDK, runtime, or platform boundary level so that host products can implement consistent memory behavior without re-inventing the rules.

The current CMCP artifact is concrete enough for technical review rather than abstract discussion. It includes:

- a canonical contract
- a runtime guard
- a host integration boundary
- adversarial verification
- end-to-end verification
- a multi-host and multi-modal integration matrix
- an audit summary that states both enforced invariants and deliberately deferred boundaries

What I am not claiming:

- that CMCP is already a platform standard
- that semantic inference detection is solved
- that this artifact replaces storage, auth, or policy enforcement elsewhere in the stack

The narrower ask is this: if OpenAI is serious about long-lived agents, should memory policy become an explicit platform concern rather than a byproduct of prompts, storage design, or host-local glue code?

If useful, I can provide the current CMCP bundle as a technical review packet. The goal is not to prove that my exact contract is final. The goal is to make the problem concrete enough that platform teams can evaluate whether this layer belongs at the SDK boundary, the runtime boundary, or the platform boundary.
