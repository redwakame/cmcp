import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createCmcpFileStorageAdapter } from "../src/cmcp-guard/cmcp-file-storage-adapter.js";
import { evaluateCmcpWriteCandidate } from "../src/cmcp-guard/evaluate-cmcp-write-candidate.js";
import { persistCmcpWriteDecision } from "../src/cmcp-guard/persist-cmcp-write.js";
import { selectCmcpNewAnchor } from "../src/cmcp-guard/select-cmcp-new-anchor.js";
import { tryResolveCmcpStorageAdapter } from "../src/cmcp-guard/cmcp-storage-adapter.js";
import {
  validateCmcpContinuityContext,
  validateCmcpPersistenceResult,
  validateCmcpStorageAdapterDescriptor,
  validateCmcpWriteDecision
} from "../src/cmcp-guard/validate-cmcp-runtime-shapes.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runCase(name, fn) {
  fn();
  console.log(`ok ${name}`);
}

runCase("write_decision_shape_is_runtime_valid", () => {
  const decision = evaluateCmcpWriteCandidate({
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "schema validation candidate",
    evidenceRef: "turn-schema-1"
  });
  const result = validateCmcpWriteDecision(decision);

  assert(result.valid === true, "expected valid write decision");
});

runCase("continuity_context_sanitizes_background_profile_to_schema", () => {
  const context = selectCmcpNewAnchor({
    trackedRecords: [
      {
        memory_id: "trk-schema-1",
        status: "active",
        updated_at: "2026-04-23T22:35:00+08:00",
        latest_user_owned_clause: "resume schema review",
        anchor_turns: [{ role: "user", text: "resume schema review" }]
      }
    ],
    stagedRecords: [],
    dailyRecords: [],
    backgroundProfile: {
      timezone: "UTC+8",
      preferred_name: "Bin",
      internal_secret: "should_be_dropped"
    }
  });
  const result = validateCmcpContinuityContext(context);

  assert(result.valid === true, "expected valid continuity context");
  assert(!("internal_secret" in context.background_profile), "expected unsupported background key to be dropped");
});

runCase("resolved_invalid_storage_descriptor_is_schema_valid", () => {
  const resolution = tryResolveCmcpStorageAdapter({
    storage: {
      kind: "unsupported_remote"
    }
  });
  const result = validateCmcpStorageAdapterDescriptor(resolution.storage);

  assert(resolution.ok === false, "expected unresolved storage");
  assert(result.valid === true, "expected unresolved descriptor to still satisfy schema");
});

runCase("persistence_result_shape_is_runtime_valid", () => {
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmcp-schema-smoke-"));
  const storageAdapter = createCmcpFileStorageAdapter({ stateRoot });
  const candidate = {
    memoryType: "task",
    sourceKind: "dialogue",
    sourceSurface: "cmcp_policy",
    writeMode: "explicit_write_enabled",
    invocationArea: "cmcp_policy_manual_write",
    continuityValue: "persist me for schema validation",
    evidenceRef: "turn-schema-2"
  };
  const decision = evaluateCmcpWriteCandidate(candidate);
  const persistence = persistCmcpWriteDecision(decision, candidate, { storageAdapter });
  const result = validateCmcpPersistenceResult(persistence);

  assert(result.valid === true, "expected valid persistence result");
  assert(persistence.memoryPersisted === true, "expected memoryPersisted for staged write");
  assert(persistence.settingsPersisted === false, "expected no settings persistence for staged write");
  assert(persistence.correctionPersisted === false, "expected no correction persistence for staged write");
  assert(persistence.persistenceKinds.includes("memory"), "expected memory persistence kind");
});

runCase("invalid_write_decision_is_rejected_by_runtime_validator", () => {
  const result = validateCmcpWriteDecision({
    accepted: true,
    finalLayer: "tracked"
  });

  assert(result.valid === false, "expected invalid decision shape");
  assert(result.errors.length > 0, "expected validation errors");
});

console.log("runtime-schema-smoke-ok");
