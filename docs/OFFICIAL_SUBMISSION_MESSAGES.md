# Official Submission Messages

Date: 2026-04-24
Artifact: Continuity Memory Contract Plus (CMCP)

## Purpose

This file contains ready-to-use submission text for official OpenAI and Anthropic channels.

Use the GitHub repository as the primary artifact:

- https://github.com/redwakame/cmcp

Use the GitHub release as the downloadable snapshot:

- https://github.com/redwakame/cmcp/releases/tag/v0.1.0-review

Do not attach zip files as the first delivery method unless the form or support channel explicitly supports attachments or asks for them.

## OpenAI: Developer Community Post

Recommended channel:

- https://community.openai.com

Suggested category:

- Developer platform / agents / API discussion

Suggested title:

```text
Technical review request: CMCP memory-policy contract for long-lived agents
```

Suggested post:

```text
I am sharing a technical review artifact called Continuity Memory Contract Plus (CMCP):

https://github.com/redwakame/cmcp

CMCP is a policy-first continuity memory contract built against OpenClaw as a concrete testbed.

The narrow question is whether long-lived agent memory should be treated as an explicit runtime/platform contract rather than an implicit behavior spread across prompts, storage heuristics, UI copy, and host-local glue code.

The artifact includes:

- a canonical continuity memory contract
- a runtime guard
- a host integration boundary
- a reference storage adapter
- adversarial verification
- end-to-end verification
- a review packet and audit summary

The repo is not asking for immediate adoption. It is meant to make the boundary inspectable:

- what stays session-only
- what may become staged continuity
- what promotes to tracked follow-up
- what belongs in daily writeback only
- what can become long-term personalization
- what must never persist
- how /new carries continuity forward
- how user correction overrides prior memory

Start here:

- README: https://github.com/redwakame/cmcp
- Review packet: https://github.com/redwakame/cmcp/blob/main/docs/REVIEW_PACKET.md
- Audit summary: https://github.com/redwakame/cmcp/blob/main/docs/CMCP_AUDIT_SUMMARY.md
- OpenAI proposal note: https://github.com/redwakame/cmcp/blob/main/docs/openai-cmcp-proposal-en.md

I would value technical feedback on whether this kind of memory-policy layer belongs at the SDK boundary, runtime boundary, or platform boundary.

I am especially interested in:

- contract/runtime drift
- bypass paths
- correction-path failures
- /new revival paths
- host integration assumptions

Deliberately not claimed:

- semantic inference detection is fully solved
- distributed storage consistency is solved
- this is a compliance framework
- OpenAI should adopt CMCP as-is
```

## OpenAI: Help Center / Support Messenger

Recommended channel:

- https://help.openai.com

Suggested short message:

```text
Hello,

I am sharing a technical review artifact that may be relevant to OpenAI's agent/platform work:

https://github.com/redwakame/cmcp

CMCP is a policy-first continuity memory contract for long-lived agents. It defines explicit rules for what may persist, what must remain session-only, how /new should carry continuity, how onboarding can create durable state, and how user correction overrides prior memory.

The artifact includes a contract, runtime guard, host integration boundary, adversarial tests, end-to-end tests, and an audit summary:

https://github.com/redwakame/cmcp/blob/main/docs/REVIEW_PACKET.md
https://github.com/redwakame/cmcp/blob/main/docs/CMCP_AUDIT_SUMMARY.md
https://github.com/redwakame/cmcp/blob/main/docs/openai-cmcp-proposal-en.md

I am not asking for immediate adoption. I am asking whether memory policy for long-lived agents should be treated as an explicit SDK/runtime/platform boundary rather than an implementation detail.

If possible, could this be routed to the team responsible for Agents SDK, platform runtime boundaries, or long-lived agent memory behavior?

Thank you.
```

## OpenAI: Contact Sales Form

Recommended only if positioning as platform collaboration or enterprise discussion.

Channel:

- https://openai.com/contact-sales

Suggested field choices:

- Interest: API for Enterprise or Codex, depending on available form options
- Company name: use your own project/entity name if you have one; otherwise use personal/independent researcher wording
- Business needs/challenges: paste the text below

