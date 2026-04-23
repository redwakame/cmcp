import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createCmcpFileStorageAdapter } from "../src/cmcp-guard/cmcp-file-storage-adapter.js";
import {
  evaluateCmcpWriteCandidate,
  getCmcpWriteCandidateSafetyAssessment
} from "../src/cmcp-guard/evaluate-cmcp-write-candidate.js";
import {
  applyCmcpCorrectionAction
} from "../src/cmcp-guard/apply-cmcp-correction-action.js";
import {
  persistCmcpWriteDecision
} from "../src/cmcp-guard/persist-cmcp-write.js";
import {
  selectCmcpNewAnchor
} from "../src/cmcp-guard/select-cmcp-new-anchor.js";

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

runCase("forbidden_secret_in_continuity_value_fails_closed_and_does_not_persist", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-secret-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "my password is hunter2 and my api key is sk-abcdef123456789",
    evidenceRef: "turn-secret-1"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const persisted = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "session", "expected forbidden text to fail closed");
  assert(decision.reasons.includes("forbidden_category"), "expected forbidden category reason");
  assert(persisted.persisted === false, "expected no persistence");
  assert(storageAdapter.readSection("staged").length === 0, "expected no staged record");
  assert(storageAdapter.readSection("daily_memory").length === 0, "expected no daily memory record");
});

runCase("persist_rechecks_forbidden_text_even_if_caller_passes_accepted_decision", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-persist-secret-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "access token: abcdefghijklmnop1234567890",
    evidenceRef: "turn-secret-2"
  };
  const result = persistCmcpWriteDecision({
    accepted: true,
    persistentWrite: true,
    persistentWriteAuthorized: true,
    finalLayer: "staged",
    targetLayer: "staged",
    decisionStep: "staged_eligibility",
    ownerSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_write",
    routeKey: "manualMemoryWrite",
    route: [],
    checkedSteps: ["staged_eligibility"],
    reasons: ["forced_for_test"]
  }, candidate, storageInput);

  assert(result.persisted === false, "expected persist path to fail closed");
  assert(result.reasons.includes("forbidden_category"), "expected forbidden category reason");
  assert(storageAdapter.readSection("staged").length === 0, "expected no staged write");
});

runCase("oversized_continuity_value_is_rejected", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-size-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "x".repeat(5000),
    evidenceRef: "turn-size-1"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "session", "expected oversized text to fail closed");
  assert(decision.reasons.includes("continuity_value_too_large"), "expected size rejection");
  assert(result.persisted === false, "expected no persistence");
  assert(storageAdapter.readSection("staged").length === 0, "expected no staged write");
});

runCase("expired_staged_record_is_not_selected_as_new_anchor", () => {
  const selection = selectCmcpNewAnchor({
    stagedRecords: [{
      memory_id: "stg-expired-1",
      status: "active",
      updated_at: "2026-04-23T00:00:00.000Z",
      expires_at: "2020-01-01T00:00:00.000Z",
      anchor_turns: [{ role: "user", text: "resume later" }],
      latest_user_owned_clause: "resume later"
    }],
    dailyRecords: [{
      memory_id: "daily-1",
      status: "active",
      updated_at: "2026-04-23T00:00:01.000Z",
      derived_from: "stg-expired-1",
      change_type: "created",
      anchor_turns: [{ role: "user", text: "resume later" }],
      latest_user_owned_clause: "resume later"
    }]
  });

  assert(selection.continuity_source === "none", "expected expired staged record to be ignored");
});

