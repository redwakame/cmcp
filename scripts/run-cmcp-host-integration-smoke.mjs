import handler from "../hooks/cmcp-guard/handler.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runCase(name, fn) {
  await fn();
  console.log(`ok ${name}`);
}

function captureHandlerLogs() {
  const entries = [];
  const originalLog = console.log;

  console.log = (message) => {
    entries.push(String(message));
  };

  return {
    entries,
    restore() {
      console.log = originalLog;
    }
  };
}

function findLog(entries, label) {
  return entries.find((entry) => entry.startsWith(`[cmcp-guard] ${label} `)) ?? null;
}

function parseLogPayload(entry, label) {
  if (!entry) return null;
  const prefix = `[cmcp-guard] ${label} `;
  return JSON.parse(entry.slice(prefix.length));
}

await runCase("handler_new_uses_host_arrays_without_touching_invalid_storage", async () => {
  const capture = captureHandlerLogs();
  try {
    await handler({
      type: "command",
      action: "new",
      payload: {
        storage: { kind: "unsupported_remote" },
        trackedRecords: [
          {
            memory_id: "trk-host-1",
            status: "active",
            updated_at: "2026-04-23T22:00:00+08:00",
            latest_user_owned_clause: "host supplied tracked anchor",
            anchor_turns: [{ role: "user", text: "host supplied tracked anchor" }]
          }
        ],
        stagedRecords: [],
        dailyRecords: [],
        backgroundProfile: {}
      }
    });
  } finally {
    capture.restore();
  }

  const failureLog = findLog(capture.entries, "new-session-storage-resolution-failed");
  const selectionLog = findLog(capture.entries, "new-session-selection");
  const payload = parseLogPayload(selectionLog, "new-session-selection");

  assert(failureLog === null, "expected no storage resolution failure when host arrays are present");
  assert(payload?.continuity_source === "tracked", "expected tracked anchor from host arrays");
});

await runCase("handler_new_fails_closed_when_snapshot_storage_resolution_fails", async () => {
  const capture = captureHandlerLogs();
  try {
    await handler({
      type: "command",
      action: "new",
      payload: {
        readFromState: true,
        storage: { kind: "unsupported_remote" }
      }
    });
  } finally {
    capture.restore();
  }

  const failureLog = findLog(capture.entries, "new-session-storage-resolution-failed");
  const selectionLog = findLog(capture.entries, "new-session-selection");
  const failurePayload = parseLogPayload(failureLog, "new-session-storage-resolution-failed");
  const selectionPayload = parseLogPayload(selectionLog, "new-session-selection");

  assert(Boolean(failurePayload), "expected storage resolution failure log");
  assert(failurePayload.reasons.includes("storage_resolution_failed"), "expected fail-closed reason");
  assert(selectionPayload?.continuity_source === "none", "expected empty continuity fallback");
});

await runCase("handler_message_persist_fails_closed_on_invalid_storage", async () => {
  const capture = captureHandlerLogs();
  try {
    await handler({
      type: "message:received",
      payload: {
        persist: true,
        storage: { kind: "unsupported_remote" },
        policyCandidate: {
          memoryType: "task",
          sourceKind: "dialogue",
          sourceSurface: "cmcp_policy",
          writeMode: "explicit_write_enabled",
          invocationArea: "cmcp_policy_manual_write",
          continuityValue: "persist this if storage works",
          evidenceRef: "turn-host-1"
        }
      }
    });
  } finally {
    capture.restore();
  }

  const persistedLog = findLog(capture.entries, "candidate-persisted");
  const persistedPayload = parseLogPayload(persistedLog, "candidate-persisted");

  assert(Boolean(persistedPayload), "expected candidate-persisted log");
  assert(persistedPayload.persistence.persisted === false, "expected fail-closed persistence");
  assert(
    persistedPayload.persistence.reasons.includes("storage_resolution_failed"),
    "expected storage resolution failure in persistence reasons"
  );
});

console.log("host-integration-smoke-ok");
