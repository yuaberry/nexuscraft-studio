#!/usr/bin/env node
/**
 * Patches android/settings.gradle after `expo prebuild` for the pnpm
 * workspace layout (the prebuild template regenerates this file):
 *  1. resolve @react-native/* packages with the react-native paths trick
 *     (they are transitive deps, hidden under pnpm's store)
 *  2. run the node probes from the app directory — android/ has no
 *     node_modules of its own
 * Run automatically via `pnpm prebuild:android`.
 */

const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "..", "android", "settings.gradle");
if (!fs.existsSync(file)) {
  console.error("android/settings.gradle not found — run `expo prebuild -p android` first");
  process.exit(1);
}

let source = fs.readFileSync(file, "utf8");

const replacements = [
  // pluginManagement includeBuild: add the paths trick + correct cwd
  [
    "require.resolve('@react-native/gradle-plugin/package.json')\"].execute(null, rootDir)",
    "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })\"].execute(null, rootDir.getParentFile())",
  ],
  // every remaining node probe: run from the app dir, not android/
  [
    ".execute(null, rootDir).text.trim()",
    ".execute(null, rootDir.getParentFile()).text.trim()",
  ],
];

let applied = 0;
for (const [from, to] of replacements) {
  if (source.includes(from)) {
    source = source.split(from).join(to);
    applied++;
  }
}

// Idempotency: after the first pass the pluginManagement line may already
// carry the paths trick but still target rootDir.
source = source.replace(
  "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })\"].execute(null, rootDir)",
  "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })\"].execute(null, rootDir.getParentFile())",
);

fs.writeFileSync(file, source);
console.log(`settings.gradle patched (${applied} rule groups applied)`);
