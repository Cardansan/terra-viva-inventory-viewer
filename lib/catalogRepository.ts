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
const generatedDraftRoot = path.join(process.cwd(), "public", "catalog-drafts");
const currentDraftPath = path.join(
  process.cwd(),
  "public",
  "catalog-drafts",
  "current-draft.json"
);

type CurrentDraftReference = {
  date: string;
  catalogPath: string;
};

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

function readCatalogFromRoot(
  rootPath: string,
  date: string
): CatalogDay | undefined {
  const catalogPath = path.join(rootPath, date, "catalog.json");

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

function readGeneratedCatalog(date: string): CatalogDay | undefined {
  return readCatalogFromRoot(generatedCatalogRoot, date);
}

function readDraftCatalog(date: string): CatalogDay | undefined {
  return readCatalogFromRoot(generatedDraftRoot, date);
}

function readCurrentDraftReference(): CurrentDraftReference | undefined {
  if (!fs.existsSync(currentDraftPath)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(currentDraftPath, "utf8")
    ) as Partial<CurrentDraftReference>;

    if (
      typeof parsed.date !== "string" ||
      typeof parsed.catalogPath !== "string"
    ) {
      return undefined;
    }

    return {
      date: parsed.date,
      catalogPath: parsed.catalogPath
    };
  } catch {
    return undefined;
  }
}

function getCatalogDatesFromRoot(rootPath: string): string[] {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));
}

export function getGeneratedCatalogDates(): string[] {
  return getCatalogDatesFromRoot(generatedCatalogRoot);
}

export function getDraftCatalogDates(): string[] {
  return getCatalogDatesFromRoot(generatedDraftRoot);
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

export function getDraftCatalogByDate(date: string): CatalogDay | undefined {
  return readDraftCatalog(date);
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

export function getLatestDraftCatalog(): CatalogDay | undefined {
  return getDraftCatalogDates()
    .map(readDraftCatalog)
    .find((catalog): catalog is CatalogDay => Boolean(catalog && catalog.status === "draft"));
}

export function getCurrentDraftCatalog(): CatalogDay | undefined {
  const reference = readCurrentDraftReference();

  if (!reference) {
    return getLatestDraftCatalog();
  }

  return readDraftCatalog(reference.date) || getLatestDraftCatalog();
}

export function getAdminCatalogHistory(): {
  activeCatalog: CatalogDay;
  backupCatalogs: CatalogDay[];
  publishedCatalog: CatalogDay;
  draftCatalog?: CatalogDay;
} {
  const publishedCatalog = getLatestCatalogForAdmin();
  const draftCatalog = getLatestDraftCatalog();
  const activeCatalog = draftCatalog ?? publishedCatalog;
  const generatedBackups = getGeneratedCatalogDates()
    .map(readGeneratedCatalog)
    .filter((catalog): catalog is CatalogDay => Boolean(catalog))
    .filter((catalog) => catalog.id !== publishedCatalog.id)
    .slice(0, 2);

  if (generatedBackups.length > 0) {
    return {
      activeCatalog,
      backupCatalogs: generatedBackups,
      publishedCatalog,
      draftCatalog
    };
  }

  const fallback = getMockAdminCatalogHistory();

  return {
    activeCatalog,
    backupCatalogs: fallback.backupCatalogs,
    publishedCatalog,
    draftCatalog
  };
}
