import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import handler from "../hooks/cmcp-guard/handler.js";
import { createCmcpFileStorageAdapter } from "../src/cmcp-guard/cmcp-file-storage-adapter.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const MATRIX_ROOT = path.join(PROJECT_ROOT, "runtime-data", "integration-matrix");
const REPORT_PATH = path.join(MATRIX_ROOT, "integration-matrix-report.json");
const LOG_PATH = path.join(MATRIX_ROOT, "integration-matrix-log.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureCleanMatrixRoot() {
  fs.rmSync(MATRIX_ROOT, { recursive: true, force: true });
  fs.mkdirSync(MATRIX_ROOT, { recursive: true });
}

function captureLogsDuring(fn) {
  const entries = [];
  const originalLog = console.log;

  console.log = (message) => {
    entries.push(String(message));
  };

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      console.log = originalLog;
    })
    .then(() => entries);
}

function findLastPayload(entries, label) {
  const prefix = `[cmcp-guard] ${label} `;
  const matches = entries.filter((entry) => entry.startsWith(prefix));
  if (matches.length === 0) {
    return null;
  }
  return JSON.parse(matches[matches.length - 1].slice(prefix.length));
}

function toProjectRelative(filePath) {
  if (typeof filePath !== "string" || !filePath) {
    return filePath;
  }
  return path.relative(PROJECT_ROOT, filePath) || ".";
}

function sanitizeForExport(value) {
  if (typeof value === "string") {
    return value.split(PROJECT_ROOT).join("<project-root>");
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForExport(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeForExport(entry)])
    );
  }

  return value;
}

async function emit(event) {
  const logs = await captureLogsDuring(async () => {
    await handler(event);
  });

  return {
    logs,
    candidateEvaluated: findLastPayload(logs, "candidate-evaluated"),
    candidatePersisted: findLastPayload(logs, "candidate-persisted"),
    correctionEvaluated: findLastPayload(logs, "correction-action-evaluated"),
    correctionPersisted: findLastPayload(logs, "correction-action-persisted"),
    newSelection: findLastPayload(logs, "new-session-selection"),
    storageFailure: findLastPayload(logs, "new-session-storage-resolution-failed")
  };
}

function buildStorageContext(wireMode, scenarioDir) {
  const stateRoot = path.join(scenarioDir, "state");

  if (wireMode === "storageAdapter") {
    const storageAdapter = createCmcpFileStorageAdapter({ stateRoot });
    return {
      payloadStorage: { storageAdapter },
      snapshotReader: storageAdapter,
      descriptor: sanitizeForExport(storageAdapter.describe())
    };
  }

  if (wireMode === "storageDescriptor") {
    return {
      payloadStorage: {
        storage: {
          kind: "file",
          stateRoot
        }
      },
      snapshotReader: createCmcpFileStorageAdapter({ stateRoot }),
      descriptor: sanitizeForExport({
        adapterId: "cmcp.file",
        adapterKind: "file",
        stateRoot
      })
    };
  }

  if (wireMode === "hostArraysOnly") {
    return {
      payloadStorage: {
        storage: {
          kind: "unsupported_remote"
        }
      },
      snapshotReader: null,
      descriptor: {
        adapterId: "cmcp.unresolved",
        adapterKind: "unsupported_remote",
        stateRoot: null
      }
    };
  }

  throw new Error(`Unsupported wireMode: ${wireMode}`);
}

function sanitizeEventForReport(event, storageDescriptor) {
  const payload = event?.payload ?? {};
  const policyCandidate = payload.policyCandidate
    ? {
        memoryType: payload.policyCandidate.memoryType ?? null,
        sourceKind: payload.policyCandidate.sourceKind ?? null,
        sourceSurface: payload.policyCandidate.sourceSurface ?? null,
        invocationArea: payload.policyCandidate.invocationArea ?? null,
        writeMode: payload.policyCandidate.writeMode ?? null,
        evidenceRef: payload.policyCandidate.evidenceRef ?? null
      }
    : null;

  return {
    type: event.type,
    action: event.action ?? null,
    persist: payload.persist === true,
    readFromState: payload.readFromState === true,
    storage: storageDescriptor,
    hostArrayCounts: {
      trackedRecords: Array.isArray(payload.trackedRecords) ? payload.trackedRecords.length : 0,
      stagedRecords: Array.isArray(payload.stagedRecords) ? payload.stagedRecords.length : 0,
      dailyRecords: Array.isArray(payload.dailyRecords) ? payload.dailyRecords.length : 0
    },
    policyCandidate
  };
}

