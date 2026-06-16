#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogFromVideos, updateCurrentCatalogJson, writeCatalogJson } from "./lib/catalogBuilder.mjs";
import { isDriveVideo, isWithinLookback, sortDriveVideos } from "./lib/dateFilters.mjs";
import { ensureProcessedFolder, listInboxVideos, moveFileToProcessed } from "./lib/driveClient.mjs";
import { generateThumbnailsForVideo } from "./lib/ffmpegThumbnails.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const localConfigPath = path.join(projectRoot, "terra-viva.publisher.local.json");

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

function toBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "si"].includes(String(value).toLowerCase());
}

async function readLocalConfig() {
  try {
    return JSON.parse(await readFile(localConfigPath, "utf8"));
  } catch {
    return {};
  }
}

function getLocalDateString() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function makePlaceholderDriveVideos(now = new Date()) {
  return [0, 1, 2].map((index) => {
    const createdTime = new Date(now.getTime() - (3 - index) * 60 * 60 * 1000).toISOString();
    return {
      id: `placeholder-drive-video-${index + 1}`,
      name: [`Mueble 1.mp4`, `Repisa central.mp4`, `Mesa chica.mp4`][index],
      mimeType: "video/mp4",
      createdTime,
      modifiedTime: createdTime,
      webViewLink: "",
      webContentLink: ""
    };
  });
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const config = await readLocalConfig();
  const driveFolderId = cli["drive-folder-id"] || config.driveFolderId;
  const lookbackHours = Number(cli["lookback-hours"] || config.lookbackHours || 24);
  const date = cli.date || (config.catalogDateMode === "today" ? getLocalDateString() : undefined) || getLocalDateString();
  const dryRun = toBoolean(cli["dry-run"], true);
  const moveProcessed = toBoolean(cli["move-processed"], Boolean(config.moveProcessed));
  const trashOld = toBoolean(cli["trash-old"], Boolean(config.trashOld));
  const usePlaceholderMedia = toBoolean(cli["use-placeholder-media"], false);
  const now = new Date();

  if (!driveFolderId && !usePlaceholderMedia) {
    throw new Error("Falta --drive-folder-id DRIVE_FOLDER_ID o --use-placeholder-media para prueba local.");
  }

  console.log(`Terra Viva publisher`);
  console.log(`Fecha de catalogo: ${date}`);
  console.log(`Lookback: ${lookbackHours} horas`);
  console.log(`Dry-run: ${dryRun}`);
  console.log(`Mover procesados: ${moveProcessed}`);
  console.log(`Depurar antiguos: ${trashOld}`);

  const inboxFiles = usePlaceholderMedia
    ? makePlaceholderDriveVideos(now)
    : await listInboxVideos(driveFolderId);

  const recentVideos = sortDriveVideos(
    inboxFiles.filter((file) => isDriveVideo(file) && isWithinLookback(file, lookbackHours, now))
  );

  if (recentVideos.length === 0) {
    throw new Error("No se encontraron videos subidos en las ultimas 24 horas en la carpeta Inbox.");
  }

  console.log(`Videos seleccionados (${recentVideos.length}):`);
  recentVideos.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} - ${file.createdTime || file.modifiedTime}`);
  });

  const catalog = buildCatalogFromVideos({ date, driveVideos: recentVideos, usePlaceholderMedia });

  if (dryRun) {
    console.log("Dry-run: no se escribiran catalogos ni se moveran archivos.");
    console.log(`Se generarian ${catalog.moments.length} momentos con IDs estables.`);
  } else {
    await generateThumbnailsForVideo({ dryRun, usePlaceholderMedia });
    const catalogPath = await writeCatalogJson({ catalog, projectRoot });
    const currentPath = await updateCurrentCatalogJson({ catalog, projectRoot });
    console.log(`Catalogo escrito: ${catalogPath}`);
    console.log(`Catalogo actual actualizado: ${currentPath}`);
  }

  if (moveProcessed && !dryRun) {
    const processedFolder = await ensureProcessedFolder(date, driveFolderId);
    for (const file of recentVideos) {
      await moveFileToProcessed(file.id, processedFolder.id, driveFolderId);
      console.log(`Movido a Procesados/${date}: ${file.name}`);
    }
  } else if (moveProcessed) {
    console.log(`Dry-run: se moverian ${recentVideos.length} videos a Procesados/${date}.`);
  }

  if (trashOld) {
    console.log("Retencion: scaffold preparado; correr primero en dry-run y conectar listProcessedCatalogFolders antes de depurar real.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
