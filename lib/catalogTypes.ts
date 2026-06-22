export type CatalogStatus = "draft" | "published";

export type TreeMomentStatus = "available" | "reserved" | "sold" | "hidden";

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CatalogVideo = {
  id: string;
  catalogDayId: string;
  title: string;
  sectionLabel: string;
  url: string;
  durationSeconds: number;
  order: number;
  driveFileId?: string;
  driveFileName?: string;
};

export type TreeMoment = {
  id: string;
  catalogDayId: string;
  videoId: string;
  treeNumber: number;
  timestampSeconds: number;
  thumbnailUrl: string;
  sectionLabel: string;
  status: TreeMomentStatus;
  notes?: string;
  crop?: CropRect;
};

export type CatalogDay = {
  id: string;
  date: string;
  title: string;
  status: CatalogStatus;
  videos: CatalogVideo[];
  moments: TreeMoment[];
};
