import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

const requiredFiles = [
  ".codex-plugin/plugin.json",
  "package.json",
  "scripts/run-cmcp-write-pipeline-smoke.mjs",
  "scripts/run-cmcp-acceptance-harness.mjs",
  "scripts/run-cmcp-adversarial-smoke.mjs",
  "scripts/run-cmcp-end-to-end-integration-smoke.mjs",
  "scripts/run-cmcp-host-integration-smoke.mjs",
  "scripts/run-cmcp-runtime-schema-smoke.mjs",
  "scripts/run-cmcp-mock-host-demo.mjs",
  "scripts/run-cmcp-integration-matrix.mjs",
  "skills/cmcp-core/SKILL.md",
  "skills/cmcp-core/_meta.json",
  "skills/cmcp-core/contract/cmcp-contract-v1.yaml",
  "skills/cmcp-core/contract/cmcp-runtime-policy.json",
  "skills/cmcp-core/contract/cmcp-surface-map.yaml",
  "skills/cmcp-core/contract/cmcp-host-integration-v1.yaml",
  "skills/cmcp-core/schemas/cmcp-memory-record.schema.json",
  "skills/cmcp-core/schemas/cmcp-continuity-context.schema.json",
  "skills/cmcp-core/schemas/cmcp-correction-action.schema.json",
  "skills/cmcp-core/schemas/cmcp-write-decision.schema.json",
  "skills/cmcp-core/schemas/cmcp-storage-adapter-descriptor.schema.json",
  "skills/cmcp-core/schemas/cmcp-persistence-result.schema.json",
  "hooks/cmcp-guard/HOOK.md",
  "hooks/cmcp-guard/handler.js",
  "src/cmcp-guard/get-cmcp-runtime-policy.js",
  "src/cmcp-guard/cmcp-file-store.js",
  "src/cmcp-guard/cmcp-file-storage-adapter.js",
  "src/cmcp-guard/cmcp-content-safety.js",
  "src/cmcp-guard/cmcp-settings-policy.js",
  "src/cmcp-guard/cmcp-storage-adapter.js",
  "src/cmcp-guard/evaluate-cmcp-write-candidate.js",
  "src/cmcp-guard/detect-cmcp-forbidden-text.js",
  "src/cmcp-guard/select-cmcp-new-anchor.js",
  "src/cmcp-guard/apply-cmcp-correction-action.js",
  "src/cmcp-guard/persist-cmcp-write.js",
  "src/cmcp-guard/validate-cmcp-record.js",
  "src/cmcp-guard/validate-cmcp-runtime-shapes.js"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function parseJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function checkFrontmatter(relativePath, requiredKeys) {
  const text = read(relativePath);
  assert(text.startsWith("---\n"), `${relativePath}: missing frontmatter start`);
  const closing = text.indexOf("\n---\n", 4);
  assert(closing !== -1, `${relativePath}: missing frontmatter end`);
  const frontmatter = text.slice(4, closing);
  for (const key of requiredKeys) {
    assert(frontmatter.includes(`${key}:`), `${relativePath}: missing ${key}`);
  }
}

for (const relativePath of requiredFiles) {
  assert(fs.existsSync(path.join(ROOT, relativePath)), `missing required file: ${relativePath}`);
}

parseJson("package.json");
parseJson(".codex-plugin/plugin.json");
parseJson("skills/cmcp-core/_meta.json");
parseJson("skills/cmcp-core/contract/cmcp-runtime-policy.json");
parseJson("skills/cmcp-core/schemas/cmcp-memory-record.schema.json");
parseJson("skills/cmcp-core/schemas/cmcp-continuity-context.schema.json");
parseJson("skills/cmcp-core/schemas/cmcp-correction-action.schema.json");
parseJson("skills/cmcp-core/schemas/cmcp-write-decision.schema.json");
parseJson("skills/cmcp-core/schemas/cmcp-storage-adapter-descriptor.schema.json");
parseJson("skills/cmcp-core/schemas/cmcp-persistence-result.schema.json");

checkFrontmatter("skills/cmcp-core/SKILL.md", ["name", "description", "metadata"]);
checkFrontmatter("hooks/cmcp-guard/HOOK.md", ["name", "description", "metadata"]);

const continuityYaml = read("skills/cmcp-core/contract/cmcp-contract-v1.yaml");
assert(continuityYaml.includes("layers:"), "cmcp-contract-v1.yaml: missing layers section");
assert(continuityYaml.includes("new_session:"), "cmcp-contract-v1.yaml: missing new_session section");
assert(continuityYaml.includes("user_correction:"), "cmcp-contract-v1.yaml: missing user_correction section");

const surfaceYaml = read("skills/cmcp-core/contract/cmcp-surface-map.yaml");
assert(surfaceYaml.includes("surfaces:"), "cmcp-surface-map.yaml: missing surfaces section");
assert(surfaceYaml.includes("best_fit_summary:"), "cmcp-surface-map.yaml: missing best_fit_summary section");

const hostIntegrationYaml = read("skills/cmcp-core/contract/cmcp-host-integration-v1.yaml");
assert(hostIntegrationYaml.includes("storage_adapter_interface:"), "cmcp-host-integration-v1.yaml: missing storage_adapter_interface section");
assert(hostIntegrationYaml.includes("host_hook_payload:"), "cmcp-host-integration-v1.yaml: missing host_hook_payload section");

console.log("bundle-check-ok");
