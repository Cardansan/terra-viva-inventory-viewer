import type { CatalogDay, CatalogVideo, TreeMoment } from "./catalogTypes";

export function getVisibleMoments(catalog: CatalogDay): TreeMoment[] {
  return catalog.moments
    .filter((moment) => moment.status !== "hidden")
    .sort((left, right) => left.treeNumber - right.treeNumber);
}

export function getVideoForMoment(
  catalog: CatalogDay,
  moment: TreeMoment
): CatalogVideo | undefined {
  return catalog.videos.find((video) => video.id === moment.videoId);
}

export function getMomentPosition(
  moments: TreeMoment[],
  selectedMomentId: string
): number {
  const index = moments.findIndex((moment) => moment.id === selectedMomentId);
  return index >= 0 ? index : 0;
}

export function getAdjacentMoment(
  moments: TreeMoment[],
  selectedMomentId: string,
  direction: "previous" | "next"
): TreeMoment | undefined {
  if (moments.length === 0) {
    return undefined;
  }

  const currentIndex = getMomentPosition(moments, selectedMomentId);
  const offset = direction === "next" ? 1 : -1;
  const nextIndex = (currentIndex + offset + moments.length) % moments.length;

  return moments[nextIndex];
}
