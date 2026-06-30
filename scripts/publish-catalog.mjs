#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCatalogFromVideos,
  buildMomentTimestampsForVideo,
  copyDraftThumbnailsToPublishedCatalog,
  mergeAdminCatalogWithDriveVideos,
  publishApprovedCatalogFromAdmin,
  updateCurrentDraftCatalogJson,
  updateCurrentCatalogJson,
  writeDraftCatalogJson,
  writeCatalogJson
} from "./lib/catalogBuilder.mjs";
import {
  downloadDriveFile,
  ensureTerraVivaFolderLayout,
  ensureProcessedFolder,
  listInboxVideos,
  moveFileToProcessed
} from "./lib/driveClient.mjs";
import { dedupeMomentTimestamps } from "./lib/frameDedup.mjs";
import { isDriveVideo, sortDriveVideos } from "./lib/dateFilters.mjs";
import { generateThumbnailsForCatalog } from "./lib/ffmpegThumbnails.mjs";
import { probeVideoDurationSeconds } from "./lib/videoMetadata.mjs";
import { syncTerraVivaDrivePermissions } from "./lib/drivePermissions.mjs";

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

function toFiniteNumber(value, defaultValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function getWorkflowOutputDir(projectRoot, workflow, date) {
  return path.join(
    projectRoot,
    "public",
    workflow === "draft" ? "catalog-drafts" : "catalog",
    date
  );
}

function logDivider() {
  console.log("--------------------------------------------------");
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

async function writeThumbnailManifest({
  catalog,
  localWorkRoot,
  outputDir,
  videoPathsByVideoId
}) {
  await mkdir(localWorkRoot, { recursive: true });
  const manifestPath = path.join(localWorkRoot, "thumbnail-manifest.json");
  const payload = {
    catalogDate: catalog.date,
    generatedAt: new Date().toISOString(),
    outputDir,
    thumbnails: catalog.moments.map((moment) => ({
      momentId: moment.id,
      treeNumber: moment.treeNumber,
      timestampSeconds: moment.timestampSeconds,
      outputPath: path.join(
        outputDir,
        `tree-${String(moment.treeNumber).padStart(3, "0")}.jpg`
      ),
      videoPath: videoPathsByVideoId[moment.videoId] || ""
    }))
  };
  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return manifestPath;
}

function requireDriveConfigured(driveFolderId) {
  if (!driveFolderId) {
    throw new Error(
      [
        "Falta la carpeta de Drive del Inbox.",
        "Todavia no hemos conectado automaticamente Drive.",
        "Configura 'driveFolderId' en terra-viva.publisher.local.json o pasa --drive-folder-id."
      ].join(" ")
    );
  }
}

async function readLocalConfig() {
  try {
    return JSON.parse(await readFile(localConfigPath, "utf8"));
  } catch {
    return {};
  }
}

async function readAdminCatalogFile(filePath) {
  if (!filePath) {
    return null;
  }

  const rawValue = await readFile(path.resolve(projectRoot, filePath), "utf8");
  const parsed = JSON.parse(rawValue.replace(/^\uFEFF/, ""));

  if (parsed && typeof parsed === "object" && parsed.catalog) {
    return parsed.catalog;
  }

  return parsed;
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
  if (!process.env.GOOGLE_DRIVE_ACCESS_TOKEN && config.googleDriveAccessToken) {
    process.env.GOOGLE_DRIVE_ACCESS_TOKEN = config.googleDriveAccessToken;
  }
  if (!process.env.TERRA_VIVA_FFMPEG_PATH && config.ffmpegPath) {
    process.env.TERRA_VIVA_FFMPEG_PATH = path.resolve(projectRoot, config.ffmpegPath);
  }
  const driveFolderId = cli["drive-folder-id"] || config.driveFolderId;
  const driveRootFolderId = cli["drive-root-folder-id"] || config.driveRootFolderId;
  const dryRun = toBoolean(cli["dry-run"], true);
  const moveProcessed = toBoolean(cli["move-processed"], Boolean(config.moveProcessed));
  const trashOld = toBoolean(cli["trash-old"], Boolean(config.trashOld));
  const usePlaceholderMedia = toBoolean(cli["use-placeholder-media"], false);
  const adminCatalogFile = cli["catalog-input-file"] || config.catalogInputFile || "";
  const workflow = cli.workflow || config.workflow || "publish";
  const now = new Date();
  const verbose = toBoolean(cli.verbose, true);
  const runId = cli["run-id"] || now.toISOString().replace(/[:.]/g, "-");
  const thumbnailMode = cli["thumbnail-mode"] || config.thumbnailMode || "manifest";
  const maxVideosPerRun = toFiniteNumber(
    cli["max-videos"] ?? config.maxVideosPerRun,
    0
  );
  const momentGeneration = {
    startOffsetSeconds: toFiniteNumber(
      cli["moment-start-offset-seconds"] ?? config.momentStartOffsetSeconds,
      6
    ),
    intervalSeconds: toFiniteNumber(
      cli["moment-interval-seconds"] ?? config.momentIntervalSeconds,
      8
    ),
    endBufferSeconds: toFiniteNumber(
      cli["moment-end-buffer-seconds"] ?? config.momentEndBufferSeconds,
      12
    ),
    minMomentsPerVideo: toFiniteNumber(
      cli["min-moments-per-video"] ?? config.minMomentsPerVideo,
      6
    ),
    maxMomentsPerVideo: toFiniteNumber(
      cli["max-moments-per-video"] ?? config.maxMomentsPerVideo,
      24
    ),
    dedupeSampleSize: toFiniteNumber(
      cli["dedupe-sample-size"] ?? config.dedupeSampleSize,
      24
    ),
    dedupeSimilarityThreshold: toFiniteNumber(
      cli["dedupe-similarity-threshold"] ?? config.dedupeSimilarityThreshold,
      11
    ),
    dedupeMinGapSeconds: toFiniteNumber(
      cli["dedupe-min-gap-seconds"] ?? config.dedupeMinGapSeconds,
      1
    )
  };
  const adminCatalog = await readAdminCatalogFile(adminCatalogFile);
  const date =
    cli.date ||
    (workflow === "publish" && adminCatalog?.date) ||
    (config.catalogDateMode === "today" ? getLocalDateString() : undefined) ||
    getLocalDateString();
  const localWorkRoot = path.join(
    projectRoot,
    ".tools",
    "publisher-runtime",
    date,
    workflow,
    runId
  );
  const downloadsDir = path.join(localWorkRoot, "downloads");
  const workflowOutputDir = getWorkflowOutputDir(projectRoot, workflow, date);
  const thumbnailsDir = path.join(workflowOutputDir, "thumbnails");

  const needsDriveLookup = !usePlaceholderMedia && !(workflow === "publish" && adminCatalog);

  if (needsDriveLookup) {
    requireDriveConfigured(driveFolderId);
  }

  const driveLayout =
    !usePlaceholderMedia && driveFolderId
      ? await ensureTerraVivaFolderLayout({
          inboxFolderId: driveFolderId,
          rootFolderId: driveRootFolderId
        })
      : null;
  const resolvedDriveFolderId = driveLayout?.inboxFolder.id || driveFolderId;

  console.log(`Terra Viva publisher`);
  console.log(`Fecha de catalogo: ${date}`);
  console.log(`Dry-run: ${dryRun}`);
  console.log(`Mover procesados: ${moveProcessed}`);
  console.log(`Depurar antiguos: ${trashOld}`);
  console.log(`Modo: ${workflow}`);
  console.log(`Verbose: ${verbose}`);
  console.log(`Thumbnails: ${thumbnailMode}`);
  console.log(
    maxVideosPerRun > 0
      ? `Max videos por corrida: ${maxVideosPerRun}`
      : "Max videos por corrida: sin limite (todos los videos pendientes en Inbox)"
  );
  console.log(
    `Momentos por video: cada ~${momentGeneration.intervalSeconds}s desde ${momentGeneration.startOffsetSeconds}s hasta dejar ${momentGeneration.endBufferSeconds}s al final (min ${momentGeneration.minMomentsPerVideo}, max ${momentGeneration.maxMomentsPerVideo})`
  );
  console.log(
    `Deduplicacion visual: umbral ${momentGeneration.dedupeSimilarityThreshold}, muestra ${momentGeneration.dedupeSampleSize}x${momentGeneration.dedupeSampleSize}, gap minimo ${momentGeneration.dedupeMinGapSeconds}s`
  );
  console.log(
    adminCatalogFile
      ? `Catalogo admin cargado desde: ${adminCatalogFile}`
      : "Catalogo admin: se generara desde videos"
  );
  console.log(
    usePlaceholderMedia
      ? "Origen de medios: placeholder local"
      : `Origen de medios: Google Drive folder ${resolvedDriveFolderId}`
  );
  logDivider();

  const inboxFiles = usePlaceholderMedia
    ? makePlaceholderDriveVideos(now)
    : needsDriveLookup
      ? await listInboxVideos(resolvedDriveFolderId)
      : [];

  const pendingVideos = sortDriveVideos(
    inboxFiles.filter((file) => isDriveVideo(file))
  );
  const selectedVideos =
    maxVideosPerRun > 0
      ? pendingVideos.slice(0, maxVideosPerRun)
      : pendingVideos;

  if (needsDriveLookup && selectedVideos.length === 0) {
    throw new Error("No se encontraron videos pendientes en la carpeta Inbox de Drive.");
  }

  console.log(`Videos seleccionados (${selectedVideos.length}):`);
  selectedVideos.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} - ${file.createdTime || file.modifiedTime}`);
  });
  if (workflow === "publish" && adminCatalog && selectedVideos.length === 0) {
    console.log("Publicacion final desde aprobacion guardada; no se releera el Inbox para reconstruir el catalogo.");
  }
  logDivider();

  const downloadedVideoEntries = [];

  if (!usePlaceholderMedia && selectedVideos.length > 0) {
    console.log("Preparando descarga temporal de videos...");
    await mkdir(downloadsDir, { recursive: true });

    for (const [index, file] of selectedVideos.entries()) {
      const destination = path.join(
        downloadsDir,
        `${String(index + 1).padStart(2, "0")}-${sanitizeFileName(file.name)}`
      );
      console.log(`Descargando video ${index + 1}/${selectedVideos.length}: ${file.name}`);
      await downloadDriveFile(file.id, destination);
      const durationSeconds = probeVideoDurationSeconds(destination);
      downloadedVideoEntries.push({
        file,
        destination,
        durationSeconds
      });

      if (verbose) {
        console.log(`  Duracion real detectada: ${durationSeconds.toFixed(2)}s`);
      }
    }

    logDivider();
  }

  const driveVideosForCatalog =
    downloadedVideoEntries.length > 0
      ? downloadedVideoEntries.map(({ file, destination, durationSeconds }) => {
          const baseTimestamps = buildMomentTimestampsForVideo(
            durationSeconds,
            momentGeneration
          );
          let momentTimestamps = baseTimestamps;

          try {
            const dedupeResult = dedupeMomentTimestamps({
              filePath: destination,
              timestamps: baseTimestamps,
              sampleSize: momentGeneration.dedupeSampleSize,
              similarityThreshold: momentGeneration.dedupeSimilarityThreshold,
              minGapSeconds: momentGeneration.dedupeMinGapSeconds,
              verbose
            });
            momentTimestamps = dedupeResult.acceptedTimestamps;

            if (verbose) {
              console.log(
                `  ${file.name}: ${baseTimestamps.length} candidatos -> ${momentTimestamps.length} despues de deduplicar`
              );
            }
          } catch (error) {
            console.warn(
              `No se pudo deduplicar visualmente ${file.name}. Se conservaran timestamps base.`
            );
            if (verbose && error instanceof Error) {
              console.warn(`  Motivo: ${error.message}`);
            }
          }

          return {
            ...file,
            durationSeconds,
            momentTimestamps,
            localPath: destination
          };
        })
      : selectedVideos;

  const catalog = adminCatalog
    ? selectedVideos.length > 0
        ? mergeAdminCatalogWithDriveVideos({
          adminCatalog,
          date,
          driveVideos: driveVideosForCatalog,
          usePlaceholderMedia,
          workflow,
          momentGeneration
        })
      : publishApprovedCatalogFromAdmin({
          adminCatalog,
          date
        })
    : buildCatalogFromVideos({
        date,
        driveVideos: driveVideosForCatalog,
        usePlaceholderMedia,
        workflow,
        momentGeneration
      });
  const catalogToWrite = {
    ...catalog,
    status: workflow === "draft" ? "draft" : "published"
  };

  if (dryRun) {
    console.log("Dry-run: no se escribiran catalogos ni se moveran archivos.");
    console.log(`Se generarian ${catalogToWrite.moments.length} momentos con IDs estables.`);
    console.log(
      adminCatalog
        ? selectedVideos.length > 0
          ? "Se usaria el catalogo guardado del admin como base de publicacion."
          : "Se publicaria directamente el catalogo aprobado desde el borrador guardado."
        : "Se generaria un catalogo nuevo desde los videos del Inbox."
    );
    console.log(
      workflow === "draft"
        ? "La salida iria a public/catalog-drafts."
        : "La salida iria a public/catalog."
    );
  } else {
    const catalogPath =
      workflow === "draft"
        ? await writeDraftCatalogJson({ catalog: catalogToWrite, projectRoot })
        : await writeCatalogJson({ catalog: catalogToWrite, projectRoot });
    const currentPath =
      workflow === "draft"
        ? await updateCurrentDraftCatalogJson({
            catalog: catalogToWrite,
            projectRoot
          })
        : await updateCurrentCatalogJson({
            catalog: catalogToWrite,
            projectRoot
          });
    console.log(`Catalogo escrito: ${catalogPath}`);
    console.log(`Catalogo actual actualizado: ${currentPath}`);

    if (workflow === "publish" && adminCatalog && selectedVideos.length === 0) {
      const copiedThumbnails = await copyDraftThumbnailsToPublishedCatalog({
        catalog: catalogToWrite,
        projectRoot
      });
      console.log(`Miniaturas copiadas desde borrador: ${copiedThumbnails.length}`);
      logDivider();
    }

    if (!usePlaceholderMedia && selectedVideos.length > 0) {
      await rm(thumbnailsDir, { recursive: true, force: true });
      await mkdir(thumbnailsDir, { recursive: true });
      const videoPathsByVideoId = {};

      for (const [index, downloaded] of downloadedVideoEntries.entries()) {
        const catalogVideo = catalogToWrite.videos[index];
        videoPathsByVideoId[catalogVideo.id] = downloaded.destination;
      }

      const manifestPath = await writeThumbnailManifest({
        catalog: catalogToWrite,
        localWorkRoot,
        outputDir: thumbnailsDir,
        videoPathsByVideoId
      });
      console.log(`Manifest de thumbnails: ${manifestPath}`);

      if (thumbnailMode === "node") {
        await generateThumbnailsForCatalog({
          catalog: catalogToWrite,
          outputDir: thumbnailsDir,
          videoPathsByVideoId: new Map(Object.entries(videoPathsByVideoId)),
          verbose
        });
      } else {
        console.log("Generacion de thumbnails delegada al launcher local.");
      }
      logDivider();
    } else if (usePlaceholderMedia) {
      console.log("Modo placeholder: se conservaran thumbnails mock.");
      logDivider();
    }
  }

  if (workflow === "draft") {
    console.log(
      moveProcessed
        ? "Modo borrador: no se moveran videos a Procesados todavia."
        : "Modo borrador: videos se quedan en Inbox hasta publicar."
    );
  } else if (moveProcessed && !dryRun) {
    const filesToMove = selectedVideos.length > 0
      ? selectedVideos
      : catalogToWrite.videos
          .filter((video) => video.driveFileId)
          .map((video) => ({
            id: video.driveFileId,
            name: video.driveFileName || video.title
          }));

    if (filesToMove.length === 0) {
      console.log("No habia videos pendientes asociados para mover a Procesados.");
    } else {
      const processedFolder = await ensureProcessedFolder(
        date,
        resolvedDriveFolderId,
        driveLayout?.rootFolderId || driveRootFolderId
      );
      for (const file of filesToMove) {
        await moveFileToProcessed(file.id, processedFolder.id, resolvedDriveFolderId);
        console.log(`Movido a Procesados/${date}: ${file.name}`);
      }
    }
  } else if (moveProcessed && dryRun) {
    const moveCount =
      selectedVideos.length > 0
        ? selectedVideos.length
        : catalogToWrite.videos.filter((video) => video.driveFileId).length;
    console.log(`Dry-run: se moverian ${moveCount} videos a Procesados/${date}.`);
  } else if (workflow === "publish" && adminCatalog && !moveProcessed) {
    console.log("Publicacion final hecha desde aprobacion guardada; no se movieron videos de Inbox.");
  }

  if (!dryRun && workflow === "publish" && !usePlaceholderMedia) {
    const permissionResult = await syncTerraVivaDrivePermissions({
      projectRoot,
      config
    });
    console.log(
      `Permisos Drive sincronizados: ${permissionResult.publicVideoIds.length} videos publicados y ${permissionResult.restrictedItemsUpdated} elementos restringidos.`
    );
    if (permissionResult.publishedMissing.length > 0) {
      console.warn(
        `Aviso: faltan ${permissionResult.publishedMissing.length} videos publicados en Drive.`
      );
    }
  }

  if (trashOld) {
    console.log("Retencion: scaffold preparado; correr primero en dry-run y conectar listProcessedCatalogFolders antes de depurar real.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
