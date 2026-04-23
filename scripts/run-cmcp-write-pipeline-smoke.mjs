import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createCmcpFileStorageAdapter } from "../src/cmcp-guard/cmcp-file-storage-adapter.js";
import { evaluateCmcpWriteCandidate } from "../src/cmcp-guard/evaluate-cmcp-write-candidate.js";
import { persistCmcpWriteDecision } from "../src/cmcp-guard/persist-cmcp-write.js";
import { resolveCmcpStorageAdapter } from "../src/cmcp-guard/cmcp-storage-adapter.js";
import { selectCmcpNewAnchor } from "../src/cmcp-guard/select-cmcp-new-anchor.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runCase(name, fn) {
  fn();
  console.log(`ok ${name}`);
}

const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmcp-write-pipeline-"));
const storageAdapter = createCmcpFileStorageAdapter({ stateRoot });
const storageInput = { storageAdapter };

runCase("file_storage_adapter_exposes_expected_descriptor", () => {
  const descriptor = storageAdapter.describe();

  assert(descriptor.adapterId === "cmcp.file", "expected file adapter id");
  assert(descriptor.adapterKind === "file", "expected file adapter kind");
  assert(descriptor.stateRoot === stateRoot, "expected state root to round-trip");
  assert(descriptor.capabilities.snapshotReads === true, "expected snapshot read capability");
});

runCase("storage_descriptor_resolves_to_file_adapter", () => {
  const resolved = resolveCmcpStorageAdapter({
    storage: {
      kind: "file",
      stateRoot
    }
  });
  const descriptor = resolved.describe();

  assert(descriptor.adapterId === "cmcp.file", "expected resolved file adapter id");
  assert(descriptor.stateRoot === stateRoot, "expected descriptor stateRoot");
});

runCase("persist_staged_then_daily_memory", () => {
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "follow up on design review",
    evidenceRef: "turn-1"
  };

  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(result.persisted === true, "expected staged persistence");
  assert(result.memoryPersisted === true, "expected memory persistence facet");
  assert(result.settingsPersisted === false, "expected no settings persistence facet");
  assert(result.storage.adapterKind === "file", "expected file storage result");
  assert(storageAdapter.readSection("staged").length === 1, "expected staged record");
  assert(storageAdapter.readSection("daily_memory").length === 1, "expected daily memory record");
});

runCase("persist_with_storage_descriptor_input", () => {
  const descriptorStateRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmcp-write-pipeline-descriptor-"));
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "descriptor-backed staged write",
    evidenceRef: "turn-descriptor-1"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, {
    storage: {
      kind: "file",
      stateRoot: descriptorStateRoot
    }
  });
  const descriptorAdapter = createCmcpFileStorageAdapter({ stateRoot: descriptorStateRoot });

  assert(result.persisted === true, "expected descriptor-backed persistence");
  assert(result.memoryPersisted === true, "expected memory persistence facet");
  assert(result.storage.adapterKind === "file", "expected file adapter kind");
  assert(result.storage.stateRoot === descriptorStateRoot, "expected persistence state root");
  assert(descriptorAdapter.readSection("staged").length === 1, "expected descriptor-backed staged record");
});

runCase("session_only_result_does_not_require_valid_storage_resolution", () => {
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    continuityValue: "plain chat without explicit write",
    evidenceRef: "turn-session-1"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, {
    storage: {
      kind: "unsupported_remote"
    }
  });

  assert(result.persisted === false, "expected no persistence for session-only");
  assert(result.memoryPersisted === false, "expected no memory persistence for session-only");
  assert(result.settingsPersisted === false, "expected no settings persistence for session-only");
  assert(result.finalLayer === "session", "expected session layer");
  assert(result.reasons.includes("missing_invocation_area"), "expected session fallback reasons");
});

runCase("accepted_write_fails_closed_on_invalid_storage_descriptor", () => {
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "this write should fail on invalid storage",
    evidenceRef: "turn-storage-fail-1"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, {
    storage: {
      kind: "unsupported_remote"
    }
  });

  assert(result.persisted === false, "expected fail-closed persistence result");
  assert(result.memoryPersisted === false, "expected no memory persistence on invalid storage");
  assert(result.reasons.includes("storage_resolution_failed"), "expected storage resolution failure reason");
  assert(result.storage.adapterId === "cmcp.unresolved", "expected unresolved storage descriptor");
});