function summarizeStep(result) {
  return sanitizeForExport({
    candidateEvaluated: result.candidateEvaluated?.decision ?? null,
    candidatePersisted: result.candidatePersisted?.persistence ?? null,
    correctionEvaluated: result.correctionEvaluated?.decision ?? null,
    correctionPersisted: result.correctionPersisted?.persistence ?? null,
    newSelection: result.newSelection ?? null,
    storageFailure: result.storageFailure ?? null
  });
}

function buildScenarioReport(scenario, storageContext, executedSteps, snapshot) {
  return {
    id: scenario.id,
    hostId: scenario.hostId,
    hostVersion: scenario.hostVersion,
    modality: scenario.modality,
    wireMode: scenario.wireMode,
    sampleReason: scenario.sampleReason,
    storage: storageContext.descriptor,
    steps: executedSteps.map((step) => ({
      stepId: step.stepId,
      description: step.description,
      normalizedEvent: step.normalizedEvent,
      result: summarizeStep(step.result)
    })),
    snapshotSummary: snapshot ? sanitizeForExport({
      counts: {
        tracked: snapshot.trackedRecords.length,
        staged: snapshot.stagedRecords.length,
        daily: snapshot.dailyRecords.length,
        longTerm: snapshot.longTermRecords.length,
        tombstones: snapshot.tombstones.length
      },
      backgroundProfile: snapshot.backgroundProfile
    }) : null
  };
}

