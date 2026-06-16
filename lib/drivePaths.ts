const DRIVE_ROOT_FOLDER = "Terra Viva";
const DRIVE_CATALOGS_FOLDER = "Catalogos";

export function getDriveCatalogFolderPath(date: string): string {
  return [DRIVE_ROOT_FOLDER, DRIVE_CATALOGS_FOLDER, date].join("/");
}

export function getDriveCatalogVideosFolderPath(date: string): string {
  return [getDriveCatalogFolderPath(date), "videos"].join("/");
}

export function getDriveCatalogProcessedFolderPath(date: string): string {
  return [getDriveCatalogFolderPath(date), "procesados"].join("/");
}
