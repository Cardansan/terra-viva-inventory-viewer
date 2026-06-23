"use client";

import { useEffect, useState } from "react";

type DriveSessionResponse = {
  canAutoRefresh?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  message?: string;
  severity?: "info" | "warning" | "error";
};

export function AdminDriveSessionPanel() {
  const [sessionInfo, setSessionInfo] = useState<DriveSessionResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadSessionStatus();
  }, []);

  async function loadSessionStatus() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/drive-session", { cache: "no-store" });

      if (!response.ok) {
        setSessionInfo({
          severity: "error",
          message:
            "No se pudo revisar la conexion automatica de publicacion."
        });
        return;
      }

      const payload = (await response.json()) as DriveSessionResponse;
      setSessionInfo(payload);
    } catch {
      setSessionInfo({
        severity: "error",
        message: "No se pudo revisar la conexion automatica de publicacion."
      });
    } finally {
      setIsLoading(false);
    }
  }

  const severityStyles =
    sessionInfo?.severity === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : sessionInfo?.severity === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-terra-moss/20 bg-terra-paper/45 text-terra-ink";

  return (
    <section className="rounded-lg border border-terra-moss/20 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
            Conexion de publicacion
          </p>
          <p className="mt-2 text-sm font-bold text-terra-ink/60">
            Esta parte solo sirve cuando la publicacion automatica necesita apoyo.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-terra-moss/30 bg-white px-4 text-sm font-black text-terra-ink"
          onClick={() => void loadSessionStatus()}
          type="button"
        >
          Actualizar
        </button>
      </div>

      <div className={`mt-4 rounded-lg border px-4 py-4 text-sm font-bold ${severityStyles}`}>
        <p>
          {isLoading
            ? "Revisando el estado local de Drive..."
            : sessionInfo?.message || "No hay mensaje de estado disponible."}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <span className="rounded-lg bg-terra-paper px-3 py-2 text-xs font-black text-terra-ink">
          Acceso a Drive: {sessionInfo?.hasAccessToken ? "listo" : "pendiente"}
        </span>
        <span className="rounded-lg bg-terra-paper px-3 py-2 text-xs font-black text-terra-ink">
          Respaldo de acceso: {sessionInfo?.hasRefreshToken ? "listo" : "pendiente"}
        </span>
        <span className="rounded-lg bg-terra-paper px-3 py-2 text-xs font-black text-terra-ink">
          Renovacion automatica: {sessionInfo?.canAutoRefresh ? "activa" : "pendiente"}
        </span>
      </div>
    </section>
  );
}