runCase("delete_cascade_removes_prior_daily_derivatives_and_redacts_deletion_writeback", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-delete-");
  const baseCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "secret diary: I have cancer",
    evidenceRef: "turn-delete-1"
  };
  const stagedDecision = evaluateCmcpWriteCandidate(baseCandidate);
  const stagedResult = persistCmcpWriteDecision(stagedDecision, baseCandidate, storageInput);
  const stagedId = stagedResult.createdIds[0];
  const beforeDeleteDaily = storageAdapter.readSection("daily_memory");

  assert(beforeDeleteDaily.some((record) => record.derived_from === stagedId), "expected derived daily record before delete");

  const deleteDecision = evaluateCmcpWriteCandidate({
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "delete",
    target_memory_id: stagedId,
    target_scope: "single_record",
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  });
  const deleteCandidate = {
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "delete",
    target_memory_id: stagedId,
    target_scope: "single_record",
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  };
  const deleteResult = persistCmcpWriteDecision(deleteDecision, deleteCandidate, storageInput);
  const afterDeleteDaily = storageAdapter.readSection("daily_memory");
  const deletionAudit = afterDeleteDaily.find((record) => record.change_type === "deleted");

  assert(deleteResult.persisted === true, "expected delete correction persistence");
  assert(!afterDeleteDaily.some((record) => record.derived_from === stagedId && record.change_type === "created"), "expected prior derived daily record removed");
  assert(Boolean(deletionAudit), "expected deletion audit record");
  assert(!("latest_user_owned_clause" in deletionAudit), "expected deletion audit to omit deleted content");
  assert(!("anchor_turns" in deletionAudit), "expected deletion audit to omit deleted turns");
});

runCase("same_focus_staged_write_supersedes_prior_active_staged", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-staged-dedup-");
  const firstCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "follow up on the same focus",
    evidenceRef: "turn-dedup-1"
  };
  const secondCandidate = {
    ...firstCandidate,
    evidenceRef: "turn-dedup-2"
  };

  persistCmcpWriteDecision(evaluateCmcpWriteCandidate(firstCandidate), firstCandidate, storageInput);
  persistCmcpWriteDecision(evaluateCmcpWriteCandidate(secondCandidate), secondCandidate, storageInput);
  const staged = storageAdapter.readSection("staged");

  assert(staged.filter((record) => record.status === "active").length === 1, "expected one active staged record");
  assert(staged.some((record) => record.status === "superseded"), "expected prior staged record to be superseded");
});

runCase("same_focus_tracked_write_supersedes_prior_active_tracked", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-tracked-dedup-");
  const firstCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "host_runtime_actions",
    writeMode: "explicit_write_enabled",
    invocationArea: "explicit_followup_action",
    continuityValue: "ship the same followup",
    evidenceRef: "turn-track-1",
    explicitTracking: true
  };
  const secondCandidate = {
    ...firstCandidate,
    evidenceRef: "turn-track-2"
  };

  persistCmcpWriteDecision(evaluateCmcpWriteCandidate(firstCandidate), firstCandidate, storageInput);
  persistCmcpWriteDecision(evaluateCmcpWriteCandidate(secondCandidate), secondCandidate, storageInput);
  const tracked = storageAdapter.readSection("tracked");

  assert(tracked.filter((record) => record.status === "active").length === 1, "expected one active tracked record");
  assert(tracked.some((record) => record.status === "superseded"), "expected prior tracked record to be superseded");
});

runCase("invalid_direct_correction_apply_throws_instead_of_silent_failure", () => {
  let threw = false;
  try {
    applyCmcpCorrectionAction([{
      memory_id: "trk-1",
      layer: "tracked",
      status: "active"
    }], {
      action: "delete",
      target_scope: "all",
      sourceSurface: "cmcp_policy",
      invocationArea: "cmcp_policy_manual_edit",
      writeMode: "explicit_write_enabled"
    });
  } catch (error) {
    threw = /Invalid CMCP correction action/.test(String(error?.message ?? error));
  }

  assert(threw, "expected invalid direct apply to throw");
});

runCase("host_supplied_inference_forbidden_category_blocks_persistence", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-inference-");
  const candidate = {
    memoryType: "profile",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "the user sounds depressed lately",
    evidenceRef: "turn-inference-1",
    hostClassifiedForbiddenCategory: "mental_health_diagnosis"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "session", "expected host inference forbidden category to block write");
  assert(decision.reasons.includes("forbidden_category"), "expected forbidden category reason");
  assert(result.persisted === false, "expected no persistence");
  assert(storageAdapter.readSection("staged").length === 0, "expected no staged record");
});

