"use client";

export type AdminGateSession = {
  email: string;
  name?: string;
  picture?: string;
  expiresAt: string;
};

const ADMIN_GOOGLE_GATE_STORAGE_KEY = "terra-viva:admin-google-gate:v1";

export function readAdminGateSession(): AdminGateSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(ADMIN_GOOGLE_GATE_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AdminGateSession>;

    if (
      typeof parsed.email !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      window.localStorage.removeItem(ADMIN_GOOGLE_GATE_STORAGE_KEY);
      return null;
    }

    return {
      email: parsed.email,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      picture:
        typeof parsed.picture === "string" ? parsed.picture : undefined,
      expiresAt: parsed.expiresAt
    };
  } catch {
    window.localStorage.removeItem(ADMIN_GOOGLE_GATE_STORAGE_KEY);
    return null;
  }
}

export function writeAdminGateSession(session: AdminGateSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ADMIN_GOOGLE_GATE_STORAGE_KEY,
    JSON.stringify(session)
  );
}

export function clearAdminGateSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ADMIN_GOOGLE_GATE_STORAGE_KEY);
}

export function adminGateSessionHasExpired(expiresAt: string): boolean {
  const expiresAtMs = Date.parse(expiresAt);

  if (!Number.isFinite(expiresAtMs)) {
    return true;
  }

  return expiresAtMs <= Date.now();
}
