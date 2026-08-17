#!/usr/bin/env node
/**
 * Swift Package Manager derives *package identity* from the last path
 * component of a local package's path, not from the `name:` parameter.
 *
 * Capacitor generates ios/App/CapApp-SPM/Package.swift with entries like:
 *   .package(name: "CapacitorApp",         path: "../../../node_modules/@capacitor/app")
 *   .package(name: "CapacitorFirebaseApp", path: "../../../node_modules/@capacitor-firebase/app")
 *
 * Both paths end in "/app" → SPM sees two packages with identity "app" and
 * aborts with: Conflicting identity for app.
 *
 * Fix: for every local .package(...) reference, copy the package into a
 * uniquely-named real directory under:
 *   ios/App/CapApp-SPM/LocalPackages/<uniqueName>
 *
 * Do NOT use symlinks here. Xcode/SPM canonicalizes symlink targets back to
 * node_modules, so @capacitor/app and @capacitor-firebase/app still both end
 * up with the real basename "app" and the conflict remains.
 *
 * Real copied directories keep the unique basename as the package identity.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const spmDir = path.resolve("ios/App/CapApp-SPM");
const pkgFile = path.join(spmDir, "Package.swift");
const linkDir = path.join(spmDir, "LocalPackages");

const src = await fs.readFile(pkgFile, "utf8");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findPackageByManifestName(packageName) {
  const nodeModules = path.resolve("node_modules");
  const packageDirs = [];

  for (const topEntry of await fs.readdir(nodeModules, { withFileTypes: true })) {
    if (!topEntry.isDirectory()) continue;
    const topPath = path.join(nodeModules, topEntry.name);
    if (topEntry.name.startsWith("@")) {
      for (const scopedEntry of await fs.readdir(topPath, { withFileTypes: true })) {
        if (scopedEntry.isDirectory()) {
          packageDirs.push(path.join(topPath, scopedEntry.name));
        }
      }
    } else {
      packageDirs.push(topPath);
    }
  }

  for (const packageDir of packageDirs) {
    const manifest = path.join(packageDir, "Package.swift");
    if (!(await exists(manifest))) continue;
    const contents = await fs.readFile(manifest, "utf8");
    if (
      new RegExp(`name:\\s*"${packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(contents)
    ) {
      return packageDir;
    }
  }

  throw new Error(
    `Could not find node_modules package whose Package.swift declares name "${packageName}"`,
  );
}

async function resolveSourcePackage(packageName, relPath) {
  const absPath = path.resolve(spmDir, relPath);
  if (relPath.startsWith("LocalPackages/")) {
    if (await exists(absPath)) {
      const stat = await fs.lstat(absPath);
      if (stat.isSymbolicLink()) {
        return fs.realpath(absPath);
      }
    }
    return findPackageByManifestName(packageName);
  }

  const manifest = path.join(absPath, "Package.swift");
  if (!(await exists(manifest))) {
    throw new Error(
      `Local Swift package path for ${packageName} is missing Package.swift: ${absPath}`,
    );
  }
  return absPath;
}

const re = /\.package\(\s*name:\s*"([^"]+)"\s*,\s*path:\s*"([^"]+)"\s*\)/g;
const replacements = [];
let match;
while ((match = re.exec(src)) !== null) {
  const [full, name, relPath] = match;
  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new Error(`Unsafe Swift package name cannot be used as a local directory: ${name}`);
  }
  const sourcePath = await resolveSourcePackage(name, relPath);
  replacements.push({ full, name, sourcePath, newRel: `LocalPackages/${name}` });
}

await fs.mkdir(linkDir, { recursive: true });
// Wipe stale local package copies so removed plugins don't linger.
for (const entry of await fs.readdir(linkDir, { withFileTypes: true })) {
  await fs.rm(path.join(linkDir, entry.name), { recursive: true, force: true });
}

for (const { name, sourcePath } of replacements) {
  const destinationPath = path.join(linkDir, name);
  await fs.cp(sourcePath, destinationPath, {
    recursive: true,
    dereference: true,
    filter: (source) => !source.includes(`${path.sep}.git${path.sep}`),
  });

  const copiedManifest = path.join(destinationPath, "Package.swift");
  if (!(await exists(copiedManifest))) {
    throw new Error(`Copied Swift package ${name} is missing Package.swift at ${copiedManifest}`);
  }
}

let updated = src;
for (const { full, name, newRel } of replacements) {
  const replacement = `.package(name: "${name}", path: "${newRel}")`;
  updated = updated.replace(full, replacement);
  console.log(`SPM identity → ${name}  (${newRel})`);
}

await fs.writeFile(pkgFile, updated);

const identities = new Map();
for (const { name, newRel } of replacements) {
  const identity = path.basename(newRel).toLowerCase();
  if (identities.has(identity)) {
    throw new Error(
      `Duplicate SPM package identity "${identity}" for ${identities.get(identity)} and ${name}`,
    );
  }
  identities.set(identity, name);

  const localPath = path.resolve(spmDir, newRel);
  const stat = await fs.lstat(localPath);
  if (stat.isSymbolicLink()) {
    throw new Error(`Local Swift package must be a real directory, not a symlink: ${localPath}`);
  }
}

console.log(
  `OK: copied and rewrote ${replacements.length} local Swift package paths in ${pkgFile}`,
);
