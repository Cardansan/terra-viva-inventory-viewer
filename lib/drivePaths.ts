const DRIVE_ROOT_FOLDER = "Terra Viva";
const DRIVE_INBOX_FOLDER = "Inbox - Videos por publicar";
const DRIVE_PROCESSED_FOLDER = "Procesados";

export function getDriveInboxFolderPath(): string {
  return [DRIVE_ROOT_FOLDER, DRIVE_INBOX_FOLDER].join("/");
}

export function getDriveProcessedRootPath(): string {
  return [DRIVE_ROOT_FOLDER, DRIVE_PROCESSED_FOLDER].join("/");
}

export function getDriveCatalogProcessedFolderPath(date: string): string {
  return [getDriveProcessedRootPath(), date].join("/");
}
