export const DRIVE_SESSION_STORAGE_KEY = "terra-viva:drive-access-token";
export const DRIVE_INBOX_ID_STORAGE_KEY =
  "terra-viva:drive-inbox-folder-id";
export const DRIVE_STATUS_STORAGE_KEY = "terra-viva:drive-publisher-statuses";
export const DRIVE_SESSION_UPDATED_EVENT = "terra-viva-drive-session-updated";

export function notifyDriveSessionUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(DRIVE_SESSION_UPDATED_EVENT));
}
