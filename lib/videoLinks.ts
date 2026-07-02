import type { CatalogVideo } from "./catalogTypes";

function getVideoUrl(video: CatalogVideo | undefined): string {
  return video?.url?.trim() ?? "";
}

export function getGoogleDriveFileId(
  video: CatalogVideo | undefined
): string | undefined {
  if (video?.driveFileId) {
    return video.driveFileId;
  }

  const videoUrl = getVideoUrl(video);

  if (!videoUrl) {
    return undefined;
  }

  const idFromQuery = videoUrl.match(/[?&]id=([^&#]+)/i)?.[1];

  if (idFromQuery) {
    return decodeURIComponent(idFromQuery);
  }

  const idFromPath = videoUrl.match(/\/d\/([^/?#]+)/i)?.[1];

  if (idFromPath) {
    return decodeURIComponent(idFromPath);
  }

  return undefined;
}

export function getExternalVideoUrl(
  video: CatalogVideo | undefined
): string | undefined {
  const driveFileId = getGoogleDriveFileId(video);

  if (driveFileId) {
    return `https://drive.google.com/file/d/${encodeURIComponent(
      driveFileId
    )}/view`;
  }

  const videoUrl = getVideoUrl(video);

  return videoUrl || undefined;
}

export function canPlayVideoInline(
  video: CatalogVideo | undefined
): boolean {
  if (!video) {
    return false;
  }

  return !getGoogleDriveFileId(video);
}
