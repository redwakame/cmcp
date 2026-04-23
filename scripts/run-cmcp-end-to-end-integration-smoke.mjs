import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createCmcpFileStorageAdapter } from "../src/cmcp-guard/cmcp-file-storage-adapter.js";
import { evaluateCmcpWriteCandidate } from "../src/cmcp-guard/evaluate-cmcp-write-candidate.js";
import { persistCmcpWriteDecision } from "../src/cmcp-guard/persist-cmcp-write.js";
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

function createStorageInput(prefix) {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const storageAdapter = createCmcpFileStorageAdapter({ stateRoot });
  return {
    stateRoot,
    storageAdapter,
    storageInput: { storageAdapter }
  };
}

runCase("same_candidate_object_delete_flows_from_evaluate_to_persist", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-e2e-delete-");
  const writeCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "end to end delete target",
    evidenceRef: "turn-e2e-1"
  };
  const writeDecision = evaluateCmcpWriteCandidate(writeCandidate);
  const writeResult = persistCmcpWriteDecision(writeDecision, writeCandidate, storageInput);
  const targetId = writeResult.createdIds[0];

  const correctionCandidate = {
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "delete",
    target_memory_id: targetId,
    target_scope: "single_record",
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  };
  const correctionDecision = evaluateCmcpWriteCandidate(correctionCandidate);
  const correctionResult = persistCmcpWriteDecision(correctionDecision, correctionCandidate, storageInput);
  const snapshot = storageAdapter.loadSnapshot();
  const selection = selectCmcpNewAnchor(snapshot);

  assert(correctionResult.persisted === true, "expected same-object correction to persist");
  assert(snapshot.tombstones.some((record) => record.memory_id === targetId), "expected tombstone for deleted record");
  assert(selection.continuity_source === "none", "expected deleted record to disappear from /new");
});

runCase("expired_staged_writeback_does_not_reappear_through_daily_memory", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-e2e-expiry-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "expire me later",
    evidenceRef: "turn-e2e-2"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);
  const stagedId = result.createdIds[0];
  const staged = storageAdapter.readSection("staged").map((record) => (
    record.memory_id === stagedId
      ? { ...record, expires_at: "2020-01-01T00:00:00.000Z" }
      : record
  ));

  storageAdapter.writeSection("staged", staged);
  const snapshot = storageAdapter.loadSnapshot();
  const selection = selectCmcpNewAnchor(snapshot);

  assert(selection.continuity_source === "none", "expected expired staged source not to reappear through daily memory");
});

runCase("deleted_source_daily_writeback_does_not_reappear_without_live_source", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-e2e-delete-daily-");
  const writeCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "delete me and do not revive through daily",
    evidenceRef: "turn-e2e-4"
  };
  const writeDecision = evaluateCmcpWriteCandidate(writeCandidate);
  const writeResult = persistCmcpWriteDecision(writeDecision, writeCandidate, storageInput);
  const targetId = writeResult.createdIds[0];

  const correctionCandidate = {
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "delete",
    target_memory_id: targetId,
    target_scope: "single_record",
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  };
  const correctionDecision = evaluateCmcpWriteCandidate(correctionCandidate);
  persistCmcpWriteDecision(correctionDecision, correctionCandidate, storageInput);
  const snapshot = storageAdapter.loadSnapshot();
  const selection = selectCmcpNewAnchor(snapshot);

  assert(selection.continuity_source === "none", "expected deleted source not to revive through daily trace");
});

runCase("natural_language_secret_is_blocked_end_to_end", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-e2e-secret-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "my password is hunter2 and my api key is sk-abcdef123456789",
    evidenceRef: "turn-e2e-3"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "session", "expected natural language secret to be blocked");
  assert(decision.reasons.includes("forbidden_category"), "expected forbidden category reason");
  assert(result.persisted === false, "expected no persistence");
  assert(storageAdapter.readSection("staged").length === 0, "expected no staged write");
});

runCase("category_opt_out_persists_suppression_and_blocks_future_matching_writes", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-e2e-opt-out-");
  const firstCandidate = {
    memoryType: "profile",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    writeMode: "explicit_write_enabled",
    invocationArea: "onboarding_disclosed_profile_capture",
    surfaceDisclosedMemoryEffect: true,
    userOwnership: "explicit",
    allowedPersonalizationType: "timezone",
    fieldKey: "timezone",
    storedValue: "UTC+8",
    continuityValue: "UTC+8",
    evidenceRef: "setup-opt-out-1"
  };
  const firstDecision = evaluateCmcpWriteCandidate(firstCandidate);
  const firstResult = persistCmcpWriteDecision(firstDecision, firstCandidate, storageInput);
  const targetId = firstResult.createdIds[0];

  const optOutCandidate = {
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "opt_out",
    target_scope: "category",
    reason: "timezone",
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  };
  const optOutDecision = evaluateCmcpWriteCandidate(optOutCandidate);
  const optOutResult = persistCmcpWriteDecision(optOutDecision, optOutCandidate, storageInput);
  const secondCandidate = {
    ...firstCandidate,
    storedValue: "UTC+9",
    continuityValue: "UTC+9",
    evidenceRef: "setup-opt-out-2"
  };
  const secondDecision = evaluateCmcpWriteCandidate(secondCandidate);
  const secondResult = persistCmcpWriteDecision(secondDecision, secondCandidate, storageInput);
  const snapshot = storageAdapter.loadSnapshot();
  const cancelledRecord = snapshot.longTermRecords.find((record) => record.memory_id === targetId);

  assert(optOutResult.persisted === true, "expected opt-out correction to persist");
  assert(snapshot.settings.memory_policy.opt_out_categories.timezone === true, "expected category suppression rule");
  assert(cancelledRecord?.status === "cancelled", "expected existing matching record to be cancelled");
  assert(snapshot.tombstones.length === 0, "expected opt-out not to create tombstones for category suppression");
  assert(secondDecision.accepted === true, "expected write candidate to remain structurally valid");
  assert(secondResult.persisted === false, "expected future matching write to be blocked by suppression");
  assert(secondResult.reasons.includes("category_opted_out"), "expected category opt-out rejection reason");
});

runCase("corrupted_snapshot_section_fails_closed_without_hiding_other_sections", () => {
  const { stateRoot, storageAdapter, storageInput } = createStorageInput("cmcp-e2e-corrupt-snapshot-");
  const profileCandidate = {
    memoryType: "profile",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    writeMode: "explicit_write_enabled",
    invocationArea: "onboarding_disclosed_profile_capture",
    surfaceDisclosedMemoryEffect: true,
    userOwnership: "explicit",
    allowedPersonalizationType: "preferred_name",
    fieldKey: "preferred_name",
    storedValue: "Alice",
    continuityValue: "Alice",
    evidenceRef: "setup-corrupt-1"
  };
  const profileDecision = evaluateCmcpWriteCandidate(profileCandidate);
  persistCmcpWriteDecision(profileDecision, profileCandidate, storageInput);
  fs.writeFileSync(path.join(stateRoot, "tracked.json"), "not-json");

  const snapshot = storageAdapter.loadSnapshot();

  assert(Array.isArray(snapshot.trackedRecords) && snapshot.trackedRecords.length === 0, "expected corrupt tracked section to fail closed to empty");
  assert(Array.isArray(snapshot.longTermRecords) && snapshot.longTermRecords.length === 1, "expected healthy sections to remain readable");
  assert(snapshot.backgroundProfile.preferred_name === "Alice", "expected background profile to survive healthy long-term section");
});

console.log("end-to-end-integration-smoke-ok");
