# CMCP Publish Plan

Date: 2026-04-24  
Artifact: Continuity Memory Contract Plus (CMCP) for OpenClaw

## Canonical Artifact Naming

For the current review package, the canonical artifact identifier is:

- `cmcp-openclaw`

This identifier should match across:

- plugin metadata
- package metadata
- release zip naming

If a future npm publication requires a scoped package name, that should be treated as a deliberate distribution change and reflected in this plan, not introduced implicitly.

## Objective

Publish CMCP as a reviewable, inspectable, and technically credible bundle.

The goal is not broad distribution first.
The goal is to ship one stable package that:

- a maintainer can inspect
- a platform team can evaluate
- a host integrator can run locally
- a reviewer can challenge with adversarial input

## Publish Principles

CMCP should be published under these constraints:

- do not market beyond the current verified scope
- keep contract, runtime guard, tests, and docs in the same artifact
- prefer inspectability over convenience
- treat failure-path verification as part of the product
- do not split policy claims from executable evidence

## Recommended Release Order

### Phase 1: Technical Review Package

Primary audience:

- OpenClaw maintainers
- OpenAI agent/platform reviewers
- Anthropic tool/runtime reviewers
- trusted external technical reviewers

Primary format:

- GitHub repository
- attached zip for direct review
- short cover note linking to audit and proposal docs

Why first:

- preserves inspectability
- makes code, contract, and tests reviewable together
- avoids npm distribution before the API and packaging expectations settle

### Phase 2: Public Repository Release

Primary audience:

- self-hosted OpenClaw users
- plugin and host integrators
- security-minded reviewers

Release shape:

- public GitHub repo
- tagged release
- downloadable zip artifact

Required repo sections:

- `README.md`
- `docs/CMCP_AUDIT_SUMMARY.md`
- `docs/REQUIREMENTS_COVERAGE.md`
- `docs/GITHUB_PREP_CHECKLIST.md`
- `docs/OPENAI_ANTHROPIC_SEND_LIST.md`
- `docs/PRODUCT_POSITIONING.md`
- `docs/PUBLISH_PLAN.md`
- `docs/openai-cmcp-proposal-en.md`
- `docs/anthropic-cmcp-proposal-en.md`
- `docs/openclaw-cmcp-proposal-en.md`

### Phase 3: npm Package

Primary audience:

- host/runtime integrators
- CI-driven evaluation users

Condition for npm:

- package surface must be intentionally supported
- install story must be stable enough that downstream users are not forced to patch local paths or unpublished assumptions
- exported runtime entry points must be documented

Until then, GitHub should remain the primary installation and review channel.

## Recommended Distribution Channels

### 1. GitHub

Use GitHub as the canonical public distribution path.

Reasons:

- best for code review
- easiest place to inspect diffs, issues, and test surfaces
- appropriate for a contract-first artifact
- supports release tags and downloadable bundles

### 2. Direct Reviewer Outreach

Use direct outreach in parallel with GitHub for:

- OpenAI
- Anthropic
- OpenClaw maintainers

Recommended payload:

- one proposal document tailored to the recipient
- one link to the repo or zip
- one link to `CMCP_AUDIT_SUMMARY.md`

### 3. npm

Use later, not first.

npm is useful only if CMCP is being consumed as a reusable integration package rather than only reviewed as a bundle.
Publishing too early will create support expectations around versioning and runtime compatibility before the public integration surface is fully frozen.

## Release Artifact Checklist

Before a review package goes out, confirm:

- no hardcoded local machine paths remain
- no private workspace metadata remains
- zip contents match the current repo state
- contract docs align with runtime behavior
- adversarial and end-to-end scripts pass
- plugin metadata, package metadata, and release artifact naming agree on the canonical identifier
- deliberately deferred boundaries are explicitly documented

## Minimum Public Bundle Contents

These should ship together:

- canonical contract
- runtime enforcement hook
- storage adapter interface
- reference file-backed adapter
- executable tests
- audit summary
- target-specific proposal docs
- publish and positioning docs

Do not publish only the prose or only the code.
CMCP is strongest when the policy claim and executable proof stay together.

## Claims That Are Safe To Make Publicly

These are supportable today:

- CMCP is a policy-first continuity memory contract for OpenClaw
- ordinary chat is read-only and does not persist by default
- persistent writes require explicit authorized invocation areas
- forbidden content is rejected rather than silently persisted
- `/new` uses structured continuity rather than transcript replay
- correction flows are fail-closed
- bundled storage and host-supplied `/new` inputs are treated as untrusted
- the bundle includes adversarial and end-to-end verification

## Claims That Should Not Be Made Publicly

Do not claim:

- semantic inference detection is solved
- distributed storage consistency is solved
- CMCP prevents every possible secret leak in arbitrary hosts
- CMCP is a formal compliance certification layer
- CMCP is already a platform standard

Those positions would overstate the current scope.

## Packaging Guidance

### GitHub Repository

Recommended first public form:

- source tree intact
- docs included
- tests included
- release zip attached to a tagged release

### Review Zip

Recommended file naming:

- `cmcp-openclaw-YYYYMMDD.zip`
- `cmcp-openclaw-<recipient>-review-YYYYMMDD.zip` for targeted review handoff

Recommended use:

- direct evaluator handoff
- attachment in technical outreach
- immutable review snapshot

### npm Package

If npm is used later, publish only after:

- supported entry points are documented
- expected consumer workflow is clear
- semver expectations are explicit

## Outreach Order

Recommended order:

1. OpenClaw maintainers
2. selected independent technical reviewers
3. OpenAI platform/agents reviewers
4. Anthropic tool/runtime reviewers
5. broader public release

Reason:

- OpenClaw is the most direct implementation context
- external technical review improves credibility before platform outreach
- platform teams should receive a stable, review-ready artifact rather than an actively shifting draft

## Suggested Short Cover Note

Use a short note, not a long pitch:

> CMCP is a policy-first continuity memory contract for OpenClaw.  
> This package includes the contract, runtime guard, host integration boundary, executable adversarial tests, and an audit summary.  
> I am not asking for immediate adoption. I am asking whether memory policy should be reviewed as an explicit contract rather than an implementation detail.

## Current Recommendation

Current best next move:

1. publish the current bundle to GitHub
2. attach the release zip
3. send targeted technical review notes to OpenClaw, OpenAI, and Anthropic

npm should remain optional until the supported consumer interface is narrower and more stable.
