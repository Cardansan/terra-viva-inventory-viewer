"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogDay, TreeMoment } from "@/lib/catalogTypes";
import { assetPath } from "@/lib/assets";
import {
  createInitialAdminCatalogVersions,
  getApprovedCatalogDownloadName,
  getCatalogTransferPayload,
  isCatalogDay,
  loadAdminCatalogVersions,
  saveAdminCatalogVersions,
  stripUtf8Bom,
  type AdminCatalogVersion
} from "@/lib/adminCatalogPersistence";
import { AdminMomentList } from "./AdminMomentList";
import { AdminDriveWorkflowPanel } from "./AdminDriveWorkflowPanel";
import { AdminVideoUploadPanel } from "./AdminVideoUploadPanel";

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
      "Este backup volvera a ser el catalogo publicado para clientas. El catalogo actual se guardara como backup."
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

  function exportApprovedCatalog() {
    exportCatalog(activeCatalog, getApprovedCatalogDownloadName(activeCatalog));
    setTransferNotice(
      "Aprobacion guardada. En la laptop, corre 'Publicar catalogo' para subirla."
    );
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
        throw new Error("El archivo no tiene un catalogo valido.");
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
      setTransferNotice("Catalogo cargado en este navegador.");
    } catch (error) {
      setTransferNotice(
        error instanceof Error
          ? error.message
          : "No se pudo abrir el catalogo guardado."
      );
    }
  }

  function buildPublishCommandHint() {
    return `TerraViva - Publicar catalogo.cmd`;
  }

  function getVersionLabel(version: AdminCatalogVersion) {
    if (version.catalog.status === "draft") {
      return version.role === "active" ? "Borrador actual" : "Borrador";
    }

    if (version.role === "active") {
      return "Catalogo publicado";
    }

    const backupIndex =
      versions
        .filter((candidate) => candidate.role === "backup")
        .findIndex((candidate) => candidate.catalog.id === version.catalog.id) +
      1;

    return `Backup ${backupIndex}`;
  }

  const publishedClientViewHref = assetPath(
    `/catalog/${publishedVersion?.catalog.date || initialPublishedCatalog.date}/`
  );
  const draftReviewHref = draftVersion
    ? assetPath("/drafts/current/")
    : undefined;

  return (
    <main className="safe-bottom mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-6 lg:py-8">
      <header className="mb-5 rounded-lg bg-white p-5 shadow-soft ring-1 ring-terra-moss/20">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.20em] text-terra-clay">
            Terra Viva Admin
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-terra-ink sm:text-3xl">
            Editor de catalogo diario
          </h1>
          <p className="mt-2 text-base font-bold text-terra-ink/65">
            {activeCatalog.title}
          </p>
          <p className="mt-2 text-sm font-bold text-terra-ink/55">
            {isDraftActive
              ? "Borrador activo para revision antes de publicar."
              : "Catalogo publicado visible para clientas."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-terra-paper px-3 py-1 text-sm font-black text-terra-ink">
              Total: {activeCatalog.moments.length}
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
          <p className="mt-2 text-xs font-bold text-terra-ink/45">
            La revision principal sucede en esta lista. Las herramientas manuales quedan abajo para no estorbar en celular.
          </p>
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

      <AdminVideoUploadPanel />

      <section className="mb-4 rounded-lg bg-white p-4 shadow-soft ring-1 ring-terra-moss/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
              Aprobar publicacion
            </p>
            <h2 className="mt-1 text-xl font-black text-terra-ink">
              {isDraftActive
                ? "Borrador listo para revisar"
                : "No hay borrador nuevo para publicar"}
            </h2>
            <p className="mt-2 text-sm font-bold text-terra-ink/60">
              {isDraftActive
                ? `${activeCatalog.moments.length} momentos en borrador. Cuando este aprobado, se publica para clientas.`
                : `El catalogo publicado actual es ${initialPublishedCatalog.date}. Primero procesa un borrador nuevo para que aparezca aqui.`}
            </p>
            {initialDraftCatalog ? (
              <p className="mt-2 text-xs font-bold text-terra-ink/45">
                Borrador detectado: {initialDraftCatalog.date}
              </p>
            ) : null}
            {draftReviewHref ? (
              <a
                className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-terra-clay/30 bg-white px-4 text-sm font-black text-terra-ink"
                href={draftReviewHref}
              >
                Abrir borrador en linea
              </a>
            ) : null}
            {draftVersion || publishedVersion ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {draftVersion ? (
                  <button
                    className={`inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-black ${
                      selectedCatalog.id === draftVersion.catalog.id
                        ? "border-terra-clay bg-terra-paper text-terra-ink"
                        : "border-terra-moss/25 bg-white text-terra-ink"
                    }`}
                    onClick={() => setSelectedCatalogId(draftVersion.catalog.id)}
                    type="button"
                  >
                    Ver borrador
                  </button>
                ) : null}
                {publishedVersion ? (
                  <button
                    className={`inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-black ${
                      selectedCatalog.id === publishedVersion.catalog.id
                        ? "border-terra-leaf bg-green-50 text-green-900"
                        : "border-terra-moss/25 bg-white text-terra-ink"
                    }`}
                    onClick={() =>
                      setSelectedCatalogId(publishedVersion.catalog.id)
                    }
                    type="button"
                  >
                    Ver publicado
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {isDraftActive ? (
            <div className="w-full max-w-xl space-y-2">
              <button
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-terra-leaf px-5 text-base font-black text-white"
                onClick={exportApprovedCatalog}
                type="button"
              >
                Guardar aprobacion para publicar
              </button>
              <details className="rounded-lg bg-terra-paper/70 p-3">
                <summary className="cursor-pointer list-none text-xs font-black uppercase tracking-[0.12em] text-terra-clay">
                  Siguiente paso en la laptop
                </summary>
                <p className="mt-2 text-sm font-bold text-terra-ink/65">
                  Despues de guardar la aprobacion, corre el acceso directo o este comando en la laptop publicadora:
                </p>
                <code className="mt-2 block overflow-x-auto rounded-md bg-white p-3 text-xs font-bold text-terra-ink">
                  {buildPublishCommandHint()}
                </code>
              </details>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mb-4 rounded-lg bg-white p-3 shadow-soft ring-1 ring-terra-moss/20">
        <div
          aria-label="Catalogos publicados y backups"
          className="flex gap-2 overflow-x-auto pb-1"
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
                  ? "Borrador activo"
                  : "Catalogo publicado"
                : "Backup publicado"}
            </p>
            <h2 className="mt-1 text-xl font-black text-terra-ink">
              {selectedCatalog.title}
            </h2>
            <p className="mt-1 text-sm font-bold text-terra-ink/60">
              {selectedCatalog.videos.length} videos recibidos ·{" "}
              {selectedCatalog.moments.length} momentos detectados ·{" "}
              {selectedAvailableCount} disponibles · {selectedUnavailableCount}{" "}
              no disponibles
            </p>
          </div>

          {isViewingActive ? (
            <span
              className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-black uppercase tracking-[0.08em] text-white ${
                selectedCatalog.status === "draft"
                  ? "bg-terra-clay"
                  : "bg-terra-leaf"
              }`}
            >
              {selectedCatalog.status === "draft"
                ? "Borrador en revision"
                : "Catalogo publicado"}
            </span>
          ) : (
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-terra-clay px-5 text-sm font-black uppercase tracking-[0.08em] text-white shadow-sm transition hover:bg-terra-ink"
              onClick={() => restoreBackup(selectedCatalog.id)}
              type="button"
            >
              Restaurar este catalogo
            </button>
          )}
        </div>
      </section>

      <AdminMomentList
        moments={selectedCatalog.moments}
        onChangeMoment={updateMoment}
        readOnly={!isViewingActive}
      />

      <section className="mt-5 space-y-4 rounded-lg bg-white p-4 shadow-soft ring-1 ring-terra-moss/20">
        <a
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-terra-moss/30 bg-white px-5 text-base font-black text-terra-ink shadow-sm transition hover:bg-terra-paper sm:w-auto"
          href={publishedClientViewHref}
        >
          Vista de Cliente
        </a>

        <details className="rounded-lg border border-terra-moss/20 bg-terra-paper/45 p-4">
          <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
            Herramientas manuales
          </summary>
          <p className="mt-3 text-sm font-bold text-terra-ink/60">
            Estas opciones sirven como respaldo para mover una revision entre navegadores o laptops. No son necesarias para el uso diario desde el telefono.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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

