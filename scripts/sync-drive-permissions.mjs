#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncTerraVivaDrivePermissions } from "./lib/drivePermissions.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const localConfigPath = path.join(projectRoot, "terra-viva.publisher.local.json");

async function readLocalConfig() {
  try {
    return JSON.parse(await readFile(localConfigPath, "utf8"));
  } catch {
    return {};
  }
}

async function main() {
  const config = await readLocalConfig();

  if (!config.driveFolderId) {
    throw new Error("Falta driveFolderId en terra-viva.publisher.local.json.");
  }

  if (!process.env.GOOGLE_DRIVE_ACCESS_TOKEN && config.googleDriveAccessToken) {
    process.env.GOOGLE_DRIVE_ACCESS_TOKEN = config.googleDriveAccessToken;
  }

  const result = await syncTerraVivaDrivePermissions({ projectRoot, config });

  console.log(`Raiz protegida: ${result.rootFolderId}`);
  console.log(`Inbox protegido: ${result.inboxFolderId}`);
  console.log(`Correos con acceso operativo: ${result.allowedEditorEmails.join(", ")}`);
  console.log(`Videos publicados detectados: ${result.publicVideoIds.length}`);
  console.log(`Videos asegurados como publicos: ${result.publicVideosUpdated}`);
  console.log(`Elementos restringidos revisados: ${result.restrictedItemsUpdated}`);

  if (result.publishedMissing.length > 0) {
    console.log("Videos publicados faltantes en Drive:");
    for (const fileId of result.publishedMissing) {
      console.log(`- ${fileId}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
