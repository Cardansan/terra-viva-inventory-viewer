export function toCatalogId(date) {
  return `catalog-${date}`;
}

export function toMomentId(date, index) {
  return `moment-${date}-${String(index + 1).padStart(3, "0")}`;
}

export function toVideoId(date, index) {
  return `video-${date}-${String(index + 1).padStart(2, "0")}`;
}

export function titleFromVideoName(name, index) {
  const cleanName = String(name || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanName || /^vid(eo)?\s*\d*$/i.test(cleanName)) {
    return `Video ${index + 1}`;
  }

  return cleanName;
}

export function sectionFromVideoName(name, index) {
  const title = titleFromVideoName(name, index);
  return title === `Video ${index + 1}` ? title : title;
}