runCase("always_forbidden_detection_overrides_host_inference_forbidden_category", () => {
  const assessment = getCmcpWriteCandidateSafetyAssessment({
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "my password is hunter2",
    hostClassifiedForbiddenCategory: "relationship_guess",
    evidenceRef: "turn-inference-priority-1"
  });

  assert(assessment.reasons.includes("forbidden_category"), "expected forbidden category reason");
  assert(assessment.candidate.forbiddenCategory === "password", "expected always-forbidden category to win");
});

runCase("unknown_host_forbidden_category_fails_closed", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-unknown-host-category-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "ordinary text",
    evidenceRef: "turn-host-invalid-1",
    hostClassifiedForbiddenCategory: "totally_unknown_category"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "session", "expected unknown host category to fail closed");
  assert(decision.reasons.includes("unknown_host_forbidden_category"), "expected invalid host category reason");
  assert(result.persisted === false, "expected no persistence");
  assert(storageAdapter.readSection("staged").length === 0, "expected no staged write");
});

runCase("correction_reason_with_secret_fails_closed_and_does_not_write_tombstone", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-correction-reason-");
  const baseCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "delete target",
    evidenceRef: "turn-reason-1"
  };
  const baseDecision = evaluateCmcpWriteCandidate(baseCandidate);
  const baseResult = persistCmcpWriteDecision(baseDecision, baseCandidate, storageInput);
  const correctionCandidate = {
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "delete",
    target_memory_id: baseResult.createdIds[0],
    target_scope: "single_record",
    reason: "my api key is sk-secretsecret123456",
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  };
  const correctionDecision = evaluateCmcpWriteCandidate(correctionCandidate);
  const correctionResult = persistCmcpWriteDecision(correctionDecision, correctionCandidate, storageInput);

  assert(correctionDecision.finalLayer === "session", "expected forbidden correction reason to fail closed");
  assert(correctionDecision.reasons.includes("forbidden_correction_reason"), "expected forbidden correction reason");
  assert(correctionResult.persisted === false, "expected no correction persistence");
  assert(storageAdapter.readSection("tombstones").length === 0, "expected no tombstone write");
});

runCase("evidence_ref_is_sanitized_before_persistence", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-source-ref-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "sanitized ref write",
    evidenceRef: "turn-\u0000..\u202Eevil"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);
  const staged = storageAdapter.readSection("staged");

  assert(result.persisted === true, "expected valid write to persist");
  assert(staged.length === 1, "expected one staged record");
  assert(staged[0].source_ref === "turn-..evil", "expected unsafe characters to be stripped from source_ref");
});

runCase("zero_width_hidden_password_is_detected", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-zwsp-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "my pass\u200bword is hunter2",
    evidenceRef: "turn-zwsp-1"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "session", "expected zero-width secret to fail closed");
  assert(decision.reasons.includes("forbidden_category"), "expected forbidden category reason");
  assert(result.persisted === false, "expected no persistence");
  assert(storageAdapter.readSection("staged").length === 0, "expected no staged write");
});

runCase("anchor_turns_are_clamped_before_persistence", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-anchor-count-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "anchor clamp test",
    evidenceRef: "turn-anchor-count-1",
    anchorTurns: Array.from({ length: 1000 }, (_, index) => ({ role: "user", text: `turn-${index}` }))
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);
  const staged = storageAdapter.readSection("staged");

  assert(result.persisted === true, "expected staged persistence");
  assert(staged.length === 1, "expected one staged record");
  assert(staged[0].anchor_turns.length === 50, "expected anchor turns to be clamped to 50");
});

runCase("daily_trace_without_known_live_source_fails_closed", () => {
  const selection = selectCmcpNewAnchor({
    dailyRecords: [{
      memory_id: "daily-orphan-1",
      status: "active",
      updated_at: "2026-04-23T00:00:01.000Z",
      derived_from: "missing-source-1",
      change_type: "created",
      latest_user_owned_clause: "should not revive",
      anchor_turns: [{ role: "user", text: "should not revive" }]
    }]
  });

  assert(selection.continuity_source === "none", "expected orphan daily trace to fail closed");
});

