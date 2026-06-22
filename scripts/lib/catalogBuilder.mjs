import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sectionFromVideoName, titleFromVideoName, toCatalogId, toMomentId, toVideoId } from "./fileNaming.mjs";

const DEFAULT_TREE_MOMENTS_PER_VIDEO = 9;
const DEFAULT_VIDEO_DURATION_SECONDS = 175;
const PLACEHOLDER_VIDEO_URL = "/videos/terra-viva-proto-inventory.mp4";
const PLACEHOLDER_THUMBNAIL_URL = "/placeholder-tree.svg";

function getCatalogAssetBasePath(date, workflow = "publish") {
  return workflow === "draft" ? `/catalog-drafts/${date}` : `/catalog/${date}`;
}

export function generateStableMomentIds(date, count) {
  return Array.from({ length: count }, (_, index) => toMomentId(date, index));
}

export function buildCatalogFromVideos({
  date,
  driveVideos,
  usePlaceholderMedia,
  workflow = "publish"
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
    order: index + 1
  }));

  const totalMoments = Math.max(videos.length * DEFAULT_TREE_MOMENTS_PER_VIDEO, videos.length);
  const stableIds = generateStableMomentIds(date, totalMoments);

  const moments = stableIds.map((id, index) => {
    const video = videos[Math.floor(index / DEFAULT_TREE_MOMENTS_PER_VIDEO)] || videos[0];
    const treeNumber = index + 1;

    return {
      id,
      catalogDayId,
      videoId: video.id,
      treeNumber,
      timestampSeconds: 6 + (index % DEFAULT_TREE_MOMENTS_PER_VIDEO) * 8,
      thumbnailUrl: usePlaceholderMedia
        ? PLACEHOLDER_THUMBNAIL_URL
        : `${assetBasePath}/thumbnails/tree-${String(treeNumber).padStart(3, "0")}.jpg`,
      sectionLabel: video.sectionLabel,
      status: "available",
      notes: "Generado automaticamente desde Drive Inbox; revisar disponibilidad en admin."
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
  workflow = "publish"
}) {
  const generatedCatalog = buildCatalogFromVideos({
    date,
    driveVideos,
    usePlaceholderMedia,
    workflow
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
      sectionLabel: adminVideo.sectionLabel || video.sectionLabel
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
