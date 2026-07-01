export const DRIVE_SESSION_STORAGE_KEY = "terra-viva:drive-access-token";
export const DRIVE_INBOX_ID_STORAGE_KEY =
  "terra-viva:drive-inbox-folder-id";
export const DRIVE_SESSION_EXPIRES_AT_STORAGE_KEY =
  "terra-viva:drive-access-token-expires-at";
export const DRIVE_STATUS_STORAGE_KEY =
  "terra-viva:drive-publisher-statuses:v2";
export const DRIVE_PUBLISHER_SOURCE_SESSION_STORAGE_KEY =
  "terra-viva:drive-publisher-source-session-id:v1";
export const DRIVE_SESSION_UPDATED_EVENT = "terra-viva-drive-session-updated";

export type BrowserDriveSession = {
  accessToken: string;
  inboxFolderId: string;
  expiresAt: string;
};

function readStorageValue(storageKey: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(storageKey)?.trim() || "";
}

function writeStorageValue(storageKey: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const nextValue = value.trim();

  if (nextValue) {
    window.localStorage.setItem(storageKey, nextValue);
    return;
  }

  window.localStorage.removeItem(storageKey);
}

export function readBrowserDriveSession(): BrowserDriveSession {
  const expiresAt = readStorageValue(DRIVE_SESSION_EXPIRES_AT_STORAGE_KEY);
  const isExpired = tokenHasExpired(expiresAt);

  return {
    accessToken: isExpired ? "" : readStorageValue(DRIVE_SESSION_STORAGE_KEY),
    inboxFolderId: readStorageValue(DRIVE_INBOX_ID_STORAGE_KEY),
    expiresAt: isExpired ? "" : expiresAt
  };
}

export function writeBrowserDriveSession(session: BrowserDriveSession) {
  writeStorageValue(DRIVE_SESSION_STORAGE_KEY, session.accessToken);
  writeStorageValue(DRIVE_INBOX_ID_STORAGE_KEY, session.inboxFolderId);
  writeStorageValue(
    DRIVE_SESSION_EXPIRES_AT_STORAGE_KEY,
    session.expiresAt
  );
  notifyDriveSessionUpdated();
}

export function clearBrowserDriveSession() {
  writeBrowserDriveSession({
    accessToken: "",
    inboxFolderId: "",
    expiresAt: ""
  });
}

export function tokenHasExpired(expiresAt: string): boolean {
  if (!expiresAt) {
    return false;
  }

  const parsed = Date.parse(expiresAt);

  if (Number.isNaN(parsed)) {
    return false;
  }

  return parsed <= Date.now();
}

export function notifyDriveSessionUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(DRIVE_SESSION_UPDATED_EVENT));
}

export function getOrCreateDrivePublisherSourceSessionId(): string {
  const existingId = readStorageValue(DRIVE_PUBLISHER_SOURCE_SESSION_STORAGE_KEY);

  if (existingId) {
    return existingId;
  }

  const nextId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `session-${Date.now()}`;

  writeStorageValue(DRIVE_PUBLISHER_SOURCE_SESSION_STORAGE_KEY, nextId);
  return nextId;
}