runCase("bundled_file_adapter_rejects_invalid_memory_section_shape", () => {
  const { storageAdapter } = createStorageInput("cmcp-adversarial-adapter-shape-");
  let threw = false;

  try {
    storageAdapter.writeSection("tracked", [{
      memory_id: "bad-1",
      status: "active",
      updated_at: "2026-04-23T00:00:00.000Z",
      latest_user_owned_clause: "bad",
      anchor_turns: [{ role: "user", text: "bad" }]
    }]);
  } catch (error) {
    threw = /Invalid CMCP memory record/.test(String(error?.message ?? error));
  }

  assert(threw, "expected bundled file adapter to reject invalid memory records");
});

runCase("non_scalar_stored_value_fails_closed_without_throw", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-stored-value-type-");
  const candidate = {
    memoryType: "profile",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    writeMode: "explicit_write_enabled",
    invocationArea: "onboarding_disclosed_profile_capture",
    surfaceDisclosedMemoryEffect: true,
    userOwnership: "explicit",
    allowedPersonalizationType: "timezone",
    fieldKey: "timezone",
    storedValue: { evil: "object" },
    continuityValue: "UTC+8",
    evidenceRef: "setup-stored-value-1"
  };

  let result = null;
  let threw = false;
  try {
    const decision = evaluateCmcpWriteCandidate(candidate);
    result = persistCmcpWriteDecision(decision, candidate, storageInput);
    assert(decision.finalLayer === "session", "expected invalid storedValue to fail closed");
    assert(decision.reasons.includes("stored_value_must_be_scalar"), "expected scalar type rejection reason");
    assert(result.persisted === false, "expected invalid storedValue not to persist");
  } catch (error) {
    threw = true;
  }

  assert(!threw, "expected invalid storedValue to fail closed without throwing");
  assert(storageAdapter.readSection("long_term_personalization").length === 0, "expected no long-term write");
});

runCase("settings_route_invalid_time_format_fails_closed", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-settings-route-");
  const candidate = {
    memoryType: "profile",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    writeMode: "explicit_write_enabled",
    invocationArea: "onboarding_disclosed_profile_capture",
    surfaceDisclosedMemoryEffect: true,
    fieldKey: "quiet_hours.start",
    storedValue: "NOT A TIME",
    evidenceRef: "setup-settings-1"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "settings", "expected settings routing for known settings field");
  assert(result.persisted === false, "expected invalid settings format to fail closed");
  assert(result.reasons.includes("invalid_settings_time_format"), "expected invalid time format reason");
  assert(storageAdapter.readSection("settings").quiet_hours === undefined, "expected no quiet hours write");
});

runCase("bundled_file_adapter_rejects_unknown_settings_target_and_invalid_type", () => {
  const { storageAdapter } = createStorageInput("cmcp-adversarial-settings-adapter-");
  let unknownTargetThrew = false;
  let invalidTypeThrew = false;

  try {
    storageAdapter.setSettingsValue("mcmcp.totally.fake.field", "value");
  } catch (error) {
    unknownTargetThrew = /unknown_settings_target/.test(String(error?.message ?? error));
  }

  try {
    storageAdapter.setSettingsValue("quiet_hours.start", { nested: "junk" });
  } catch (error) {
    invalidTypeThrew = /invalid_settings_value_type/.test(String(error?.message ?? error));
  }

  assert(unknownTargetThrew, "expected unknown settings target to be rejected");
  assert(invalidTypeThrew, "expected invalid settings type to be rejected");
});

