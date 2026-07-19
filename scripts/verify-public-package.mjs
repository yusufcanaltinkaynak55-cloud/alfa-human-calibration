import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedExtensions = new Set(["", ".html", ".css", ".js", ".mjs", ".md", ".cff", ".json", ".yml"]);
const allowedPaths = new Set([
  ".github/workflows/public-boundary.yml",
  ".gitignore",
  ".nojekyll",
  "app.js",
  "CITATION.cff",
  "GITHUB_PUBLISH.md",
  "index.html",
  "LICENSE_NOTICE.md",
  "METHOD.md",
  "pilot-items.js",
  "PRIVACY.md",
  "PUBLICATION_BOUNDARY.md",
  "README.md",
  "scripts/verify-public-package.mjs",
  "styles.css"
]);
const forbiddenNames = new Set([
  ".env",
  "config",
  "core",
  "outputs",
  "checkpoints",
  "validation",
  "node_modules",
  ".git"
]);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /(?:api[_-]?key|secret[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/i
];

function listFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    if (forbiddenNames.has(entry.name)) {
      throw new Error(`Forbidden path name: ${entry.name}`);
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

const files = listFiles(root)
  .filter((file) => path.basename(file) !== "PUBLICATION_MANIFEST.json")
  .sort();
const manifestFiles = [];
for (const file of files) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (!allowedPaths.has(relative)) {
    throw new Error(`File is not on the public allowlist: ${relative}`);
  }
  const extension = path.extname(file);
  if (!allowedExtensions.has(extension)) {
    throw new Error(`Unexpected public file type: ${relative}`);
  }
  const bytes = fs.readFileSync(file);
  if (bytes.length > 1024 * 1024) {
    throw new Error(`Public file exceeds 1 MiB: ${relative}`);
  }
  const text = bytes.toString("utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) throw new Error(`Potential secret in ${relative}`);
  }
  manifestFiles.push({
    path: relative,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  });
}

const manifest = {
  schemaVersion: "alfa_public_release_manifest_v1",
  packageId: "alfa-human-calibration",
  publicBoundaryVerified: true,
  containsExpectedLabels: false,
  containsModelPredictions: false,
  containsCoreCode: false,
  containsCredentials: false,
  files: manifestFiles
};
const pilotSource = fs.readFileSync(path.join(root, "pilot-items.js"), "utf8");
if (/\b(?:decisionClass|expectedLabel|modelPrediction)\s*:/.test(pilotSource)) {
  throw new Error("Pilot items contain a forbidden label or prediction field.");
}
const sandbox = { window: {} };
vm.runInNewContext(pilotSource, sandbox, { filename: "pilot-items.js" });
const pilot = sandbox.window.ALFA_PUBLIC_PILOT;
if (!pilot || pilot.expectedLabelsIncluded !== false) {
  throw new Error("Pilot package does not declare an unlabeled boundary.");
}
if (!Array.isArray(pilot.items) || pilot.items.length !== 20) {
  throw new Error("Pilot package must contain exactly 20 items.");
}
const itemIds = new Set();
for (const item of pilot.items) {
  if (!item?.id || !item?.tr || !item?.en) {
    throw new Error("Every pilot item must contain id, tr and en.");
  }
  if (itemIds.has(item.id)) throw new Error(`Duplicate pilot id: ${item.id}`);
  itemIds.add(item.id);
}
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const required of [
  "pilot-items.js",
  "app.js",
  "consentForm",
  "decisionGrid",
  "confidenceGrid",
  "exportButton"
]) {
  if (!html.includes(required)) throw new Error(`Missing site contract: ${required}`);
}
if (/https?:\/\//i.test(html)) {
  throw new Error("The static annotation page must not call an external URL.");
}
fs.writeFileSync(
  path.join(root, "PUBLICATION_MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);
console.log(JSON.stringify({
  status: "PASS",
  fileCount: manifestFiles.length,
  manifest: path.join(root, "PUBLICATION_MANIFEST.json")
}));
