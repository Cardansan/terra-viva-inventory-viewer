const DEFAULT_PUBLIC_DRIVE_CLIENT_ID =
  "562489851418-4hh3di7q9pfjnhl8dnu9misune7rpodk.apps.googleusercontent.com";
const DEFAULT_PUBLIC_DRIVE_INBOX_FOLDER_ID = "13fN49fIdYxKot07q7EeC6IWKqCFjO7IQ";

export function getPublicDriveClientId(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID?.trim() ||
    DEFAULT_PUBLIC_DRIVE_CLIENT_ID
  );
}

export function getPublicDriveInboxFolderId(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_INBOX_FOLDER_ID?.trim() ||
    DEFAULT_PUBLIC_DRIVE_INBOX_FOLDER_ID
  );
}