runCase("bundled_file_adapter_rejects_schema_valid_secret_content", () => {
  const { storageAdapter } = createStorageInput("cmcp-adversarial-adapter-secret-");
  let threw = false;

  try {
    storageAdapter.writeSection("tracked", [{
      memory_id: "trk-secret-1",
      layer: "tracked",
      memory_type: "task",
      source_kind: "dialogue",
      source_surface: "host_runtime_actions",
      source_ref: "turn-secret-embedded-1",
      user_ownership: "explicit",
      confidence: 0.95,
      status: "active",
      created_at: "2026-04-24T00:00:00.000Z",
      updated_at: "2026-04-24T00:00:00.000Z",
      owner_surface: "host_runtime_actions",
      invocation_area: "explicit_followup_action",
      route_key: "manualMemoryWrite",
      sensitivity: "ordinary",
      continuity_value: "api key is sk-abcdef1234567890",
      latest_user_owned_clause: "api key is sk-abcdef1234567890",
      resolution_condition: "user_marks_done_or_followup_completed",
      anchor_turns: [{ role: "user", text: "api key is sk-abcdef1234567890" }]
    }]);
  } catch (error) {
    threw = /Invalid CMCP memory record content/.test(String(error?.message ?? error));
  }

  assert(threw, "expected bundled adapter to reject secret content even with valid shape");
  assert(storageAdapter.readSection("tracked").length === 0, "expected no tracked write");
});

runCase("prefixed_secret_in_evidence_ref_is_detected", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-prefixed-secret-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "ordinary text",
    evidenceRef: "apikey_sk-abcdef1234567890_stored_here"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "session", "expected prefixed secret in evidenceRef to fail closed");
  assert(decision.reasons.includes("forbidden_category"), "expected forbidden category reason");
  assert(result.persisted === false, "expected no persistence");
  assert(storageAdapter.readSection("staged").length === 0, "expected no staged write");
});

runCase("resolution_condition_with_secret_is_detected", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-resolution-secret-");
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "host_runtime_actions",
    writeMode: "explicit_write_enabled",
    invocationArea: "explicit_followup_action",
    continuityValue: "ordinary tracked followup",
    evidenceRef: "turn-resolution-secret-1",
    explicitTracking: true,
    resolutionCondition: "resolve when api key is sk-abcdef1234567890"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "session", "expected secret in resolution condition to fail closed");
  assert(decision.reasons.includes("forbidden_category"), "expected forbidden category reason");
  assert(result.persisted === false, "expected no persistence");
  assert(storageAdapter.readSection("tracked").length === 0, "expected no tracked write");
});

runCase("field_key_with_secret_is_detected", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-field-key-secret-");
  const candidate = {
    memoryType: "profile",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    writeMode: "explicit_write_enabled",
    invocationArea: "onboarding_disclosed_profile_capture",
    surfaceDisclosedMemoryEffect: true,
    userOwnership: "explicit",
    allowedPersonalizationType: "preferred_name",
    fieldKey: "apikey_sk-abcdef1234567890",
    storedValue: "Alice",
    continuityValue: "Alice",
    evidenceRef: "setup-field-key-1"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(decision.finalLayer === "session", "expected secret in fieldKey to fail closed");
  assert(decision.reasons.includes("forbidden_category"), "expected forbidden category reason");
  assert(result.persisted === false, "expected no persistence");
  assert(storageAdapter.readSection("long_term_personalization").length === 0, "expected no long-term write");
});

runCase("bundled_file_adapter_rejects_tombstone_secret_reason", () => {
  const { storageAdapter } = createStorageInput("cmcp-adversarial-tombstone-secret-");
  let threw = false;

  try {
    storageAdapter.writeSection("tombstones", [{
      memory_id: "deleted-1",
      deleted_at: "2026-04-24T00:00:00.000Z",
      deleted_by: "user",
      deletion_reason: "api key is sk-abcdef1234567890"
    }]);
  } catch (error) {
    threw = /forbidden_deletion_reason/.test(String(error?.message ?? error));
  }

  assert(threw, "expected direct tombstone write with secret reason to be rejected");
  assert(storageAdapter.readSection("tombstones").length === 0, "expected no tombstone write");
});

