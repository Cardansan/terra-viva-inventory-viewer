const DRIVE_ROOT_FOLDER = "Terra Viva Catalogue";
const DRIVE_INBOX_FOLDER = "Inbox - Videos por publicar";
const DRIVE_PROCESSED_FOLDER = "Procesados";
const DRIVE_WEB_ORDERS_FOLDER = "Ordenes - Publicador Web";
const DRIVE_WEB_STATUS_FOLDER = "Estado - Publicador Web";

export function getDriveInboxFolderPath(): string {
  return [DRIVE_ROOT_FOLDER, DRIVE_INBOX_FOLDER].join("/");
}

export function getDriveProcessedRootPath(): string {
  return [DRIVE_ROOT_FOLDER, DRIVE_PROCESSED_FOLDER].join("/");
}

export function getDriveCatalogProcessedFolderPath(date: string): string {
  return [getDriveProcessedRootPath(), date].join("/");
}

export function getDriveWebOrdersFolderPath(): string {
  return [DRIVE_ROOT_FOLDER, DRIVE_WEB_ORDERS_FOLDER].join("/");
}

export function getDriveWebStatusFolderPath(): string {
  return [DRIVE_ROOT_FOLDER, DRIVE_WEB_STATUS_FOLDER].join("/");
}
