#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureTerraVivaFolderLayout,
  getFile,
  INBOX_FOLDER_NAME,
  listFolderChildren,
  listFoldersByQuery,
  moveDriveItemToFolder,
  resolveTerraVivaRootFolderId,
  trashDriveFile
} from "./lib/driveClient.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const localConfigPath = path.join(projectRoot, "terra-viva.publisher.local.json");

function looksLikeProcessedDateFolder(name) {
  return /^\d{4}-\d{2}-\d{2}$/.test(name) || /^\d{2}\.\d{2}\.\d{4}$/.test(name);
}

async function readLocalConfig() {
  return JSON.parse(await readFile(localConfigPath, "utf8"));
}

async function writeLocalConfig(config) {
  await writeFile(localConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function main() {
  const config = await readLocalConfig();
  const driveFolderId = config.driveFolderId?.trim() || "";
  const driveRootFolderId = config.driveRootFolderId?.trim() || "";

  if (!driveFolderId) {
    throw new Error("Falta driveFolderId en terra-viva.publisher.local.json.");
  }

  if (!process.env.GOOGLE_DRIVE_ACCESS_TOKEN && config.googleDriveAccessToken) {
    process.env.GOOGLE_DRIVE_ACCESS_TOKEN = config.googleDriveAccessToken;
  }

  const rootFolderId = await resolveTerraVivaRootFolderId(
    driveFolderId,
    driveRootFolderId
  );
  const rootFolder = await getFile(rootFolderId);
  const layout = await ensureTerraVivaFolderLayout({
    inboxFolderId: driveFolderId,
    rootFolderId
  });

  const rootChildren = await listFolderChildren(layout.rootFolderId);
  const moved = [];
  const trashed = [];

  for (const child of rootChildren) {
    if (child.id === layout.inboxFolder.id) {
      continue;
    }

    if (child.mimeType?.startsWith("video/")) {
      await moveDriveItemToFolder(child.id, layout.inboxFolder.id, layout.rootFolderId);
      moved.push(`${child.name} -> ${INBOX_FOLDER_NAME}`);
      continue;
    }

    if (
      child.mimeType === "application/vnd.google-apps.folder" &&
      looksLikeProcessedDateFolder(child.name)
    ) {
      const childItems = await listFolderChildren(child.id);

      if (childItems.length === 0) {
        await trashDriveFile(child.id);
        trashed.push(child.name);
      } else {
        await moveDriveItemToFolder(
          child.id,
          layout.processedRootFolder.id,
          layout.rootFolderId
        );
        moved.push(`${child.name} -> Procesados`);
      }
    }
  }

  const specialFolders = [
    { name: "Procesados", targetId: layout.processedRootFolder.id },
    { name: "Ordenes - Publicador Web", targetId: layout.ordersFolder.id },
    { name: "Estado - Publicador Web", targetId: layout.statusFolder.id }
  ];

  for (const entry of specialFolders) {
    const query = `trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = '${entry.name}'`;
    const matchingFolders = await listFoldersByQuery(query);

    for (const folder of matchingFolders) {
      if (folder.id === entry.targetId) {
        continue;
      }

      const childItems = await listFolderChildren(folder.id);
      for (const child of childItems) {
        await moveDriveItemToFolder(child.id, entry.targetId, folder.id);
        moved.push(`${child.name} -> ${entry.name}`);
      }

      await trashDriveFile(folder.id);
      trashed.push(entry.name);
    }
  }

  config.driveRootFolderId = layout.rootFolderId;
  config.driveFolderId = layout.inboxFolder.id;
  await writeLocalConfig(config);

  console.log(`Raiz Terra Viva: ${rootFolder.name} (${layout.rootFolderId})`);
  console.log(`Inbox activo: ${layout.inboxFolder.name} (${layout.inboxFolder.id})`);

  if (moved.length === 0) {
    console.log("No hubo elementos que mover.");
  } else {
    console.log("Movimientos realizados:");
    for (const item of moved) {
      console.log(`- ${item}`);
    }
  }

  if (trashed.length > 0) {
    console.log("Carpetas vacias eliminadas:");
    for (const item of trashed) {
      console.log(`- ${item}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
