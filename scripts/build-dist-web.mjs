import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(root, "apps", "web");
const distWeb = path.join(root, "dist-web");
const dist = path.join(root, "dist");
const singleFileExport = path.join(dist, "YucaTanaTrades_SingleFile.html");
const previousSingleFile = path.join(dist, "index.html");

function assertInsideRoot(target) {
  const resolved = path.resolve(target);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to write outside workspace: ${resolved}`);
  }
  return resolved;
}

function sanitizeHostedText(value) {
  return value
    .replace(/file:\/\/\/[A-Za-z]:[^\s"'<>)]*/g, "about:blank")
    .replace(/(^|[\s"'(=])([A-Za-z]:[\\/][^\s"'<>)]*)/g, "$1");
}

async function copyTextFile(src, dest) {
  const text = await readFile(src, "utf8");
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, sanitizeHostedText(text), "utf8");
}

async function copyMaybeTextFile(src, dest) {
  const ext = path.extname(src).toLowerCase();
  if ([".html", ".css", ".js", ".json", ".svg", ".txt", ".md"].includes(ext)) {
    await copyTextFile(src, dest);
    return;
  }
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

async function copyDir(src, dest) {
  if (!existsSync(src)) return;
  await mkdir(dest, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    if (entry.name === "__pycache__" || entry.name.endsWith(".pyc")) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else {
      await copyMaybeTextFile(from, to);
    }
  }
}

async function collectFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(full));
    else files.push(full);
  }
  return files;
}

async function assertNoLocalPaths(dir) {
  const offenders = [];
  for (const file of await collectFiles(dir)) {
    const ext = path.extname(file).toLowerCase();
    if (![".html", ".css", ".js", ".json", ".svg", ".txt"].includes(ext)) continue;
    const text = await readFile(file, "utf8");
    if (/(?:file:\/\/\/[A-Za-z]:|(^|[\s"'(=])[A-Za-z]:[\\/])/m.test(text)) {
      offenders.push(path.relative(root, file));
    }
  }
  if (offenders.length) {
    throw new Error(`Local Windows/file paths remain in: ${offenders.join(", ")}`);
  }
}

async function assertIndexLocalRefs() {
  const indexPath = path.join(distWeb, "index.html");
  const html = await readFile(indexPath, "utf8");
  const refs = [...html.matchAll(/\s(?:href|src|data-src)=["']([^"']+)["']/g)]
    .map(match => match[1])
    .filter(ref => !/^(?:https?:|data:|about:|mailto:|tel:|#|\$\{)/i.test(ref));
  const missing = [];
  for (const ref of refs) {
    const clean = ref.split("#")[0].split("?")[0];
    if (!clean) continue;
    const target = path.join(distWeb, clean);
    if (!existsSync(target)) missing.push(ref);
    else if (!(await stat(target)).isFile()) missing.push(ref);
  }
  if (missing.length) {
    throw new Error(`Missing hosted relative assets: ${missing.join(", ")}`);
  }
}

async function preserveSingleFileExport() {
  await mkdir(dist, { recursive: true });
  if (!existsSync(singleFileExport) && existsSync(previousSingleFile)) {
    await copyFile(previousSingleFile, singleFileExport);
  }
}

async function main() {
  assertInsideRoot(distWeb);
  await preserveSingleFileExport();
  await rm(distWeb, { recursive: true, force: true });
  await mkdir(distWeb, { recursive: true });

  await copyTextFile(path.join(appRoot, "index.html"), path.join(distWeb, "index.html"));
  await copyDir(path.join(appRoot, "styles"), path.join(distWeb, "styles"));
  await copyDir(path.join(appRoot, "scripts"), path.join(distWeb, "scripts"));
  await copyDir(path.join(appRoot, "assets"), path.join(distWeb, "assets"));
  await copyDir(path.join(appRoot, "legacy"), path.join(distWeb, "legacy"));
  await writeFile(path.join(distWeb, ".nojekyll"), "", "utf8");

  await assertNoLocalPaths(distWeb);
  await assertIndexLocalRefs();

  console.log(`Built ${path.relative(root, distWeb)} with hosted relative paths.`);
  console.log(`Preserved ${path.relative(root, singleFileExport)}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
