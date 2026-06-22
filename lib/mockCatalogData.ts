import type {
  CatalogDay,
  CatalogVideo,
  TreeMoment,
  TreeMomentStatus
} from "./catalogTypes";
import { assetPath } from "./assets";

const catalogId = "catalog-2026-06-14";

const protoInventoryVideoUrl = assetPath("/videos/terra-viva-proto-inventory.mp4");

const videos: CatalogVideo[] = [
  {
    id: "video-mueble-1",
    catalogDayId: catalogId,
    title: "Proto inventario - recorrido 1",
    sectionLabel: "Mueble 1",
    url: protoInventoryVideoUrl,
    durationSeconds: 175,
    order: 1
  },
  {
    id: "video-repisa-central",
    catalogDayId: catalogId,
    title: "Proto inventario - repisa central",
    sectionLabel: "Repisa central",
    url: protoInventoryVideoUrl,
    durationSeconds: 175,
    order: 2
  },
  {
    id: "video-mesa-chica",
    catalogDayId: catalogId,
    title: "Proto inventario - piezas especiales",
    sectionLabel: "Mesa chica",
    url: protoInventoryVideoUrl,
    durationSeconds: 175,
    order: 3
  }
];

const sections = [
  "Mueble 1 · Repisa superior",
  "Mueble 1 · Repisa media",
  "Repisa central · Lado izquierdo",
  "Repisa central · Lado derecho",
  "Mesa chica · Piezas especiales"
];

const statuses: TreeMomentStatus[] = [
  "available",
  "available",
  "available",
  "reserved",
  "available",
  "sold"
];

const videoIds = videos.map((video) => video.id);

const moments: TreeMoment[] = Array.from({ length: 27 }, (_, index) => {
  const treeNumber = index + 1;
  const videoId = videoIds[Math.floor(index / 9)] || videoIds[0];
  const timestampSeconds = 6 + index * 6;

  return {
    id: `moment-${treeNumber.toString().padStart(2, "0")}`,
    catalogDayId: catalogId,
    videoId,
    treeNumber,
    timestampSeconds,
    thumbnailUrl: assetPath(`/thumbnails/proto/tree-${treeNumber
      .toString()
      .padStart(2, "0")}.jpg`),
    sectionLabel: sections[index % sections.length],
    status: statuses[index % statuses.length],
    notes:
      index % 7 === 0
        ? "Pieza con brillo marcado; confirmar disponibilidad antes de apartar."
        : undefined,
    crop:
      index % 5 === 0
        ? {
            x: 20,
            y: 14,
            width: 58,
            height: 70
          }
        : undefined
  };
});

export const mockCatalogDays: CatalogDay[] = [
  {
    id: catalogId,
    date: "2026-06-14",
    title: "Catalogo Terra Viva - 14 de junio",
    status: "published",
    videos,
    moments
  },
  {
    id: "catalog-2026-06-13",
    date: "2026-06-13",
    title: "Backup Terra Viva - 13 de junio",
    status: "draft",
    videos: videos.map((video) => ({
      ...video,
      catalogDayId: "catalog-2026-06-13"
    })),
    moments: moments.slice(0, 18).map((moment, index) => ({
      ...moment,
      id: `backup-2026-06-13-${(index + 1).toString().padStart(2, "0")}`,
      catalogDayId: "catalog-2026-06-13",
      notes:
        index % 6 === 0
          ? "Version publicada anterior; conservar para posible restauracion."
          : moment.notes
    }))
  },
  {
    id: "catalog-2026-06-12",
    date: "2026-06-12",
    title: "Backup Terra Viva - 12 de junio",
    status: "draft",
    videos: videos.slice(0, 2).map((video) => ({
      ...video,
      catalogDayId: "catalog-2026-06-12"
    })),
    moments: moments.slice(0, 12).map((moment, index) => ({
      ...moment,
      id: `backup-2026-06-12-${(index + 1).toString().padStart(2, "0")}`,
      catalogDayId: "catalog-2026-06-12",
      treeNumber: index + 1,
      timestampSeconds: moment.timestampSeconds + 2,
      status: index % 5 === 0 ? "reserved" : moment.status,
      notes:
        index % 4 === 0
          ? "Backup publicado previo; revisar antes de restaurar."
          : undefined
    }))
  }
];

export function getAdminCatalogHistory(): {
  activeCatalog: CatalogDay;
  backupCatalogs: CatalogDay[];
} {
  const activeCatalog = getLatestPublishedCatalog() ?? getLatestCatalogForAdmin();
  const backupCatalogs = mockCatalogDays
    .filter((catalog) => catalog.id !== activeCatalog.id)
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 2);

  return {
    activeCatalog,
    backupCatalogs
  };
}

export function getCatalogByDate(date: string): CatalogDay | undefined {
  return mockCatalogDays.find((catalog) => catalog.date === date);
}

export function getLatestPublishedCatalog(): CatalogDay | undefined {
  return mockCatalogDays
    .filter((catalog) => catalog.status === "published")
    .sort((left, right) => right.date.localeCompare(left.date))[0];
}

export function getLatestCatalogForAdmin(): CatalogDay {
  return [...mockCatalogDays].sort((left, right) =>
    right.date.localeCompare(left.date)
  )[0];
}

