import { getPublicDriveClientId } from "./publicDriveConfig";

const DEFAULT_ALLOWED_ADMIN_EMAILS = [
  "terravivapue@gmail.com",
  "carlos.d.san25@gmail.com"
] as const;

export function isAdminGoogleGateEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_GOOGLE_GATE?.trim().toLowerCase() ===
    "true"
  );
}

export function getPublicAdminGoogleGateClientId(): string {
  return (
    process.env.NEXT_PUBLIC_ADMIN_GOOGLE_GATE_CLIENT_ID?.trim() ||
    getPublicDriveClientId()
  );
}

export function getAllowedAdminGoogleGateEmails(): string[] {
  const rawValue = process.env.NEXT_PUBLIC_ADMIN_GOOGLE_GATE_ALLOWED_EMAILS?.trim();

  if (!rawValue) {
    return [...DEFAULT_ALLOWED_ADMIN_EMAILS];
  }

  const parsed = rawValue
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ADMIN_EMAILS];
}
