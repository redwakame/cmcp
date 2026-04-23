import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import handler from "../hooks/cmcp-guard/handler.js";
import { createCmcpFileStorageAdapter } from "../src/cmcp-guard/cmcp-file-storage-adapter.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEMO_ROOT = path.join(PROJECT_ROOT, "runtime-data", "mock-host-demo");
const STATE_ROOT = path.join(DEMO_ROOT, "state");
const SUMMARY_PATH = path.join(DEMO_ROOT, "demo-summary.json");
const LOG_PATH = path.join(DEMO_ROOT, "demo-log.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function ensureCleanDemoRoot() {
  fs.rmSync(DEMO_ROOT, { recursive: true, force: true });
  fs.mkdirSync(DEMO_ROOT, { recursive: true });
}

function createMockHostStorageAdapter() {
  const base = createCmcpFileStorageAdapter({ stateRoot: STATE_ROOT });

  return Object.freeze({
    adapterId: "cmcp.mock_host",
    adapterKind: "mock-host-file",
    stateRoot: base.stateRoot,
    capabilities: base.capabilities,
    readSection: base.readSection,
    writeSection: base.writeSection,
    upsertSection: base.upsertSection,
    setSettingsValue: base.setSettingsValue,
    loadSnapshot: base.loadSnapshot,
    describe() {
      return {
        adapterId: "cmcp.mock_host",
        adapterKind: "mock-host-file",
        stateRoot: base.stateRoot,
        capabilities: base.capabilities,
        hostName: "cmcp-minimal-host"
      };
    }
  });
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

async function emit(event) {
  const logs = await captureLogsDuring(async () => {
    await handler(event);
  });

  return {
    event,
    logs,
    evaluated: findLastPayload(logs, "candidate-evaluated"),
    persisted: findLastPayload(logs, "candidate-persisted"),
    correctionEvaluated: findLastPayload(logs, "correction-action-evaluated"),
    correctionPersisted: findLastPayload(logs, "correction-action-persisted"),
    newSelection: findLastPayload(logs, "new-session-selection"),
    storageFailure: findLastPayload(logs, "new-session-storage-resolution-failed")
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toProjectRelative(filePath) {
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

ensureCleanDemoRoot();

const storageAdapter = createMockHostStorageAdapter();

const bootstrap = await emit({
  type: "agent:bootstrap",
  payload: {
    storageAdapter
  }
});

const trackedWrite = await emit({
  type: "message:received",
  payload: {
    persist: true,
    storageAdapter,
    policyCandidate: {
      memoryType: "task",
      sourceKind: "dialogue",
      sourceSurface: "host_runtime_actions",
      writeMode: "explicit_write_enabled",
      invocationArea: "explicit_followup_action",
      continuityValue: "send the final CMCP verification package tomorrow morning",
      latestUserOwnedClause: "send the final CMCP verification package tomorrow morning",
      evidenceRef: "mock-host-turn-1",
      explicitTracking: true
    }
  }
});

assert(trackedWrite.persisted?.persistence?.persisted === true, "mock host demo: expected tracked persistence");
assert(trackedWrite.persisted?.persistence?.finalLayer === "tracked", "mock host demo: expected tracked layer");

const onboardingWrite = await emit({
  type: "message:received",
  payload: {
    persist: true,
    storageAdapter,
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
      evidenceRef: "mock-host-onboarding-1"
    }
  }
});

assert(onboardingWrite.persisted?.persistence?.persisted === true, "mock host demo: expected onboarding persistence");
assert(
  onboardingWrite.persisted?.persistence?.finalLayer === "long_term_personalization",
  "mock host demo: expected long-term personalization layer"
);

const newSelection = await emit({
  type: "command",
  action: "new",
  payload: {
    readFromState: true,
    storageAdapter
  }
});

assert(newSelection.newSelection?.continuity_source === "tracked", "mock host demo: expected tracked /new anchor");
assert(
  newSelection.newSelection?.background_profile?.timezone === "UTC+8",
  "mock host demo: expected timezone background profile"
);

const snapshot = storageAdapter.loadSnapshot();
const summary = {
  generatedAt: new Date().toISOString(),
  projectRoot: ".",
  demoRoot: toProjectRelative(DEMO_ROOT),
  stateRoot: toProjectRelative(STATE_ROOT),
  storage: sanitizeForExport(storageAdapter.describe()),
  steps: {
    bootstrap: {
      logCount: bootstrap.logs.length
    },
    trackedWrite: sanitizeForExport(trackedWrite.persisted?.persistence ?? null),
    onboardingWrite: sanitizeForExport(onboardingWrite.persisted?.persistence ?? null),
    newSelection: sanitizeForExport(newSelection.newSelection ?? null)
  },
  snapshotSummary: {
    settings: snapshot.settings,
    counts: {
      tracked: snapshot.trackedRecords.length,
      staged: snapshot.stagedRecords.length,
      daily: snapshot.dailyRecords.length,
      longTerm: snapshot.longTermRecords.length,
      tombstones: snapshot.tombstones.length
    },
    backgroundProfile: snapshot.backgroundProfile
  }
};

writeJson(SUMMARY_PATH, summary);
writeJson(
  LOG_PATH,
  sanitizeForExport({
    bootstrap: bootstrap.logs,
    trackedWrite: trackedWrite.logs,
    onboardingWrite: onboardingWrite.logs,
    newSelection: newSelection.logs
  })
);

console.log(`mock-host-demo-ok ${toProjectRelative(SUMMARY_PATH)}`);
