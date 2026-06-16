const VIDEO_MIME_PREFIX = "video/";

export function getFileSortDate(file) {
  const value = file.createdTime || file.modifiedTime;
  return value ? new Date(value) : new Date(0);
}

export function isWithinLookback(file, lookbackHours, now = new Date()) {
  const sortDate = getFileSortDate(file);

  if (Number.isNaN(sortDate.getTime())) {
    return false;
  }

  const ageMs = now.getTime() - sortDate.getTime();
  return ageMs >= 0 && ageMs <= lookbackHours * 60 * 60 * 1000;
}

export function isDriveVideo(file) {
  return file.mimeType?.startsWith(VIDEO_MIME_PREFIX);
}

export function sortDriveVideos(files) {
  return [...files].sort((left, right) => {
    const dateDiff = getFileSortDate(left).getTime() - getFileSortDate(right).getTime();

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return String(left.name || "").localeCompare(String(right.name || ""));
  });
}