runCase("persist_tracked_supersedes_matching_staged", () => {
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "host_runtime_actions",
    writeMode: "explicit_write_enabled",
    invocationArea: "explicit_followup_action",
    continuityValue: "follow up on design review",
    evidenceRef: "turn-1",
    explicitTracking: true
  };

  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);
  const staged = storageAdapter.readSection("staged");
  const tracked = storageAdapter.readSection("tracked");

  assert(result.persisted === true, "expected tracked persistence");
  assert(result.memoryPersisted === true, "expected memory persistence facet");
  assert(result.correctionPersisted === false, "expected no correction persistence facet");
  assert(tracked.length === 1, "expected tracked record");
  assert(staged.some((record) => record.status === "superseded"), "expected staged superseded");
});

runCase("persist_setup_settings_and_profile", () => {
  const settingsCandidate = {
    fieldKey: "quiet_hours.start",
    storedValue: "23:00",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    writeMode: "explicit_write_enabled",
    invocationArea: "onboarding_disclosed_profile_capture"
  };
  const settingsDecision = evaluateCmcpWriteCandidate(settingsCandidate);
  const settingsResult = persistCmcpWriteDecision(settingsDecision, settingsCandidate, storageInput);

  const profileCandidate = {
    memoryType: "profile",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    writeMode: "explicit_write_enabled",
    invocationArea: "onboarding_disclosed_profile_capture",
    fieldKey: "timezone",
    storedValue: "UTC+8",
    allowedPersonalizationType: "timezone",
    userOwnership: "explicit",
    surfaceDisclosedMemoryEffect: true,
    evidenceRef: "onboarding-1"
  };
  const profileDecision = evaluateCmcpWriteCandidate(profileCandidate);
  const profileResult = persistCmcpWriteDecision(profileDecision, profileCandidate, storageInput);
  const snapshot = storageAdapter.loadSnapshot();

  assert(settingsResult.persisted === true, "expected settings persistence");
  assert(settingsResult.memoryPersisted === false, "expected no memory persistence for settings-only route");
  assert(settingsResult.settingsPersisted === true, "expected settings persistence facet");
  assert(snapshot.settings.quiet_hours.start === "23:00", "expected quiet hours settings");
  assert(profileResult.persisted === true, "expected profile persistence");
  assert(profileResult.memoryPersisted === true, "expected memory persistence for profile route");
  assert(profileResult.settingsPersisted === false, "expected no settings persistence for profile route");
  assert(snapshot.backgroundProfile.timezone === "UTC+8", "expected background profile timezone");
});

runCase("persist_correction_delete_creates_tombstone_and_removes_anchor", () => {
  const trackedRecord = storageAdapter.readSection("tracked")[0];
  const correctionCandidate = {
    action: "delete",
    target_scope: "single_record",
    target_memory_id: trackedRecord.memory_id,
    redact_content: true,
    sourceSurface: "host_runtime_actions",
    invocationArea: "explicit_memory_correction_action",
    writeMode: "explicit_write_enabled"
  };
  const correctionDecision = evaluateCmcpWriteCandidate({
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "delete",
    target_memory_id: trackedRecord.memory_id,
    target_scope: "single_record",
    sourceSurface: "host_runtime_actions",
    invocationArea: "explicit_memory_correction_action",
    writeMode: "explicit_write_enabled"
  });
  const correctionResult = persistCmcpWriteDecision(correctionDecision, correctionCandidate, storageInput);
  const snapshot = storageAdapter.loadSnapshot();
  const selection = selectCmcpNewAnchor(snapshot);

  assert(correctionResult.persisted === true, "expected correction persistence");
  assert(correctionResult.correctionPersisted === true, "expected correction persistence facet");
  assert(correctionResult.memoryPersisted === true, "expected correction to mutate memory state");
  assert(snapshot.tombstones.length >= 1, "expected tombstone metadata");
  assert(selection.continuity_source !== "tracked", "expected tracked anchor removal");
});

console.log("write-pipeline-smoke-ok");
