---
name: cmcp-guard
description: "Validation-first OpenClaw hook that applies the continuity contract to /new selection, forbidden-text detection, and candidate write decisions."
metadata: {"openclaw":{"emoji":"🧭","events":["agent:bootstrap","command:new","message:received"]}}
---

# CMCP Guard

This hook is the runtime-facing companion to the `cmcp-core` skill.

Current v1 behavior:

- loads the machine-readable continuity policy
- evaluates incoming candidate payloads against the CMCP decision order
- detects obvious forbidden secret-like text before persistence
- validates explicit correction actions against authorized invocation areas
- selects `/new` anchor context when a host or addon provides candidate records in the event payload
- sanitizes host-supplied `/new` records and background profile values before they can surface back to the user
- logs structured policy decisions with owner surface, decision step, route key, and rejection reasons without mutating unrelated runtime state

Expected payload shapes for richer behavior:

- `event.payload.policyCandidate`
- `event.payload.policyCandidates`
- `event.payload.correctionAction`
- `event.payload.correctionActions`
- `event.payload.memoryRecords`
- `event.payload.trackedRecords`
- `event.payload.stagedRecords`
- `event.payload.dailyRecords`

Optional runtime controls:

- `event.payload.persist === true`
  enables persistent writes through the configured CMCP storage adapter
- `event.payload.storageAdapter`
  supplies a host-provided adapter object that implements the CMCP storage adapter interface
- `event.payload.storage`
  supplies a storage descriptor; v1 currently supports `{ kind: "file", stateRoot }`
- `event.payload.stateRoot`
  overrides the default state root used by the bundled file adapter
- `event.payload.readFromState === true`
  lets `/new` load tracked/staged/daily/background profile from the resolved storage adapter when host arrays are omitted

Decision objects emitted by the hook now carry:

- `decisionStep`
- `finalLayer`
- `ownerSurface`
- `invocationArea`
- `routeKey`
- `checkedSteps`
- `reasons`

This keeps v1 small and safe: the bundle defines policy and a formal storage adapter seam, while hosts or later addons can swap persistence backends without rewriting policy logic.
