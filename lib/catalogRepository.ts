import fs from "node:fs";
import path from "node:path";
import type { CatalogDay } from "./catalogTypes";
import {
  getAdminCatalogHistory as getMockAdminCatalogHistory,
  getLatestCatalogForAdmin as getMockLatestCatalogForAdmin,
  getLatestPublishedCatalog as getMockLatestPublishedCatalog,
  mockCatalogDays
} from "./mockCatalogData";
import { assetPath } from "./assets";

const generatedCatalogRoot = path.join(process.cwd(), "public", "catalog");

function normalizeAssetUrl(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//")) {
    return url;
  }

  return assetPath(url);
}

function normalizeGeneratedCatalog(catalog: CatalogDay): CatalogDay {
  return {
    ...catalog,
    videos: catalog.videos.map((video) => ({
      ...video,
      url: normalizeAssetUrl(video.url)
    })),
    moments: catalog.moments.map((moment) => ({
      ...moment,
      thumbnailUrl: normalizeAssetUrl(moment.thumbnailUrl)
    }))
  };
}

function readGeneratedCatalog(date: string): CatalogDay | undefined {
  const catalogPath = path.join(generatedCatalogRoot, date, "catalog.json");

  if (!fs.existsSync(catalogPath)) {
    return undefined;
  }

  try {
    return normalizeGeneratedCatalog(
      JSON.parse(fs.readFileSync(catalogPath, "utf8")) as CatalogDay
    );
  } catch {
    return undefined;
  }
}

export function getGeneratedCatalogDates(): string[] {
  if (!fs.existsSync(generatedCatalogRoot)) {
    return [];
  }

  return fs
    .readdirSync(generatedCatalogRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));
}

export function getAllCatalogDates(): string[] {
  return Array.from(
    new Set([
      ...getGeneratedCatalogDates(),
      ...mockCatalogDays.map((catalog) => catalog.date)
    ])
  ).sort((left, right) => right.localeCompare(left));
}

export function getCatalogByDate(date: string): CatalogDay | undefined {
  return readGeneratedCatalog(date) || mockCatalogDays.find((catalog) => catalog.date === date);
}

export function getLatestPublishedCatalog(): CatalogDay | undefined {
  const generated = getGeneratedCatalogDates()
    .map(readGeneratedCatalog)
    .find((catalog): catalog is CatalogDay => Boolean(catalog && catalog.status === "published"));

  return generated || getMockLatestPublishedCatalog();
}

export function getLatestCatalogForAdmin(): CatalogDay {
  return getLatestPublishedCatalog() || getMockLatestCatalogForAdmin();
}

export function getAdminCatalogHistory(): {
  activeCatalog: CatalogDay;
  backupCatalogs: CatalogDay[];
} {
  const activeCatalog = getLatestCatalogForAdmin();
  const generatedBackups = getGeneratedCatalogDates()
    .map(readGeneratedCatalog)
    .filter((catalog): catalog is CatalogDay => Boolean(catalog))
    .filter((catalog) => catalog.id !== activeCatalog.id)
    .slice(0, 2);

  if (generatedBackups.length > 0) {
    return {
      activeCatalog,
      backupCatalogs: generatedBackups
    };
  }

  return getMockAdminCatalogHistory();
}
