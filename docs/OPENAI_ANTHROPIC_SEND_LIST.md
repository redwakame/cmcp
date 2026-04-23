# OpenAI and Anthropic Send List

Date: 2026-04-24  
Artifact: Continuity Memory Contract Plus (CMCP) for OpenClaw

## Purpose

This file defines exactly what to send to OpenAI and Anthropic.

Use this as the send checklist so the review package stays consistent and does not drift into extra unrelated material.

## Shared Rule

Do not include `V2` source folders, internal template buckets, or unrelated workspace material.

CMCP should be evaluated as a standalone artifact:

- contract
- guard
- host integration boundary
- executable verification
- audit and review documents

## OpenAI Package

### Primary Zip

Attach:

- `cmcp-openclaw-openai-review-20260424.zip`

### Primary Proposal

Point to:

- `docs/openai-cmcp-proposal-en.md`

### Supporting Documents

Include or link:

- `README.md`
- `docs/REVIEW_PACKET.md`
- `docs/CMCP_AUDIT_SUMMARY.md`
- `docs/PUBLISH_PLAN.md`

### Suggested Email Template

Use:

- `docs/OUTREACH_EMAIL_TEMPLATES.md`
- section: `OpenAI`

### Review Ask

Ask OpenAI to evaluate whether long-lived agent memory policy should be an explicit platform/runtime/SDK boundary rather than an implicit behavior distributed across prompts, storage, and host glue code.

### Do Not Claim

Do not claim:

- CMCP is already a standard
- OpenAI should adopt CMCP as-is
- CMCP solves semantic inference detection
- CMCP is a compliance framework

## Anthropic Package

### Primary Zip

Attach:

- `cmcp-openclaw-anthropic-review-20260424.zip`

### Primary Proposal

Point to:

- `docs/anthropic-cmcp-proposal-en.md`

### Supporting Documents

Include or link:

- `README.md`
- `docs/REVIEW_PACKET.md`
- `docs/CMCP_AUDIT_SUMMARY.md`
- `docs/PUBLISH_PLAN.md`

### Suggested Email Template

Use:

- `docs/OUTREACH_EMAIL_TEMPLATES.md`
- section: `Anthropic`

### Review Ask

Ask Anthropic to evaluate whether memory persistence should be constrained by an explicit runtime contract so long-running agents do not rely on implicit model or host behavior for durable user state.

### Do Not Claim

Do not claim:

- CMCP is a finished safety standard
- CMCP replaces host-side policy
- CMCP solves all semantic safety cases
- CMCP proves production distributed storage guarantees

## Optional Public Repository Link

If the GitHub repository is public, include the repo link in place of or alongside the zip.

If the repository is not public yet, send only the zip and the short email body.

## Preferred Send Order

1. Send to one trusted independent technical reviewer if available.
2. Send to OpenClaw maintainers or a relevant OpenClaw channel.
3. Send to OpenAI with the OpenAI proposal.
4. Send to Anthropic with the Anthropic proposal.

The reason is practical: OpenClaw and independent review are closer to the current artifact shape, while OpenAI and Anthropic are platform-level conversations.

## Final Attachment Check

Before sending, confirm:

- zip file opens
- `README.md` is at the root of the zip
- `docs/REVIEW_PACKET.md` exists
- target-specific proposal exists
- no local machine absolute paths appear in the package
- no `V2` package is included as supporting material
