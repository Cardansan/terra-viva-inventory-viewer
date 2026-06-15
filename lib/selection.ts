import type { CatalogDay, TreeMoment } from "./catalogTypes";

export type SelectedMoment = {
  momentId: string;
  selectedAt?: string;
};

export type SelectionDecodeResult = {
  selectedIds: string[];
  missingCount: number;
};

export function getSelectionStorageKey(catalog: CatalogDay): string {
  return `selection:terra-viva:${catalog.date}`;
}

export function isMomentSelected(
  selectedIds: string[],
  momentId: string
): boolean {
  return selectedIds.includes(momentId);
}

export function addMomentToSelection(
  selectedIds: string[],
  moment: TreeMoment
): string[] {
  if (isMomentSelected(selectedIds, moment.id)) {
    return selectedIds;
  }

  return [...selectedIds, moment.id];
}

export function removeMomentFromSelection(
  selectedIds: string[],
  momentId: string
): string[] {
  return selectedIds.filter((id) => id !== momentId);
}

export function toggleMomentSelection(
  selectedIds: string[],
  moment: TreeMoment
): string[] {
  return isMomentSelected(selectedIds, moment.id)
    ? removeMomentFromSelection(selectedIds, moment.id)
    : addMomentToSelection(selectedIds, moment);
}

export function pruneSelectionToPublicMoments(
  selectedIds: string[],
  publicMoments: TreeMoment[]
): SelectionDecodeResult {
  const publicIds = new Set(publicMoments.map((moment) => moment.id));
  const uniqueIds = Array.from(new Set(selectedIds));
  const keptIds = uniqueIds.filter((id) => publicIds.has(id));

  return {
    selectedIds: keptIds,
    missingCount: uniqueIds.length - keptIds.length
  };
}

export function encodeSelectionToQuery(selectedIds: string[]): string {
  return selectedIds.map(encodeURIComponent).join(",");
}

export function decodeSelectionFromQuery(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((id) => {
      try {
        return decodeURIComponent(id).trim();
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export function getSelectedMoments(
  selectedIds: string[],
  publicMoments: TreeMoment[]
): TreeMoment[] {
  const momentsById = new Map(
    publicMoments.map((moment) => [moment.id, moment] as const)
  );

  return selectedIds
    .map((id) => momentsById.get(id))
    .filter((moment): moment is TreeMoment => Boolean(moment));
}

export function getPublicTreeNumber(
  publicMoments: TreeMoment[],
  momentId: string
): number {
  const index = publicMoments.findIndex((moment) => moment.id === momentId);

  return index >= 0 ? index + 1 : 0;
}

export function buildSelectionUrl(
  catalog: CatalogDay,
  selectedIds: string[],
  options?: {
    origin?: string;
    pathPrefix?: string;
  }
): string {
  const origin = options?.origin ?? "";
  const pathPrefix = options?.pathPrefix ?? "";
  const query = encodeSelectionToQuery(selectedIds);
  const path = `${pathPrefix}/catalog/${catalog.date}/`;

  return query ? `${origin}${path}?selection=${query}` : `${origin}${path}`;
}