function createScenarios() {
  return [
    {
      id: "desktop_text_followup_v1",
      hostId: "desktop_chat_host",
      hostVersion: "1.0",
      modality: "text",
      wireMode: "storageAdapter",
      sampleReason: "baseline text host with direct storage adapter wiring",
      buildSteps(storageContext) {
        return [
          {
            stepId: "persist-followup",
            description: "Desktop host follow-up button maps to tracked write",
            event: {
              type: "message:received",
              payload: {
                persist: true,
                ...storageContext.payloadStorage,
                policyCandidate: {
                  memoryType: "task",
                  sourceKind: "dialogue",
                  sourceSurface: "host_runtime_actions",
                  writeMode: "explicit_write_enabled",
                  invocationArea: "explicit_followup_action",
                  continuityValue: "desktop host follow-up: resend the CMCP package tomorrow",
                  latestUserOwnedClause: "desktop host follow-up: resend the CMCP package tomorrow",
                  evidenceRef: "desktop-v1-turn-1",
                  explicitTracking: true
                }
              }
            }
          }
        ];
      },
      assertScenario(executedSteps, snapshot) {
        const persisted = executedSteps[0].result.candidatePersisted?.persistence;
        assert(persisted?.persisted === true, "desktop_text_followup_v1: expected persistence");
        assert(persisted?.finalLayer === "tracked", "desktop_text_followup_v1: expected tracked layer");
        assert(snapshot?.trackedRecords.length === 1, "desktop_text_followup_v1: expected tracked record");
      }
    },
    {
      id: "voice_transcript_save_v1_1",
      hostId: "voice_note_host",
      hostVersion: "1.1",
      modality: "voice_transcript",
      wireMode: "storageDescriptor",
      sampleReason: "audio transcript host using storage descriptor instead of direct adapter object",
      buildSteps(storageContext) {
        return [
          {
            stepId: "persist-voice-memory",
            description: "Voice transcript save action maps to staged write",
            event: {
              type: "message:received",
              payload: {
                persist: true,
                ...storageContext.payloadStorage,
                policyCandidate: {
                  memoryType: "task",
                  sourceKind: "dialogue",
                  sourceSurface: "host_runtime_actions",
                  writeMode: "explicit_write_enabled",
                  invocationArea: "explicit_memory_save_action",
                  continuityValue: "voice transcript: save the unresolved budget note for later",
                  latestUserOwnedClause: "voice transcript: save the unresolved budget note for later",
                  evidenceRef: "voice-clip-101"
                }
              }
            }
          }
        ];
      },
      assertScenario(executedSteps, snapshot) {
        const persisted = executedSteps[0].result.candidatePersisted?.persistence;
        assert(persisted?.persisted === true, "voice_transcript_save_v1_1: expected persistence");
        assert(persisted?.finalLayer === "staged", "voice_transcript_save_v1_1: expected staged layer");
        assert(snapshot?.stagedRecords.length === 1, "voice_transcript_save_v1_1: expected staged record");
      }
    },
    {
      id: "image_caption_followup_v2",
      hostId: "image_review_host",
      hostVersion: "2.0",
      modality: "image_caption",
      wireMode: "storageAdapter",
      sampleReason: "image review host routes caption-derived follow-up through explicit tracking action",
      buildSteps(storageContext) {
        return [
          {
            stepId: "persist-image-followup",
            description: "Image caption plus explicit follow-up becomes tracked",
            event: {
              type: "message:received",
              payload: {
                persist: true,
                ...storageContext.payloadStorage,
                policyCandidate: {
                  memoryType: "task",
                  sourceKind: "dialogue",
                  sourceSurface: "host_runtime_actions",
                  writeMode: "explicit_write_enabled",
                  invocationArea: "explicit_followup_action",
                  continuityValue: "image review: revisit the packaging mockup after legal review",
                  latestUserOwnedClause: "image review: revisit the packaging mockup after legal review",
                  evidenceRef: "image-review-22",
                  explicitTracking: true
                }
              }
            }
          }
        ];
      },
      assertScenario(executedSteps, snapshot) {
        const persisted = executedSteps[0].result.candidatePersisted?.persistence;
        assert(persisted?.finalLayer === "tracked", "image_caption_followup_v2: expected tracked layer");
        assert(snapshot?.trackedRecords.length === 1, "image_caption_followup_v2: expected tracked record");
      }
    },
    {
      id: "setup_form_timezone_v1",
      hostId: "setup_wizard_host",
      hostVersion: "1.0",
      modality: "form_profile",
      wireMode: "storageDescriptor",
      sampleReason: "installer/onboarding surface storing disclosed profile data then reading it back during /new",
      buildSteps(storageContext) {
        return [
          {
            stepId: "persist-timezone",
            description: "Setup wizard writes disclosed timezone into long-term personalization",
            event: {
              type: "message:received",
              payload: {
                persist: true,
                ...storageContext.payloadStorage,
                policyCandidate: {
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
                  evidenceRef: "setup-timezone-1"
                }
              }
            }
          },
          {
            stepId: "preview-new",
            description: "Setup host asks /new to assemble continuity from stored snapshot",
            event: {
              type: "command",
              action: "new",
              payload: {
                readFromState: true,
                ...storageContext.payloadStorage
              }
            }
          }
        ];
      },
      assertScenario(executedSteps, snapshot) {
        const persisted = executedSteps[0].result.candidatePersisted?.persistence;
        const selection = executedSteps[1].result.newSelection;
        assert(persisted?.finalLayer === "long_term_personalization", "setup_form_timezone_v1: expected long-term layer");
        assert(selection?.background_profile?.timezone === "UTC+8", "setup_form_timezone_v1: expected background timezone");
        assert(snapshot?.longTermRecords.length === 1, "setup_form_timezone_v1: expected long-term record");
      }
    },
    {
      id: "legacy_v2_followup_v0_9",
      hostId: "legacy_v2_runtime",
      hostVersion: "0.9",
      modality: "text",
      wireMode: "storageDescriptor",
      sampleReason: "legacy host version maps into Host Runtime Actions without changing CMCP policy ownership",
      buildSteps(storageContext) {
        return [
          {
            stepId: "persist-legacy-followup",
            description: "Legacy V2 wrapper maps remember+track semantics to explicit follow-up action",
            event: {
              type: "message:received",
              payload: {
                persist: true,
                ...storageContext.payloadStorage,
                policyCandidate: {
                  memoryType: "task",
                  sourceKind: "dialogue",
                  sourceSurface: "host_runtime_actions",
                  writeMode: "explicit_write_enabled",
                  invocationArea: "explicit_followup_action",
                  continuityValue: "legacy host: pick up the migration notes after lunch",
                  latestUserOwnedClause: "legacy host: pick up the migration notes after lunch",
                  evidenceRef: "legacy-v2-turn-1",
                  explicitTracking: true
                }
              }
            }
          }
        ];
      },
      assertScenario(executedSteps, snapshot) {
        const persisted = executedSteps[0].result.candidatePersisted?.persistence;
        assert(persisted?.finalLayer === "tracked", "legacy_v2_followup_v0_9: expected tracked layer");
        assert(snapshot?.trackedRecords.length === 1, "legacy_v2_followup_v0_9: expected tracked record");
      }
    },
    {
      id: "web_console_new_with_host_arrays_v1_2",
      hostId: "web_console_host",
      hostVersion: "1.2",
      modality: "host_arrays",
      wireMode: "hostArraysOnly",
      sampleReason: "host-provided arrays should drive /new even when bundled storage resolution is invalid",
      buildSteps(storageContext) {
        return [
          {
            stepId: "preview-new-from-arrays",
            description: "Host arrays bypass storage resolution for /new assembly",
            event: {
              type: "command",
              action: "new",
              payload: {
                ...storageContext.payloadStorage,
                trackedRecords: [
                  {
                    memory_id: "tracked-host-array-1",
                    status: "active",
                    updated_at: "2026-04-23T22:40:00+08:00",
                    latest_user_owned_clause: "host arrays should continue this tracked task",
                    anchor_turns: [{ role: "user", text: "host arrays should continue this tracked task" }]
                  }
                ],
                stagedRecords: [],
                dailyRecords: [],
                backgroundProfile: {
                  timezone: "UTC+8"
                }
              }
            }
          }
        ];
      },
      assertScenario(executedSteps) {
        const selection = executedSteps[0].result.newSelection;
        const storageFailure = executedSteps[0].result.storageFailure;
        assert(selection?.continuity_source === "tracked", "web_console_new_with_host_arrays_v1_2: expected tracked selection");
        assert(storageFailure === null, "web_console_new_with_host_arrays_v1_2: expected no storage failure");
      }
    },
    {
      id: "camera_scan_passive_v1",
      hostId: "camera_scan_host",
      hostVersion: "1.0",
      modality: "document_scan",
      wireMode: "hostArraysOnly",
      sampleReason: "passive multimodal capture without explicit write authorization should fail closed to session",
      buildSteps(storageContext) {
        return [
          {
            stepId: "passive-scan",
            description: "Passive document scan remains session-only even with invalid storage descriptor",
            event: {
              type: "message:received",
              payload: {
                persist: true,
                ...storageContext.payloadStorage,
                policyCandidate: {
                  memoryType: "event",
                  sourceKind: "dialogue",
                  continuityValue: "camera scan: contract draft visible on screen",
                  evidenceRef: "camera-scan-1"
                }
              }
            }
          }
        ];
      },
      assertScenario(executedSteps) {
        const decision = executedSteps[0].result.candidateEvaluated?.decision;
        const persisted = executedSteps[0].result.candidatePersisted?.persistence;
        assert(decision?.finalLayer === "session", "camera_scan_passive_v1: expected session-only decision");
        assert(persisted?.persisted === false, "camera_scan_passive_v1: expected no persistence");
      }
    }
  ];
}

