import {
  evaluateCmcpWriteCandidate
} from "../src/cmcp-guard/evaluate-cmcp-write-candidate.js";
import {
  applyCmcpCorrectionAction,
  canApplyCmcpCorrectionAction
} from "../src/cmcp-guard/apply-cmcp-correction-action.js";
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

runCase("plain_chat_without_invocation_area_fails_closed", () => {
  const decision = evaluateCmcpWriteCandidate({
    memoryType: "task",
    sourceKind: "dialogue",
    continuityValue: "maybe remind me later",
    evidenceRef: "turn-1"
  });

  assert(decision.finalLayer === "session", "expected session fallback");
  assert(decision.accepted === false, "expected no persistent write");
  assert(decision.reasons.includes("missing_invocation_area"), "expected missing invocation area reason");
});

runCase("cmcp_policy_manual_write_can_stage_authorized_memory", () => {
  const decision = evaluateCmcpWriteCandidate({
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "save this open loop for later review",
    evidenceRef: "turn-2"
  });

  assert(decision.finalLayer === "staged", "expected staged write");
  assert(decision.ownerSurface === "cmcp_policy", "expected cmcp_policy owner surface");
});

runCase("explicit_followup_request_promotes_to_tracked", () => {
  const decision = evaluateCmcpWriteCandidate({
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "host_runtime_actions",
    writeMode: "explicit_write_enabled",
    invocationArea: "explicit_followup_action",
    continuityValue: "resume rollback tomorrow",
    evidenceRef: "turn-3",
    explicitTracking: true
  });

  assert(decision.finalLayer === "tracked", "expected tracked write");
  assert(decision.routeKey === "manualMemoryWrite", "expected manual memory write route");
});

runCase("disclosed_onboarding_schedule_routes_settings_and_profile", () => {
  const settingsDecision = evaluateCmcpWriteCandidate({
    fieldKey: "quiet_hours.start",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    writeMode: "explicit_write_enabled",
    invocationArea: "onboarding_disclosed_profile_capture"
  });

  const profileDecision = evaluateCmcpWriteCandidate({
    memoryType: "profile",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    writeMode: "explicit_write_enabled",
    invocationArea: "onboarding_disclosed_profile_capture",
    allowedPersonalizationType: "timezone",
    userOwnership: "explicit",
    surfaceDisclosedMemoryEffect: true,
    evidenceRef: "onboarding-1"
  });

  assert(settingsDecision.finalLayer === "settings", "expected settings routing");
  assert(profileDecision.finalLayer === "long_term_personalization", "expected profile write");
});

runCase("onboarding_current_event_stays_session_only", () => {
  const decision = evaluateCmcpWriteCandidate({
    memoryType: "event",
    sourceKind: "onboarding",
    sourceSurface: "cmcp_setup",
    continuityValue: "current unfinished task",
    evidenceRef: "onboarding-2"
  });

  assert(decision.finalLayer === "session", "expected session only");
  assert(decision.accepted === false, "expected no persistent write");
});

runCase("user_delete_removes_future_anchor", () => {
  const correctionDecision = canApplyCmcpCorrectionAction({
    action: "delete",
    target_scope: "single_record",
    target_memory_id: "trk-1",
    redact_content: true,
    invocationArea: "explicit_memory_correction_action",
    writeMode: "explicit_write_enabled"
  });

  const recordsAfterDelete = applyCmcpCorrectionAction([
    {
      memory_id: "trk-1",
      status: "active",
      updated_at: "2026-04-23T10:00:00+08:00",
      anchor_turns: [{ role: "user", text: "send the file tomorrow" }],
      latest_user_owned_clause: "send the file tomorrow"
    }
  ], {
    action: "delete",
    target_scope: "single_record",
    target_memory_id: "trk-1",
    redact_content: true,
    invocationArea: "explicit_memory_correction_action",
    writeMode: "explicit_write_enabled"
  });

  const selection = selectCmcpNewAnchor({
    trackedRecords: recordsAfterDelete,
    stagedRecords: [],
    dailyRecords: [],
    backgroundProfile: {}
  });

  assert(correctionDecision.accepted === true, "expected correction action to be accepted");
  assert(selection.continuity_source === "none", "expected deleted anchor to disappear from /new");
});

runCase("policy_manual_write_requires_personalization_disclosure", () => {
  const decision = evaluateCmcpWriteCandidate({
    memoryType: "profile",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    allowedPersonalizationType: "timezone",
    userOwnership: "explicit",
    surfaceDisclosedMemoryEffect: false,
    evidenceRef: "turn-4"
  });

  assert(decision.finalLayer === "session", "expected session fallback");
  assert(decision.reasons.includes("surface_disclosed_memory_effect_required"), "expected disclosure reason");
});

runCase("forbidden_secret_never_persists", () => {
  const decision = evaluateCmcpWriteCandidate({
    memoryType: "event",
    sourceKind: "dialogue",
    forbiddenCategory: "api_key"
  });

  assert(decision.finalLayer === "session", "expected session fallback");
  assert(decision.reasons.includes("forbidden_category"), "expected forbidden category reason");
});

console.log("acceptance-harness-ok");
