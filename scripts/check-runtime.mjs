import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseSemver(version) {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

function compareSemver(left, right) {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function fail(message) {
  console.error(`[runtime-check] ${message}`);
  process.exit(1);
}

const root = process.cwd();
const nvmrcPath = resolve(root, ".nvmrc");
const packageJsonPath = resolve(root, "package.json");

let expectedNodeRaw = "";
let packageJson = {};

try {
  expectedNodeRaw = readFileSync(nvmrcPath, "utf8").trim();
} catch {
  fail("Missing .nvmrc. Add the required Node version (e.g. 20.19.0).");
}

try {
  packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
} catch {
  fail("Missing or invalid package.json.");
}

const expectedNode = parseSemver(expectedNodeRaw);
const actualNode = parseSemver(process.versions.node);

if (!expectedNode) {
  fail(`Unsupported .nvmrc format: "${expectedNodeRaw}". Expected x.y.z.`);
}

if (!actualNode) {
  fail(`Cannot parse current Node version: "${process.versions.node}".`);
}

if (compareSemver(actualNode, expectedNode) !== 0) {
  fail(
    `Node runtime mismatch. Expected ${expectedNodeRaw} from .nvmrc, got ${process.versions.node}. Run: nvm use`,
  );
}

const npmEngine = packageJson?.engines?.npm;
const userAgent = process.env.npm_config_user_agent ?? "";
const npmMatch = userAgent.match(/npm\/(\d+\.\d+\.\d+)/);
const npmVersionRaw = npmMatch?.[1] ?? null;

if (npmEngine && npmVersionRaw) {
  const minMatch = String(npmEngine).match(/^>=\s*(\d+\.\d+\.\d+)$/);
  if (minMatch) {
    const minNpm = parseSemver(minMatch[1]);
    const actualNpm = parseSemver(npmVersionRaw);
    if (minNpm && actualNpm && compareSemver(actualNpm, minNpm) < 0) {
      fail(`npm runtime mismatch. Expected ${npmEngine}, got ${npmVersionRaw}.`);
    }
  }
}

console.log(`[runtime-check] OK node ${process.versions.node} (.nvmrc ${expectedNodeRaw})`);
