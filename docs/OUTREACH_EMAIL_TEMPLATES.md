# CMCP Outreach Email Templates

Date: 2026-04-24  
Artifact: Continuity Memory Contract Plus (CMCP) for OpenClaw

## Use

These templates are for technical outreach, not marketing.

Use them when sending:

- a GitHub repository link
- a release zip
- or a review packet

Do not add claims that the current artifact does not support.

## Shared Attachment / Link Set

Recommended items to include:

- GitHub repo link when the repository is public
- release zip when the repository is not yet public
- [README.md](../README.md)
- [CMCP_AUDIT_SUMMARY.md](CMCP_AUDIT_SUMMARY.md)
- [REVIEW_PACKET.md](REVIEW_PACKET.md)

Optional:

- target-specific proposal doc
- OpenClaw Continuity link as implementation evidence:
  `https://github.com/redwakame/openclaw-continuity`
- one sentence telling the reviewer whether the materials above are repo URLs or attached files

## OpenAI

### Subject

`Technical review request: CMCP memory-policy contract for long-lived agents`

### Body

Hello,

I am sharing a technical review artifact called Continuity Memory Contract Plus (CMCP), built against OpenClaw as a concrete testbed.

The narrow claim is that long-lived agent memory needs an explicit runtime policy layer that is orthogonal to model training. CMCP is an attempt to make that problem concrete and reviewable.

The package includes:

- a canonical memory-policy contract
- a runtime guard
- a host integration boundary
- adversarial and end-to-end verification
- a review packet and audit summary

There is also a separate implementation reference:
https://github.com/redwakame/openclaw-continuity

That repository is the usable OpenClaw skill package. CMCP remains the primary
review artifact; OpenClaw Continuity is included only as evidence that the
contract comes from a real product path.

I am not asking for immediate adoption. I am asking whether memory policy should be treated as an explicit platform concern rather than left to prompts, storage heuristics, or host-local glue code.

If useful, the fastest review path is:

1. read the audit summary
2. read the review packet
3. inspect the contract and runtime guard
4. run the adversarial and end-to-end scripts

Materials:

- README
- CMCP audit summary
- review packet
- OpenAI proposal note

If this is relevant to the team thinking about agent/runtime boundaries, I would value a technical read on whether this layer belongs at the SDK, runtime, or platform boundary.

Best,  
[Your name]

## Anthropic

### Subject

`Technical review request: CMCP runtime memory-policy contract`

### Body

Hello,

I am sharing a technical review artifact called Continuity Memory Contract Plus (CMCP), built as a runnable continuity-memory contract for OpenClaw.

The problem it isolates is narrow: once an agent carries continuity across sessions, tools, and hosts, memory behavior should not remain an implicit side effect of prompts and host glue code. It should be an explicit runtime contract.

The bundle includes:

- a canonical contract
- a runtime guard
- a host integration boundary
- adversarial verification
- end-to-end verification
- an audit summary of enforced invariants and deliberately deferred boundaries

There is also a separate implementation reference:
https://github.com/redwakame/openclaw-continuity

That repository is the usable OpenClaw skill package. CMCP remains the primary
review artifact; OpenClaw Continuity is included only as evidence that the
contract comes from a real product path.

I am not claiming CMCP is a standard or that it solves semantic inference detection. The narrower question is whether policy-aligned memory deserves a separable runtime layer.

The fastest review path is:

1. audit summary
2. review packet
3. contract
4. adversarial and end-to-end verification

Materials:

- README
- CMCP audit summary
- review packet
- Anthropic proposal note

If this is relevant to the people working on long-running agent behavior, safety boundaries, or product/runtime infrastructure, I would value a technical review of the boundary itself.

Best,  
[Your name]

## OpenClaw

### Subject

`Technical review request: CMCP as an explicit memory-policy baseline for OpenClaw`

### Body

Hello,

I built a runnable artifact called Continuity Memory Contract Plus (CMCP) as a policy-first continuity-memory baseline for OpenClaw.

The motivation is simple: OpenClaw already has the right ingredients for long-lived assistants, but memory semantics can still drift across skills, hooks, hosts, setup flows, and `/new` behavior unless the rules are owned by one explicit contract.

CMCP includes:

- the contract
- the guard
- the host integration boundary
- a reference storage path
- adversarial verification
- end-to-end verification
- a multi-host and multi-modal integration matrix

I am not proposing blind adoption. I am proposing a technical review of whether memory policy should be treated as a first-class contract inside the OpenClaw ecosystem.

Suggested review path:

1. audit summary
2. review packet
3. contract
4. guard behavior
5. host integration matrix

Materials:

- README
- CMCP audit summary
- review packet
- OpenClaw proposal note

If useful, I would rather discuss contract boundaries, failure modes, and host assumptions than talk in the abstract about “memory features.”

Best,  
[Your name]

## Independent Technical Reviewer

### Subject

`Review request: CMCP continuity-memory contract and adversarial test bundle`

### Body

Hello,

I am sharing a technical artifact called Continuity Memory Contract Plus (CMCP).

It is a policy-first continuity-memory bundle for OpenClaw with:

- a canonical contract
- a runtime guard
- a host integration boundary
- adversarial verification
- end-to-end verification

The review question is not “do you like the idea of memory.”
The review question is whether the contract is coherent, whether the runtime matches it, and where the boundary is too weak, too strong, or internally inconsistent.

Fastest review path:

1. read the audit summary
2. read the review packet
3. run `npm run adversarial`
4. run `npm run e2e`

Materials:

- README
- CMCP audit summary
- review packet

If you review it, I am most interested in:

- contract/runtime drift
- bypass paths
- correction-path failures
- `/new` revival paths
- host-boundary mismatches

Best,  
[Your name]

## What Not To Say In Outreach

Do not claim:

- that CMCP is already production-certified
- that CMCP solves all semantic safety cases
- that CMCP guarantees compliance
- that CMCP prevents every possible host-side misuse
- that adoption is the expected next step

The outreach should stay technical and review-oriented.