runCase("replace_requires_live_replacement_record", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-replace-live-");
  const baseCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "host_runtime_actions",
    writeMode: "explicit_write_enabled",
    invocationArea: "explicit_followup_action",
    continuityValue: "replace target",
    evidenceRef: "turn-replace-live-1",
    explicitTracking: true
  };
  const baseDecision = evaluateCmcpWriteCandidate(baseCandidate);
  const baseResult = persistCmcpWriteDecision(baseDecision, baseCandidate, storageInput);
  const replaceCandidate = {
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "replace",
    target_memory_id: baseResult.createdIds[0],
    replacement_memory_id: "ghost-replacement-id",
    target_scope: "single_record",
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  };
  const replaceDecision = evaluateCmcpWriteCandidate(replaceCandidate);
  const replaceResult = persistCmcpWriteDecision(replaceDecision, replaceCandidate, storageInput);
  const tracked = storageAdapter.readSection("tracked");

  assert(replaceDecision.finalLayer === "user_correction", "expected replace to remain a correction decision");
  assert(replaceResult.persisted === false, "expected missing replacement record to fail closed");
  assert(replaceResult.reasons.includes("replacement_memory_id_not_found"), "expected replacement lookup failure reason");
  assert(tracked[0].status === "active", "expected original tracked record to remain active");
  assert(!tracked[0].superseded_by, "expected no dangling replacement pointer");
});

runCase("delete_cleans_daily_derivatives_even_when_apply_to_layers_excludes_daily", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-delete-cascade-");
  const baseCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "sensitive content xyz123",
    evidenceRef: "turn-delete-cascade-1"
  };
  const baseDecision = evaluateCmcpWriteCandidate(baseCandidate);
  const baseResult = persistCmcpWriteDecision(baseDecision, baseCandidate, storageInput);
  const targetId = baseResult.createdIds[0];
  const deleteCandidate = {
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "delete",
    target_memory_id: targetId,
    target_scope: "single_record",
    apply_to_layers: ["staged"],
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  };
  const deleteDecision = evaluateCmcpWriteCandidate(deleteCandidate);
  const deleteResult = persistCmcpWriteDecision(deleteDecision, deleteCandidate, storageInput);
  const daily = storageAdapter.readSection("daily_memory");

  assert(deleteResult.persisted === true, "expected delete correction persistence");
  assert(!daily.some((record) => record.derived_from === targetId && record.change_type === "created"), "expected prior derived daily trace removed");
  assert(daily.some((record) => record.derived_from === targetId && record.change_type === "deleted"), "expected redacted deletion audit record");
});

runCase("invalid_apply_to_layers_fails_closed", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-invalid-layers-");
  const candidate = {
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "delete",
    target_memory_id: "nonexistent-id",
    target_scope: "single_record",
    apply_to_layers: ["../../../evil", "nonexistent", "fake"],
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const result = persistCmcpWriteDecision(decision, candidate, storageInput);

  assert(result.persisted === false, "expected invalid target layers to fail closed");
  assert(result.reasons.includes("no_valid_target_layers"), "expected invalid layer reason");
  assert(storageAdapter.readSection("tombstones").length === 0, "expected no tombstone side effects");
});

runCase("phantom_single_record_corrections_fail_closed", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-phantom-correction-");
  const replacementCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "host_runtime_actions",
    writeMode: "explicit_write_enabled",
    invocationArea: "explicit_followup_action",
    continuityValue: "live replacement",
    evidenceRef: "turn-phantom-live-1",
    explicitTracking: true
  };
  const replacementResult = persistCmcpWriteDecision(
    evaluateCmcpWriteCandidate(replacementCandidate),
    replacementCandidate,
    storageInput
  );

  for (const correctionAction of ["resolve", "suppress", "replace"]) {
    const candidate = {
      memoryType: "correction",
      sourceKind: "user_correction",
      correctionAction,
      target_memory_id: "nonexistent-id",
      target_scope: "single_record",
      replacement_memory_id: correctionAction === "replace" ? replacementResult.createdIds[0] : undefined,
      sourceSurface: "cmcp_policy",
      invocationArea: "cmcp_policy_manual_edit",
      writeMode: "explicit_write_enabled"
    };
    const decision = evaluateCmcpWriteCandidate(candidate);
    const result = persistCmcpWriteDecision(decision, candidate, storageInput);

    assert(result.persisted === false, `expected ${correctionAction} to fail closed for missing target`);
    assert(result.reasons.includes("target_not_found"), `expected target_not_found for ${correctionAction}`);
  }

  assert(storageAdapter.readSection("tombstones").length === 0, "expected no tombstone side effects for phantom corrections");
});

