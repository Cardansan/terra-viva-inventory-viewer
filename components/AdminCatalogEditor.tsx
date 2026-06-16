"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogDay, TreeMoment } from "@/lib/catalogTypes";
import { assetPath } from "@/lib/assets";
import {
  createInitialAdminCatalogVersions,
  loadAdminCatalogVersions,
  saveAdminCatalogVersions,
  type AdminCatalogVersion
} from "@/lib/adminCatalogPersistence";
import { AdminMomentList } from "./AdminMomentList";

type AdminCatalogEditorProps = {
  initialActiveCatalog: CatalogDay;
  initialBackupCatalogs: CatalogDay[];
};

export function AdminCatalogEditor({
  initialActiveCatalog,
  initialBackupCatalogs
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

  const activeVersion = versions.find((version) => version.role === "active");
  const selectedVersion =
    versions.find((version) => version.catalog.id === selectedCatalogId) ??
    activeVersion ??
    versions[0];

  const activeCatalog = activeVersion?.catalog ?? selectedVersion.catalog;
  const selectedCatalog = selectedVersion.catalog;
  const isViewingActive = selectedVersion.role === "active";

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
    const storedActiveVersion =
      storedVersions.find((version) => version.role === "active") ??
      storedVersions[0];

    setVersions(storedVersions);
    setSelectedCatalogId(storedActiveVersion.catalog.id);
    setHasLoadedStoredVersions(true);
  }, [initialVersions]);

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

  return (
    <main className="safe-bottom mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-6 lg:py-8">
      <header className="sticky top-0 z-30 mb-5 rounded-lg bg-white/95 p-5 shadow-soft ring-1 ring-terra-moss/20 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
              Cambios guardados en este navegador.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex min-h-12 items-center rounded-lg border border-terra-moss/30 bg-white px-5 text-base font-black text-terra-ink"
              href={assetPath(`/catalog/${activeCatalog.date}/`)}
            >
              Vista de Cliente
            </a>
          </div>
        </div>
      </header>

      <section className="mb-4 rounded-lg bg-white p-3 shadow-soft ring-1 ring-terra-moss/20">
        <div
          aria-label="Catalogos publicados y backups"
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
        >
          {versions.map((version) => {
            const isSelected = selectedCatalog.id === version.catalog.id;
            const backupIndex =
              version.role === "backup"
                ? versions
                    .filter((candidate) => candidate.role === "backup")
                    .findIndex(
                      (candidate) => candidate.catalog.id === version.catalog.id
                    ) + 1
                : 0;
            const label =
              version.role === "active"
                ? "Catalogo actual"
                : `Backup ${backupIndex}`;

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
              {isViewingActive ? "Catalogo publicado" : "Backup publicado"}
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
            <span className="inline-flex min-h-11 items-center justify-center rounded-lg bg-terra-leaf px-4 text-sm font-black uppercase tracking-[0.08em] text-white">
              Catalogo publicado
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
    </main>
  );
}
