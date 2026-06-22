#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const approvalsRoot = path.join(projectRoot, "catalog-approvals");
const currentApprovalPath = path.join(
  approvalsRoot,
  "current-approved-catalog.json"
);
const historyRoot = path.join(approvalsRoot, "history");

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    const value = next && !next.startsWith("--") ? next : "true";
    args[key] = value;

    if (value === next) {
      index += 1;
    }
  }

  return args;
}

function getDefaultDownloadsDir() {
  return path.join(os.homedir(), "Downloads");
}

function isApprovalFileName(fileName) {
  return (
    /^terra-viva-aprobacion-\d{4}-\d{2}-\d{2}\.json$/i.test(fileName) ||
    /^terra-viva-catalogo-\d{4}-\d{2}-\d{2}\.json$/i.test(fileName)
  );
}

function isCatalogDay(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.title === "string" &&
    (value.status === "draft" || value.status === "published") &&
    Array.isArray(value.videos) &&
    Array.isArray(value.moments)
  );
}

async function readCatalogPayload(filePath) {
  const rawValue = await readFile(filePath, "utf8");
  const parsed = JSON.parse(rawValue.replace(/^\uFEFF/, ""));
  const catalog =
    parsed && typeof parsed === "object" && "catalog" in parsed
      ? parsed.catalog
      : parsed;

  if (!isCatalogDay(catalog)) {
    throw new Error(`El archivo no contiene un catalogo valido: ${filePath}`);
  }

  return {
    payload: parsed,
    catalog
  };
}

function getLatestApprovalFile(downloadsDir) {
  if (!fs.existsSync(downloadsDir)) {
    return null;
  }

  return fs
    .readdirSync(downloadsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isApprovalFileName(entry.name))
    .map((entry) => {
      const fullPath = path.join(downloadsDir, entry.name);
      const stats = fs.statSync(fullPath);
      return {
        fullPath,
        name: entry.name,
        mtimeMs: stats.mtimeMs
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs)[0];
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const explicitInput = cli.input ? path.resolve(projectRoot, cli.input) : "";
  const downloadsDir = cli["downloads-dir"]
    ? path.resolve(projectRoot, cli["downloads-dir"])
    : getDefaultDownloadsDir();
  const latestDownloadApproval = getLatestApprovalFile(downloadsDir)?.fullPath;
  const sourcePath =
    explicitInput ||
    latestDownloadApproval ||
    (fs.existsSync(currentApprovalPath) ? currentApprovalPath : "");

  if (!sourcePath) {
    throw new Error(
      `No encontre una aprobacion para publicar. Guarda primero 'terra-viva-aprobacion-YYYY-MM-DD.json' desde admin en ${downloadsDir}.`
    );
  }

  const { payload, catalog } = await readCatalogPayload(sourcePath);
  await mkdir(approvalsRoot, { recursive: true });
  await mkdir(historyRoot, { recursive: true });

  const normalizedPayload =
    payload && typeof payload === "object" && "catalog" in payload
      ? payload
      : {
          exportedAt: new Date().toISOString(),
          source: "terra-viva-admin",
          catalog
        };

  await writeFile(
    currentApprovalPath,
    `${JSON.stringify(normalizedPayload, null, 2)}\n`,
    "utf8"
  );

  const historyFileName = `terra-viva-aprobacion-${catalog.date}-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
  const historyPath = path.join(historyRoot, historyFileName);
  await copyFile(currentApprovalPath, historyPath);

  console.log(`Aprobacion preparada: ${currentApprovalPath}`);
  console.log(`Historial: ${historyPath}`);
  console.log(`Archivo usado: ${sourcePath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
