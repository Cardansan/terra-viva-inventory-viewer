"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogDay, TreeMoment } from "@/lib/catalogTypes";
import { assetPath } from "@/lib/assets";
import {
  createInitialAdminCatalogVersions,
  getCatalogTransferPayload,
  isCatalogDay,
  loadAdminCatalogVersions,
  saveAdminCatalogVersions,
  stripUtf8Bom,
  type AdminCatalogVersion
} from "@/lib/adminCatalogPersistence";
import { AdminMomentList } from "./AdminMomentList";
import { AdminDriveWorkflowPanel } from "./AdminDriveWorkflowPanel";
import { AdminDriveSessionPanel } from "./AdminDriveSessionPanel";

type AdminCatalogEditorProps = {
  initialActiveCatalog: CatalogDay;
  initialBackupCatalogs: CatalogDay[];
  initialPublishedCatalog: CatalogDay;
  initialDraftCatalog?: CatalogDay;
};

export function AdminCatalogEditor({
  initialActiveCatalog,
  initialBackupCatalogs,
  initialPublishedCatalog,
  initialDraftCatalog
}: AdminCatalogEditorProps) {
  const initialVersions = useMemo(
    () =>
      createInitialAdminCatalogVersions(
        initialActiveCatalog,
        initialBackupCatalogs
      ),
    [initialActiveCatalog, initialBackupCatalogs]
  );
  const [versions, setVersions] =
    useState<AdminCatalogVersion[]>(initialVersions);
  const [selectedCatalogId, setSelectedCatalogId] = useState(
    initialActiveCatalog.id
  );
  const [hasLoadedStoredVersions, setHasLoadedStoredVersions] = useState(false);
  const [transferNotice, setTransferNotice] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const activeVersion = versions.find((version) => version.role === "active");
  const selectedVersion =
    versions.find((version) => version.catalog.id === selectedCatalogId) ??
    activeVersion ??
    versions[0];
  const draftVersion = versions.find(
    (version) => version.catalog.status === "draft"
  );
  const publishedVersion =
    versions.find(
      (version) =>
        version.catalog.status === "published" && version.role === "active"
    ) ?? versions.find((version) => version.catalog.status === "published");

  const activeCatalog = activeVersion?.catalog ?? selectedVersion.catalog;
  const selectedCatalog = selectedVersion.catalog;
  const isViewingActive = selectedVersion.role === "active";
  const isDraftActive = activeCatalog.status === "draft";

  const availableCount = useMemo(
    () =>
      activeCatalog.moments.filter((moment) => moment.status === "available")
        .length,
    [activeCatalog.moments]
  );
  const unavailableCount = useMemo(
    () =>
      activeCatalog.moments.filter((moment) => moment.status !== "available")
        .length,
    [activeCatalog.moments]
  );
  const selectedAvailableCount = useMemo(
    () =>
      selectedCatalog.moments.filter((moment) => moment.status === "available")
        .length,
    [selectedCatalog.moments]
  );
  const selectedUnavailableCount =
    selectedCatalog.moments.length - selectedAvailableCount;

  useEffect(() => {
    const storedVersions = loadAdminCatalogVersions(initialVersions);
    const publishedBackups = [
      initialPublishedCatalog,
      ...initialBackupCatalogs
    ].filter(
      (catalog, index, catalogs) =>
        catalogs.findIndex((candidate) => candidate.id === catalog.id) === index
    );
    const prioritizedVersions =
      initialDraftCatalog &&
      !storedVersions.some(
        (version) => version.catalog.id === initialDraftCatalog.id
      )
        ? createInitialAdminCatalogVersions(
            initialDraftCatalog,
            publishedBackups
          )
        : storedVersions;
    const storedActiveVersion =
      prioritizedVersions.find((version) => version.role === "active") ??
      prioritizedVersions[0];

    setVersions(prioritizedVersions);
    setSelectedCatalogId(storedActiveVersion.catalog.id);
    setHasLoadedStoredVersions(true);
  }, [
    initialBackupCatalogs,
    initialDraftCatalog,
    initialPublishedCatalog,
    initialVersions
  ]);

  useEffect(() => {
    if (!hasLoadedStoredVersions) {
      return;
    }

    saveAdminCatalogVersions(versions);
  }, [hasLoadedStoredVersions, versions]);

  function updateMoment(updatedMoment: TreeMoment) {
    if (!isViewingActive) {
      return;
    }

    setVersions((currentVersions) =>
      currentVersions.map((version) =>
        version.role === "active"
          ? {
              ...version,
              catalog: {
                ...version.catalog,
                moments: version.catalog.moments.map((moment) =>
                  moment.id === updatedMoment.id ? updatedMoment : moment
                )
              }
            }
          : version
      )
    );
  }

  function restoreBackup(catalogId: string) {
    const backupVersion = versions.find(
      (version) => version.catalog.id === catalogId && version.role === "backup"
    );

    if (!backupVersion || !activeVersion) {
      return;
    }

    const confirmed = window.confirm(
      "Esta versión volverá a ser el catálogo publicado. El catálogo actual quedará guardado como versión anterior."
    );

    if (!confirmed) {
      return;
    }

    setVersions((currentVersions) => {
      const currentActive = currentVersions.find(
        (version) => version.role === "active"
      );
      const selectedBackup = currentVersions.find(
        (version) =>
          version.catalog.id === catalogId && version.role === "backup"
      );

      if (!currentActive || !selectedBackup) {
        return currentVersions;
      }

      const remainingBackups = currentVersions.filter(
        (version) =>
          version.role === "backup" && version.catalog.id !== catalogId
      );

      return [
        { catalog: selectedBackup.catalog, role: "active" as const },
        { catalog: currentActive.catalog, role: "backup" as const },
        ...remainingBackups
      ].slice(0, 3);
    });
    setSelectedCatalogId(catalogId);
  }

  function exportCatalog(catalogToExport: CatalogDay, downloadName?: string) {
    if (typeof window === "undefined") {
      return;
    }

    const payload = getCatalogTransferPayload(catalogToExport);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = downloadName ?? `terra-viva-catalogo-${catalogToExport.date}.json`;
    link.click();

    window.URL.revokeObjectURL(downloadUrl);
    setTransferNotice("Archivo guardado para continuar el proceso.");
  }

  function exportActiveCatalog() {
    exportCatalog(activeCatalog);
  }

  function openImportPicker() {
    importInputRef.current?.click();
  }

  async function importCatalogFile(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const rawValue = stripUtf8Bom(await file.text());
      const parsed = JSON.parse(rawValue) as
        | { catalog?: unknown }
        | CatalogDay
        | unknown;
      const nextCatalog =
        parsed && typeof parsed === "object" && "catalog" in parsed
          ? parsed.catalog
          : parsed;

      if (!isCatalogDay(nextCatalog)) {
        throw new Error("El archivo no tiene un catálogo válido.");
      }

      setVersions((currentVersions) => {
        const currentActive =
          currentVersions.find((version) => version.role === "active") ??
          currentVersions[0];
        const remainingBackups = currentVersions.filter(
          (version) => version.role === "backup"
        );

        const nextBackupVersions = currentActive
          ? [{ catalog: currentActive.catalog, role: "backup" as const }]
          : [];

        return [
          {
            catalog: nextCatalog,
            role: "active" as const
          },
          ...nextBackupVersions,
          ...remainingBackups
        ].slice(0, 3);
      });
      setSelectedCatalogId(nextCatalog.id);
      setTransferNotice("Catálogo cargado en este navegador.");
    } catch (error) {
      setTransferNotice(
        error instanceof Error
          ? error.message
          : "No se pudo abrir el catálogo guardado."
      );
    }
  }

  function getVersionLabel(version: AdminCatalogVersion) {
    if (version.catalog.status === "draft") {
      return version.role === "active" ? "Borrador de hoy" : "Borrador";
    }

    if (version.role === "active") {
      return "Catálogo actual";
    }

    if (publishedVersion && version.catalog.id === publishedVersion.catalog.id) {
      return "Publicado";
    }

    const backupIndex =
      versions
        .filter((candidate) => candidate.role === "backup")
        .findIndex((candidate) => candidate.catalog.id === version.catalog.id) +
      1;

    return `Anterior ${backupIndex}`;
  }

  const publishedClientViewHref = assetPath(
    `/catalog/${publishedVersion?.catalog.date || initialPublishedCatalog.date}/`
  );

  return (
    <main className="safe-bottom mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-6 lg:py-8">
      <header className="mb-5 rounded-lg bg-white p-5 shadow-soft ring-1 ring-terra-moss/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-[0.20em] text-terra-clay">
              Terra Viva Admin
            </p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-terra-ink sm:text-3xl">
              Revisión de catálogo
            </h1>
            <p className="mt-2 text-base font-bold text-terra-ink/65">
              {activeCatalog.title}
            </p>
            <p className="mt-2 text-sm font-bold text-terra-ink/55">
              {isDraftActive
                ? "Hoy estás revisando el borrador antes de publicarlo."
                : "Estás viendo el catálogo que ya está publicado."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-terra-paper px-3 py-1 text-sm font-black text-terra-ink">
                Árboles: {activeCatalog.moments.length}
              </span>
              <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-black text-green-800 ring-1 ring-green-700/20">
                Disponibles: {availableCount}
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-black text-stone-700 ring-1 ring-stone-500/20">
                <span className="sm:hidden">No disp.</span>
                <span className="hidden sm:inline">No disponibles</span>:{" "}
                {unavailableCount}
              </span>
            </div>
          </div>
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-terra-leaf px-4 text-sm font-black text-white shadow-sm transition hover:bg-terra-ink"
            href={publishedClientViewHref}
          >
            <span aria-hidden="true" className="text-base leading-none">
              ←
            </span>
            <span>Ver catálogo como clienta</span>
          </a>
        </div>
        {transferNotice ? (
          <p className="mt-3 text-sm font-bold text-terra-ink/65">
            {transferNotice}
          </p>
        ) : null}
      </header>

      <AdminDriveWorkflowPanel
        activeCatalog={activeCatalog}
        canPublishDraft={isDraftActive}
      />

      <section className="mb-4 overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-terra-moss/20">
        <div className="border-b border-terra-moss/15 px-4 py-4">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
            Elegir qué quieres revisar
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {draftVersion ? (
              <button
                className={`inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-base font-black ${
                  selectedCatalog.id === draftVersion.catalog.id
                    ? "bg-terra-clay text-white"
                    : "bg-terra-paper text-terra-ink ring-1 ring-terra-clay/20"
                }`}
                onClick={() => setSelectedCatalogId(draftVersion.catalog.id)}
                type="button"
              >
                {selectedCatalog.id === draftVersion.catalog.id
                  ? "Revisando borrador"
                  : "Revisar borrador"}
              </button>
            ) : null}
            {publishedVersion ? (
              <button
                className={`inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-base font-black ${
                  selectedCatalog.id === publishedVersion.catalog.id
                    ? "bg-terra-leaf text-white"
                    : "bg-white text-terra-ink ring-1 ring-terra-moss/20"
                }`}
                onClick={() => setSelectedCatalogId(publishedVersion.catalog.id)}
                type="button"
              >
                {selectedCatalog.id === publishedVersion.catalog.id
                  ? "Viendo catálogo actual"
                  : "Ver catálogo actual"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
            Lo que estás revisando
          </p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-terra-ink">
                {selectedCatalog.status === "draft"
                  ? "Borrador de hoy"
                  : isViewingActive
                    ? "Catálogo actual"
                    : "Catálogo anterior"}
              </h2>
              <p className="mt-1 text-sm font-bold text-terra-ink/60">
                {selectedCatalog.title}
              </p>
              <p className="mt-2 text-sm font-bold text-terra-ink/60">
                {selectedCatalog.moments.length} árboles detectados ·{" "}
                {selectedAvailableCount} visibles · {selectedUnavailableCount} no
                visibles
              </p>
              <p className="mt-2 text-sm font-bold text-terra-ink/55">
                {selectedCatalog.status === "draft"
                  ? "Marca aquí qué árboles se muestran antes de publicar."
                  : isViewingActive
                    ? "Esta es la versión publicada que ven las clientas."
                    : "Esta versión es solo de consulta mientras comparas cambios."}
              </p>
            </div>

            <span
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-black ${
                selectedCatalog.status === "draft"
                  ? "bg-terra-paper text-terra-clay"
                  : isViewingActive
                    ? "bg-green-50 text-terra-leaf ring-1 ring-green-700/15"
                    : "bg-stone-100 text-stone-700 ring-1 ring-stone-500/15"
              }`}
            >
              {selectedCatalog.status === "draft"
                ? "Editando borrador"
                : isViewingActive
                  ? "Publicado"
                  : "Solo lectura"}
            </span>
          </div>
        </div>

        <AdminMomentList
          embedded
          moments={selectedCatalog.moments}
          onChangeMoment={updateMoment}
          readOnly={!isViewingActive}
        />
      </section>

      <section className="mt-5 rounded-lg bg-white p-4 shadow-soft ring-1 ring-terra-moss/20">
        <details className="rounded-lg border border-terra-moss/20 bg-terra-paper/35">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
            <span>Historial y soporte</span>
            <span
              aria-hidden="true"
              className="text-base font-black text-terra-ink/55"
            >
              ▾
            </span>
          </summary>
          <div className="space-y-5 border-t border-terra-moss/15 px-4 py-4">
            <p className="text-sm font-bold text-terra-ink/60">
              Aquí quedan las opciones menos frecuentes: comparar versiones
              anteriores, recuperar una versión vieja o usar respaldos locales.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-terra-moss/30 bg-white px-4 text-sm font-black text-terra-ink"
                onClick={exportActiveCatalog}
                type="button"
              >
                Guardar respaldo local
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-terra-moss/30 bg-white px-4 text-sm font-black text-terra-ink"
                onClick={openImportPicker}
                type="button"
              >
                Abrir respaldo local
              </button>
            </div>

            <section className="rounded-lg bg-white p-3 ring-1 ring-terra-moss/15">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
                Historial de catálogos
              </p>
              <div
                aria-label="Historial de catálogos"
                className="mt-3 flex gap-2 overflow-x-auto pb-1"
                role="tablist"
              >
                {versions.map((version) => {
                  const isSelected = selectedCatalog.id === version.catalog.id;
                  const label = getVersionLabel(version);

                  return (
                    <button
                      aria-selected={isSelected}
                      className={`shrink-0 rounded-lg border px-4 py-3 text-left text-sm font-black transition ${
                        isSelected
                          ? "border-terra-leaf bg-green-50 text-green-900"
                          : "border-terra-moss/25 bg-terra-paper/70 text-terra-ink hover:bg-white"
                      }`}
                      key={version.catalog.id}
                      onClick={() => setSelectedCatalogId(version.catalog.id)}
                      role="tab"
                      type="button"
                    >
                      <span className="block">{label}</span>
                      <span className="block text-xs font-bold text-terra-ink/55">
                        {version.catalog.date}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-terra-moss/15 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-terra-clay">
                    {isViewingActive
                      ? selectedCatalog.status === "draft"
                        ? "Borrador de hoy"
                        : "Catálogo actual"
                      : "Versión anterior"}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-terra-ink">
                    {selectedCatalog.title}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-terra-ink/60">
                    {selectedCatalog.videos.length} videos recibidos ·{" "}
                    {selectedCatalog.moments.length} árboles detectados ·{" "}
                    {selectedAvailableCount} visibles · {selectedUnavailableCount}{" "}
                    no visibles
                  </p>
                </div>

                {isViewingActive ? (
                  <span
                    className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-black ${
                      selectedCatalog.status === "draft"
                        ? "bg-terra-paper text-terra-clay"
                        : "bg-green-50 text-terra-leaf ring-1 ring-green-700/15"
                    }`}
                  >
                    {selectedCatalog.status === "draft"
                      ? "Versión que estás editando"
                      : "Versión publicada"}
                  </span>
                ) : (
                  <button
                    className="inline-flex min-h-12 items-center justify-center rounded-lg bg-terra-clay px-5 text-sm font-black text-white shadow-sm transition hover:bg-terra-ink"
                    onClick={() => restoreBackup(selectedCatalog.id)}
                    type="button"
                  >
                    Usar esta versión otra vez
                  </button>
                )}
              </div>
            </section>

            <AdminDriveSessionPanel />
          </div>
        </details>
        <input
          accept="application/json"
          className="hidden"
          onChange={(event) => importCatalogFile(event.target.files?.[0] || null)}
          ref={importInputRef}
          type="file"
        />
      </section>
    </main>
  );
}