Suggested long field text:

```text
I am requesting technical routing rather than a conventional sales conversation.

I built a review artifact called Continuity Memory Contract Plus (CMCP):

https://github.com/redwakame/cmcp

CMCP is a policy-first continuity memory contract for long-lived agents. It is built against OpenClaw as a concrete testbed and includes a contract, runtime guard, host integration boundary, adversarial verification, end-to-end verification, and an audit summary.

The question is whether memory policy for long-lived agents should be treated as an explicit platform/runtime/SDK boundary rather than left to prompts, storage heuristics, or host-local glue code.

OpenAI-facing proposal:
https://github.com/redwakame/cmcp/blob/main/docs/openai-cmcp-proposal-en.md

Review packet:
https://github.com/redwakame/cmcp/blob/main/docs/REVIEW_PACKET.md

Audit summary:
https://github.com/redwakame/cmcp/blob/main/docs/CMCP_AUDIT_SUMMARY.md

I am not asking for immediate product adoption. I would value a technical review by someone working on agent platform boundaries, SDK/runtime behavior, or memory semantics.
```

## Anthropic: Claude API / Console Support Messenger

Recommended channel:

- https://support.anthropic.com
- Claude Console "Get help" if logged in

Suggested short message:

```text
Hello,

I am sharing a technical review artifact that may be relevant to long-running agent behavior and runtime memory policy:

https://github.com/redwakame/cmcp

CMCP is a policy-first continuity memory contract. It defines explicit rules for what may persist, what must remain session-only, what can become tracked continuity, what belongs in daily writeback only, what can become long-term personalization, and how user correction overrides prior memory.

The artifact includes a contract, runtime guard, host integration boundary, reference adapter, adversarial verification, end-to-end verification, and an audit summary.

Review packet:
https://github.com/redwakame/cmcp/blob/main/docs/REVIEW_PACKET.md

Audit summary:
https://github.com/redwakame/cmcp/blob/main/docs/CMCP_AUDIT_SUMMARY.md

Anthropic-facing proposal:
https://github.com/redwakame/cmcp/blob/main/docs/anthropic-cmcp-proposal-en.md

I am not claiming this is a finished standard, and I am not claiming semantic inference detection is solved. The narrow question is whether memory persistence for long-running agents should be constrained by an explicit runtime contract.

If possible, could this be routed to the team thinking about long-running agents, tools, runtime safety boundaries, or product infrastructure?

Thank you.
```

## Anthropic: Claude Platform / Sales Form

Recommended only if the support route cannot reach product/runtime reviewers or if the form is the only available path.

Channel:

- https://www.anthropic.com/api

Suggested long field text:

```text
I am requesting technical routing rather than a conventional sales conversation.

I built a review artifact called Continuity Memory Contract Plus (CMCP):

https://github.com/redwakame/cmcp

CMCP is a policy-first continuity memory contract for long-running agents. It is built as a concrete OpenClaw-based artifact with a canonical contract, runtime guard, host integration boundary, reference adapter, adversarial verification, end-to-end verification, and an audit summary.

The question is whether durable agent memory should be constrained by an explicit runtime contract rather than being an implicit side effect of prompts, host glue code, or storage behavior.

Anthropic-facing proposal:
https://github.com/redwakame/cmcp/blob/main/docs/anthropic-cmcp-proposal-en.md

Review packet:
https://github.com/redwakame/cmcp/blob/main/docs/REVIEW_PACKET.md

Audit summary:
https://github.com/redwakame/cmcp/blob/main/docs/CMCP_AUDIT_SUMMARY.md

I am not asking for immediate adoption. I would value a technical review by someone working on long-running agents, tool/runtime boundaries, or memory safety.
```

## Notes Before Submission

- Use GitHub links first.
- Mention the release zip only if the channel asks for downloadable artifacts.
- Do not attach the zip unless the channel supports attachments.
- Do not submit to unofficial addresses or non-company domains.
- Do not describe CMCP as an adopted standard.
- Do not describe CMCP as a compliance framework.

