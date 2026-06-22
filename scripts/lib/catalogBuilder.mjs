import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { sectionFromVideoName, titleFromVideoName, toCatalogId, toMomentId, toVideoId } from "./fileNaming.mjs";

const DEFAULT_VIDEO_DURATION_SECONDS = 175;
const PLACEHOLDER_VIDEO_URL = "/videos/terra-viva-proto-inventory.mp4";
const PLACEHOLDER_THUMBNAIL_URL = "/placeholder-tree.svg";
const DEFAULT_MOMENT_GENERATION = Object.freeze({
  startOffsetSeconds: 6,
  intervalSeconds: 8,
  endBufferSeconds: 12,
  minMomentsPerVideo: 6,
  maxMomentsPerVideo: 24,
  dedupeSampleSize: 24,
  dedupeSimilarityThreshold: 11,
  dedupeMinGapSeconds: 1
});

function getCatalogAssetBasePath(date, workflow = "publish") {
  return workflow === "draft" ? `/catalog-drafts/${date}` : `/catalog/${date}`;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeMomentGenerationConfig(config = {}) {
  const startOffsetSeconds = toPositiveNumber(
    config.startOffsetSeconds,
    DEFAULT_MOMENT_GENERATION.startOffsetSeconds
  );
  const intervalSeconds = toPositiveNumber(
    config.intervalSeconds,
    DEFAULT_MOMENT_GENERATION.intervalSeconds
  );
  const endBufferSeconds = toPositiveNumber(
    config.endBufferSeconds,
    DEFAULT_MOMENT_GENERATION.endBufferSeconds
  );
  const minMomentsPerVideo = Math.max(
    1,
    Math.round(
      toPositiveNumber(
        config.minMomentsPerVideo,
        DEFAULT_MOMENT_GENERATION.minMomentsPerVideo
      )
    )
  );
  const maxMomentsPerVideo = Math.max(
    minMomentsPerVideo,
    Math.round(
      toPositiveNumber(
        config.maxMomentsPerVideo,
        DEFAULT_MOMENT_GENERATION.maxMomentsPerVideo
      )
    )
  );

  return {
    startOffsetSeconds,
    intervalSeconds,
    endBufferSeconds,
    minMomentsPerVideo,
    maxMomentsPerVideo,
    dedupeSampleSize: Math.max(
      8,
      Math.round(
        toPositiveNumber(
          config.dedupeSampleSize,
          DEFAULT_MOMENT_GENERATION.dedupeSampleSize
        )
      )
    ),
    dedupeSimilarityThreshold: toPositiveNumber(
      config.dedupeSimilarityThreshold,
      DEFAULT_MOMENT_GENERATION.dedupeSimilarityThreshold
    ),
    dedupeMinGapSeconds: toPositiveNumber(
      config.dedupeMinGapSeconds,
      DEFAULT_MOMENT_GENERATION.dedupeMinGapSeconds
    )
  };
}

export function buildMomentTimestampsForVideo(durationSeconds, rawConfig = {}) {
  const config = normalizeMomentGenerationConfig(rawConfig);
  const effectiveDuration = Math.max(
    durationSeconds || DEFAULT_VIDEO_DURATION_SECONDS,
    config.startOffsetSeconds + 1
  );
  const adaptiveEndBufferSeconds = Math.min(
    config.endBufferSeconds,
    Math.max(2, effectiveDuration * 0.2)
  );
  const firstTimestamp = Math.min(
    config.startOffsetSeconds,
    Math.max(0, effectiveDuration - 1)
  );
  const lastTimestamp = Math.max(
    firstTimestamp,
    effectiveDuration - adaptiveEndBufferSeconds
  );
  const usableRange = Math.max(0, lastTimestamp - firstTimestamp);
  const estimatedCount =
    Math.floor(usableRange / config.intervalSeconds) + 1;
  const maxFeasibleCount = Math.max(1, Math.floor(usableRange) + 1);
  const count = clamp(
    Math.max(estimatedCount, config.minMomentsPerVideo),
    1,
    Math.min(config.maxMomentsPerVideo, maxFeasibleCount)
  );

  if (count === 1) {
    return [Math.round(firstTimestamp)];
  }

  const step = usableRange / (count - 1);

  return Array.from({ length: count }, (_, index) =>
    Math.round(firstTimestamp + step * index)
  );
}

export function generateStableMomentIds(date, count) {
  return Array.from({ length: count }, (_, index) => toMomentId(date, index));
}

export function buildCatalogFromVideos({
  date,
  driveVideos,
  usePlaceholderMedia,
  workflow = "publish",
  momentGeneration
}) {
  const catalogDayId = toCatalogId(date);
  const assetBasePath = getCatalogAssetBasePath(date, workflow);

  const videos = driveVideos.map((file, index) => ({
    id: toVideoId(date, index),
    catalogDayId,
    title: titleFromVideoName(file.name, index),
    sectionLabel: sectionFromVideoName(file.name, index),
    url: usePlaceholderMedia
      ? PLACEHOLDER_VIDEO_URL
      : file.webContentLink || file.webViewLink || PLACEHOLDER_VIDEO_URL,
    durationSeconds: Number(file.durationSeconds || DEFAULT_VIDEO_DURATION_SECONDS),
    order: index + 1,
    driveFileId: file.id,
    driveFileName: file.name
  }));

  const generatedMoments = videos.flatMap((video) =>
    (Array.isArray(driveVideos[video.order - 1]?.momentTimestamps) &&
    driveVideos[video.order - 1].momentTimestamps.length > 0
      ? driveVideos[video.order - 1].momentTimestamps
      : buildMomentTimestampsForVideo(video.durationSeconds, momentGeneration)
    ).map(
      (timestampSeconds) => ({
        video,
        timestampSeconds
      })
    )
  );
  const stableIds = generateStableMomentIds(date, generatedMoments.length);

  const moments = generatedMoments.map(({ video, timestampSeconds }, index) => {
    const treeNumber = index + 1;

    return {
      id: stableIds[index],
      catalogDayId,
      videoId: video.id,
      treeNumber,
      timestampSeconds,
      thumbnailUrl: usePlaceholderMedia
        ? PLACEHOLDER_THUMBNAIL_URL
        : `${assetBasePath}/thumbnails/tree-${String(treeNumber).padStart(3, "0")}.jpg`,
      sectionLabel: video.sectionLabel,
      status: "available",
      notes:
        "Generado automaticamente desde Drive Inbox; revisar disponibilidad y timestamps en admin."
    };
  });

  return {
    id: catalogDayId,
    date,
    title: `Catalogo Terra Viva - ${date}`,
    status: "published",
    videos,
    moments
  };
}

export function mergeAdminCatalogWithDriveVideos({
  adminCatalog,
  date,
  driveVideos,
  usePlaceholderMedia,
  workflow = "publish",
  momentGeneration
}) {
  const generatedCatalog = buildCatalogFromVideos({
    date,
    driveVideos,
    usePlaceholderMedia,
    workflow,
    momentGeneration
  });
  const assetBasePath = getCatalogAssetBasePath(date, workflow);

  const videos = generatedCatalog.videos.map((video, index) => {
    const adminVideo = adminCatalog.videos[index];

    if (!adminVideo) {
      return video;
    }

    return {
      ...adminVideo,
      catalogDayId: generatedCatalog.id,
      url: video.url,
      durationSeconds: video.durationSeconds,
      order: index + 1,
      title: adminVideo.title || video.title,
      sectionLabel: adminVideo.sectionLabel || video.sectionLabel,
      driveFileId: video.driveFileId,
      driveFileName: video.driveFileName
    };
  });

  const fallbackVideoId = videos[0]?.id || generatedCatalog.videos[0]?.id || "";
  const adminVideoIdToOrder = new Map(
    adminCatalog.videos.map((video, index) => [video.id, index])
  );

  const moments = adminCatalog.moments.map((moment) => {
    const videoOrder = adminVideoIdToOrder.get(moment.videoId) ?? 0;
    const orderedVideo = videos[videoOrder];

    return {
      ...moment,
      catalogDayId: generatedCatalog.id,
      videoId: orderedVideo?.id || fallbackVideoId,
      sectionLabel: orderedVideo?.sectionLabel || moment.sectionLabel,
      thumbnailUrl: usePlaceholderMedia
        ? moment.thumbnailUrl || PLACEHOLDER_THUMBNAIL_URL
        : `${assetBasePath}/thumbnails/tree-${String(moment.treeNumber).padStart(3, "0")}.jpg`
    };
  });

  return {
    ...adminCatalog,
    id: generatedCatalog.id,
    date,
    status: "published",
    videos,
    moments
  };
}

export function publishApprovedCatalogFromAdmin({
  adminCatalog,
  date = adminCatalog.date
}) {
  const catalogDayId = toCatalogId(date);
  const assetBasePath = getCatalogAssetBasePath(date, "publish");

  const videos = adminCatalog.videos.map((video, index) => ({
    ...video,
    catalogDayId,
    order: index + 1
  }));

  const fallbackSectionLabel = videos[0]?.sectionLabel || "";

  const moments = adminCatalog.moments.map((moment) => ({
    ...moment,
    catalogDayId,
    videoId: moment.videoId,
    sectionLabel: moment.sectionLabel || fallbackSectionLabel,
    thumbnailUrl: `${assetBasePath}/thumbnails/tree-${String(moment.treeNumber).padStart(3, "0")}.jpg`
  }));

  return {
    ...adminCatalog,
    id: catalogDayId,
    date,
    status: "published",
    videos,
    moments
  };
}

export async function writeCatalogJson({ catalog, projectRoot }) {
  const catalogDir = path.join(projectRoot, "public", "catalog", catalog.date);
  await mkdir(path.join(catalogDir, "thumbnails"), { recursive: true });

  const catalogPath = path.join(catalogDir, "catalog.json");
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return catalogPath;
}

export async function writeDraftCatalogJson({ catalog, projectRoot }) {
  const catalogDir = path.join(
    projectRoot,
    "public",
    "catalog-drafts",
    catalog.date
  );
  await mkdir(path.join(catalogDir, "thumbnails"), { recursive: true });

  const catalogPath = path.join(catalogDir, "catalog.json");
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return catalogPath;
}

export async function updateCurrentCatalogJson({ catalog, projectRoot }) {
  const currentPath = path.join(projectRoot, "public", "catalog", "current-catalog.json");
  await mkdir(path.dirname(currentPath), { recursive: true });
  await writeFile(
    currentPath,
    `${JSON.stringify({ date: catalog.date, catalogPath: `/catalog/${catalog.date}/catalog.json` }, null, 2)}\n`,
    "utf8"
  );
  return currentPath;
}

export async function updateCurrentDraftCatalogJson({ catalog, projectRoot }) {
  const currentPath = path.join(
    projectRoot,
    "public",
    "catalog-drafts",
    "current-draft.json"
  );
  await mkdir(path.dirname(currentPath), { recursive: true });
  await writeFile(
    currentPath,
    `${JSON.stringify({ date: catalog.date, catalogPath: `/catalog-drafts/${catalog.date}/catalog.json` }, null, 2)}\n`,
    "utf8"
  );
  return currentPath;
}

export async function copyDraftThumbnailsToPublishedCatalog({
  catalog,
  projectRoot
}) {
  const sourceDir = path.join(
    projectRoot,
    "public",
    "catalog-drafts",
    catalog.date,
    "thumbnails"
  );
  const targetDir = path.join(
    projectRoot,
    "public",
    "catalog",
    catalog.date,
    "thumbnails"
  );

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const copiedFiles = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    await copyFile(sourcePath, targetPath);
    copiedFiles.push(targetPath);
  }

  return copiedFiles;
}
