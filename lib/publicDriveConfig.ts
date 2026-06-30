const DEFAULT_PUBLIC_DRIVE_CLIENT_ID =
  "562489851418-ua1amvc7f5tla254ihdsjua1rqhs0gg8.apps.googleusercontent.com";
const DEFAULT_PUBLIC_DRIVE_INBOX_FOLDER_ID = "1Ywmwu9HipEt0jmvQ6_hhzWBXq8AhykSC";

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
