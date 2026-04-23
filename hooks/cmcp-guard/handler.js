import {
  evaluateCmcpWriteCandidate,
  normalizeCmcpWriteCandidate
} from "../../src/cmcp-guard/evaluate-cmcp-write-candidate.js";
import {
  applyCmcpCorrectionAction,
  canApplyCmcpCorrectionAction,
  normalizeCmcpCorrectionAction
} from "../../src/cmcp-guard/apply-cmcp-correction-action.js";
import { detectCmcpForbiddenText } from "../../src/cmcp-guard/detect-cmcp-forbidden-text.js";
import { getCmcpRuntimePolicy } from "../../src/cmcp-guard/get-cmcp-runtime-policy.js";
import { persistCmcpWriteDecision } from "../../src/cmcp-guard/persist-cmcp-write.js";
import {
  describeCmcpStorageAdapter,
  tryResolveCmcpStorageAdapter
} from "../../src/cmcp-guard/cmcp-storage-adapter.js";
import { selectCmcpNewAnchor } from "../../src/cmcp-guard/select-cmcp-new-anchor.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getPayload(event) {
  return event && typeof event.payload === "object" && event.payload ? event.payload : {};
}

function getMessageText(event, payload) {
  const direct = typeof event?.text === "string" ? event.text : "";
  if (direct) return direct;
  if (typeof payload.text === "string") return payload.text;
  if (payload.message && typeof payload.message.text === "string") return payload.message.text;
  if (event?.message && typeof event.message.text === "string") return event.message.text;
  return "";
}

function logDecision(label, data) {
  console.log(`[cmcp-guard] ${label} ${JSON.stringify(data)}`);
}

function countChangedRecords(beforeRecords, afterRecords) {
  const beforeById = new Map(asArray(beforeRecords).map((record) => [record.memory_id ?? Symbol("record"), JSON.stringify(record)]));
  let changed = 0;
  for (const record of asArray(afterRecords)) {
    const key = record.memory_id ?? Symbol("record");
    if (!beforeById.has(key) || beforeById.get(key) !== JSON.stringify(record)) {
      changed += 1;
    }
  }
  if (asArray(beforeRecords).length !== asArray(afterRecords).length) {
    changed += Math.abs(asArray(beforeRecords).length - asArray(afterRecords).length);
  }
  return changed;
}

function getStorageInput(payload) {
  return {
    storageAdapter: payload.storageAdapter ?? null,
    storage: payload.storage ?? null,
    stateRoot: typeof payload.stateRoot === "string" ? payload.stateRoot : null
  };
}

function getStorageAdapter(payload) {
  return tryResolveCmcpStorageAdapter(getStorageInput(payload));
}

function handleBootstrap() {
  const policy = getCmcpRuntimePolicy();
  const storageResolution = getStorageAdapter({});
  logDecision("loaded", {
    version: policy.version,
    layers: policy.layerOrder,
    decisionOrder: policy.decisionOrder,
    invocationAreas: Object.keys(policy.invocationAreaRegistry ?? {}),
    surfaces: policy.surfaceOwnership,
    storage: storageResolution.ok
      ? describeCmcpStorageAdapter(storageResolution.adapter)
      : storageResolution.storage
  });
}

function handleMessageReceived(event) {
  const payload = getPayload(event);
  const storageInput = getStorageInput(payload);
  const text = getMessageText(event, payload);
  const forbiddenMatches = detectCmcpForbiddenText(text);

  if (forbiddenMatches.length > 0) {
    logDecision("forbidden-text-detected", {
      categories: forbiddenMatches.map((match) => match.category)
    });
  }

  const candidates = [];
  if (payload.policyCandidate) candidates.push(payload.policyCandidate);
  candidates.push(...asArray(payload.policyCandidates));
  const correctionActions = [];
  if (payload.correctionAction) correctionActions.push(payload.correctionAction);
  correctionActions.push(...asArray(payload.correctionActions));
  const correctionPreviewRecords = asArray(payload.memoryRecords ?? payload.records);

  for (const rawCandidate of candidates) {
    const candidate = normalizeCmcpWriteCandidate(rawCandidate);
    const decision = evaluateCmcpWriteCandidate(candidate);
    logDecision("candidate-evaluated", {
      input: {
        memoryType: candidate.memoryType,
        sourceKind: candidate.sourceKind,
        sourceSurface: candidate.sourceSurface,
        invocationArea: candidate.invocationArea
      },
      decision
    });

    if (payload.persist === true) {
      const persistence = persistCmcpWriteDecision(decision, candidate, storageInput);
      logDecision("candidate-persisted", {
        input: {
          memoryType: candidate.memoryType,
          invocationArea: candidate.invocationArea
        },
        persistence
      });
    }
  }

  for (const rawAction of correctionActions) {
    const action = normalizeCmcpCorrectionAction(rawAction);
    const decision = canApplyCmcpCorrectionAction(action);
    const preview = decision.accepted && correctionPreviewRecords.length > 0
      ? applyCmcpCorrectionAction(correctionPreviewRecords, action)
      : null;

    logDecision("correction-action-evaluated", {
      input: {
        action: action.action,
        targetScope: action.target_scope,
        invocationArea: action.invocationArea
      },
      decision,
      preview: preview ? {
        inputCount: correctionPreviewRecords.length,
        outputCount: preview.length,
        changedCount: countChangedRecords(correctionPreviewRecords, preview)
      } : null
    });

    if (payload.persist === true) {
      const persistence = persistCmcpWriteDecision(decision, action, storageInput);
      logDecision("correction-action-persisted", {
        input: {
          action: action.action,
          invocationArea: action.invocationArea
        },
        persistence
      });
    }
  }
}

function handleNewCommand(event) {
  const payload = getPayload(event);
  const shouldReadFromState = (payload.readFromState === true || (
    !payload.trackedRecords &&
    !payload.stagedRecords &&
    !payload.dailyRecords
  ));
  let snapshot = null;

  if (shouldReadFromState) {
    const storageResolution = getStorageAdapter(payload);
    if (storageResolution.ok) {
      snapshot = storageResolution.adapter.loadSnapshot();
    } else {
      logDecision("new-session-storage-resolution-failed", {
        reasons: [
          "storage_resolution_failed",
          storageResolution.error?.message ?? "unknown_storage_resolution_error"
        ],
        storage: storageResolution.storage
      });
    }
  }

  const selection = selectCmcpNewAnchor({
    trackedRecords: snapshot ? snapshot.trackedRecords : asArray(payload.trackedRecords),
    stagedRecords: snapshot ? snapshot.stagedRecords : asArray(payload.stagedRecords),
    dailyRecords: snapshot ? snapshot.dailyRecords : asArray(payload.dailyRecords),
    tombstones: snapshot ? snapshot.tombstones : asArray(payload.tombstones),
    backgroundProfile: snapshot ? snapshot.backgroundProfile : (payload.backgroundProfile ?? {})
  });

  logDecision("new-session-selection", selection);
}

const handler = async (event) => {
  if (!event || typeof event !== "object") {
    return;
  }

  if (event.type === "agent:bootstrap") {
    handleBootstrap();
    return;
  }

  if (event.type === "message:received") {
    handleMessageReceived(event);
    return;
  }

  if (event.type === "command" && event.action === "new") {
    handleNewCommand(event);
  }
};

export default handler;