runCase("double_delete_is_idempotent", () => {
  const { storageAdapter, storageInput } = createStorageInput("cmcp-adversarial-double-delete-");
  const baseCandidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "delete me once",
    evidenceRef: "turn-double-delete-1"
  };
  const baseResult = persistCmcpWriteDecision(
    evaluateCmcpWriteCandidate(baseCandidate),
    baseCandidate,
    storageInput
  );
  const deleteCandidate = {
    memoryType: "correction",
    sourceKind: "user_correction",
    correctionAction: "delete",
    target_memory_id: baseResult.createdIds[0],
    target_scope: "single_record",
    sourceSurface: "cmcp_policy",
    invocationArea: "cmcp_policy_manual_edit",
    writeMode: "explicit_write_enabled"
  };
  const firstResult = persistCmcpWriteDecision(
    evaluateCmcpWriteCandidate(deleteCandidate),
    deleteCandidate,
    storageInput
  );
  const tombstoneCountAfterFirstDelete = storageAdapter.readSection("tombstones").length;
  const secondResult = persistCmcpWriteDecision(
    evaluateCmcpWriteCandidate(deleteCandidate),
    deleteCandidate,
    storageInput
  );

  assert(firstResult.persisted === true, "expected first delete to persist");
  assert(secondResult.persisted === false, "expected second delete to fail closed as already deleted");
  assert(secondResult.reasons.includes("target_already_deleted"), "expected already deleted reason");
  assert(storageAdapter.readSection("tombstones").length === tombstoneCountAfterFirstDelete, "expected no extra tombstones on repeated delete");
});

runCase("unicode_and_dotted_password_variants_are_detected", () => {
  for (const continuityValue of [
    "my ｐａｓｓｗｏｒｄ is hunter2",
    "my p.a.s.s.w.o.r.d is hunter2"
  ]) {
    const assessment = getCmcpWriteCandidateSafetyAssessment({
      memoryType: "task",
      sourceKind: "dialogue",
      sourceSurface: "cmcp_policy",
      writeMode: "explicit_write_enabled",
      invocationArea: "cmcp_policy_manual_write",
      continuityValue,
      evidenceRef: "turn-unicode-password-1"
    });

    assert(assessment.reasons.includes("forbidden_category"), "expected normalized password variant to be detected");
    assert(assessment.candidate.forbiddenCategory === "password", "expected password category");
  }
});

runCase("host_supplied_new_session_arrays_are_sanitized_and_secret_filtered", () => {
  const selection = selectCmcpNewAnchor({
    trackedRecords: [{
      memory_id: "trk-host-secret-1",
      status: "active",
      updated_at: "2026-04-24T00:00:00.000Z",
      latest_user_owned_clause: "my password is hunter2",
      anchor_turns: [{ role: "user", text: "my password is hunter2" }]
    }],
    stagedRecords: [{
      memory_id: "stg-host-safe-1",
      status: "active",
      updated_at: "2026-04-24T00:00:01.000Z",
      latest_user_owned_clause: "resume safe task",
      continuity_value: "resume safe task",
      expires_at: "2099-01-01T00:00:00.000Z",
      anchor_turns: [{ role: "user", text: "resume safe task" }]
    }],
    backgroundProfile: {
      timezone: "UTC+8",
      relationship: "api key is sk-abcdef1234567890"
    }
  });

  assert(selection.continuity_source === "staged", "expected forbidden tracked host array record to be dropped");
  assert(selection.latest_user_owned_clause === "resume safe task", "expected safe staged fallback");
  assert(selection.background_profile.timezone === "UTC+8", "expected safe background profile value");
  assert(!("relationship" in selection.background_profile), "expected forbidden background profile value to be dropped");
});

console.log("adversarial-smoke-ok");