async function runScenario(scenario) {
  const scenarioDir = path.join(MATRIX_ROOT, scenario.id);
  fs.mkdirSync(scenarioDir, { recursive: true });

  const storageContext = buildStorageContext(scenario.wireMode, scenarioDir);
  const steps = scenario.buildSteps(storageContext);
  const executedSteps = [];

  for (const step of steps) {
    const result = await emit(step.event);
    executedSteps.push({
      stepId: step.stepId,
      description: step.description,
      normalizedEvent: sanitizeEventForReport(step.event, storageContext.descriptor),
      result
    });
  }

  const snapshot = storageContext.snapshotReader ? storageContext.snapshotReader.loadSnapshot() : null;
  scenario.assertScenario(executedSteps, snapshot);

  return {
    report: buildScenarioReport(scenario, storageContext, executedSteps, snapshot),
    rawLogs: executedSteps.map((step) => ({
      stepId: step.stepId,
      logs: step.result.logs
    }))
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

ensureCleanMatrixRoot();

const scenarios = createScenarios();
const reports = [];
const rawLogs = {};

for (const scenario of scenarios) {
  const result = await runScenario(scenario);
  reports.push(result.report);
  rawLogs[scenario.id] = result.rawLogs;
}

const matrixReport = {
  generatedAt: new Date().toISOString(),
  projectRoot: ".",
  reportPath: toProjectRelative(REPORT_PATH),
  logPath: toProjectRelative(LOG_PATH),
  samplingStrategy: "representative_multi_host_multi_version_multi_modal_sample",
  scenarioCount: reports.length,
  scenarios: reports
};

writeJson(REPORT_PATH, matrixReport);
writeJson(LOG_PATH, sanitizeForExport(rawLogs));

console.log(`integration-matrix-ok ${toProjectRelative(REPORT_PATH)}`);
