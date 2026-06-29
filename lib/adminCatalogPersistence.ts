import type { CatalogDay } from "./catalogTypes";

export type AdminCatalogVersion = {
  catalog: CatalogDay;
  role: "active" | "backup";
};

const ADMIN_CATALOG_HISTORY_STORAGE_KEY =
  "terra-viva:admin-catalog-history:v1";

const MAX_CATALOG_VERSIONS = 3;

export function createInitialAdminCatalogVersions(
  activeCatalog: CatalogDay,
  backupCatalogs: CatalogDay[]
): AdminCatalogVersion[] {
  return [
    { catalog: activeCatalog, role: "active" as const },
    ...backupCatalogs.map((catalog) => ({
      catalog,
      role: "backup" as const
    }))
  ].slice(0, MAX_CATALOG_VERSIONS);
}

export function reconcileAdminCatalogVersions(params: {
  storedVersions: AdminCatalogVersion[];
  initialPublishedCatalog: CatalogDay;
  initialBackupCatalogs: CatalogDay[];
  initialDraftCatalog?: CatalogDay;
}): AdminCatalogVersion[] {
  const {
    storedVersions,
    initialPublishedCatalog,
    initialBackupCatalogs,
    initialDraftCatalog
  } = params;

  const normalizedStored = normalizeAdminCatalogVersions(storedVersions, []);
  const storedDraft =
    normalizedStored.find(
      (version) =>
        version.catalog.status === "draft" &&
        (!initialDraftCatalog || version.catalog.id === initialDraftCatalog.id)
    )?.catalog ?? initialDraftCatalog;

  const activeCatalog = storedDraft || initialPublishedCatalog;
  const catalogsById = new Map<string, CatalogDay>();

  catalogsById.set(initialPublishedCatalog.id, initialPublishedCatalog);

  for (const catalog of initialBackupCatalogs) {
    if (catalog.status === "published") {
      catalogsById.set(catalog.id, catalog);
    }
  }

  for (const version of normalizedStored) {
    if (version.catalog.status === "published") {
      catalogsById.set(version.catalog.id, version.catalog);
    }
  }

  const backupCatalogs = Array.from(catalogsById.values())
    .filter((catalog) => catalog.id !== activeCatalog.id)
    .sort((left, right) => right.date.localeCompare(left.date));

  return createInitialAdminCatalogVersions(activeCatalog, backupCatalogs);
}

export function normalizeAdminCatalogVersions(
  versions: AdminCatalogVersion[],
  fallback: AdminCatalogVersion[]
): AdminCatalogVersion[] {
  if (!Array.isArray(versions) || versions.length === 0) {
    return fallback;
  }

  const activeVersion = versions.find((version) => version.role === "active");

  if (!activeVersion) {
    return fallback;
  }

  const backups = versions.filter(
    (version) =>
      version.role === "backup" && version.catalog.id !== activeVersion.catalog.id
  );

  return [activeVersion, ...backups].slice(0, MAX_CATALOG_VERSIONS);
}

export function loadAdminCatalogVersions(
  fallback: AdminCatalogVersion[]
): AdminCatalogVersion[] {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(
      ADMIN_CATALOG_HISTORY_STORAGE_KEY
    );

    if (!rawValue) {
      return fallback;
    }

    return normalizeAdminCatalogVersions(JSON.parse(rawValue), fallback);
  } catch {
    return fallback;
  }
}

export function saveAdminCatalogVersions(
  versions: AdminCatalogVersion[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ADMIN_CATALOG_HISTORY_STORAGE_KEY,
    JSON.stringify(versions)
  );
}

export function loadActiveAdminCatalog(
  fallbackCatalog: CatalogDay
): CatalogDay {
  const versions = loadAdminCatalogVersions([
    { catalog: fallbackCatalog, role: "active" as const }
  ]);

  return (
    versions.find((version) => version.role === "active")?.catalog ??
    fallbackCatalog
  );
}

export function isCatalogDay(value: unknown): value is CatalogDay {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CatalogDay>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.title === "string" &&
    (candidate.status === "draft" || candidate.status === "published") &&
    Array.isArray(candidate.videos) &&
    Array.isArray(candidate.moments)
  );
}

export function getCatalogTransferPayload(catalog: CatalogDay): {
  exportedAt: string;
  source: "terra-viva-admin";
  catalog: CatalogDay;
} {
  return {
    exportedAt: new Date().toISOString(),
    source: "terra-viva-admin",
    catalog
  };
}

export function getApprovedCatalogDownloadName(catalog: CatalogDay): string {
  return `terra-viva-aprobacion-${catalog.date}.json`;
}

export function stripUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
