"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogDay } from "@/lib/catalogTypes";
import { loadActiveAdminCatalog } from "@/lib/adminCatalogPersistence";
import { assetPath } from "@/lib/assets";
import {
  buildSelectionUrl,
  decodeSelectionFromQuery,
  getPublicTreeNumber,
  getSelectedMoments,
  getSelectionStorageKey,
  isMomentSelected,
  pruneSelectionToPublicMoments,
  removeMomentFromSelection,
  toggleMomentSelection
} from "@/lib/selection";
import { formatCatalogDate } from "@/lib/time";
import {
  getAdjacentMoment,
  getMomentPosition,
  getPublicMoments,
  getVideoForMoment
} from "@/lib/videoMoments";
import { buildWhatsAppUrlForSelection } from "@/lib/whatsapp";
import { AddToSelectionButton } from "./AddToSelectionButton";
import { MomentNavigator } from "./MomentNavigator";
import { MomentThumbnailStrip } from "./MomentThumbnailStrip";
import { SelectionPanel } from "./SelectionPanel";
import { SelectionSummary } from "./SelectionSummary";
import { SendSelectionWhatsAppButton } from "./SendSelectionWhatsAppButton";
import { ShareCatalogButton } from "./ShareCatalogButton";
import { VideoMomentPlayer } from "./VideoMomentPlayer";

type CatalogViewerProps = {
  catalog: CatalogDay;
  syncWithAdminStorage?: boolean;
  viewerMode?: "public" | "draftReview";
};

export function CatalogViewer({
  catalog,
  syncWithAdminStorage = true,
  viewerMode = "public"
}: CatalogViewerProps) {
  const [resolvedCatalog, setResolvedCatalog] = useState(catalog);
  const visibleMoments = useMemo(
    () => getPublicMoments(resolvedCatalog),
    [resolvedCatalog]
  );
  const [selectedMomentId, setSelectedMomentId] = useState(
    visibleMoments[0]?.id || ""
  );
  const [selectedMomentIds, setSelectedMomentIds] = useState<string[]>([]);
  const [playRequest, setPlayRequest] = useState(0);
  const [selectionNotice, setSelectionNotice] = useState("");
  const [hasLoadedSelection, setHasLoadedSelection] = useState(false);
  const [isViewingSharedSelection, setIsViewingSharedSelection] =
    useState(false);
  const selectedMoment =
    visibleMoments.find((moment) => moment.id === selectedMomentId) ||
    visibleMoments[0];

  useEffect(() => {
    if (viewerMode !== "public" || !syncWithAdminStorage) {
      setResolvedCatalog(catalog);
      return;
    }

    setResolvedCatalog(loadActiveAdminCatalog(catalog));

    function syncCatalogFromAdminStorage(event: StorageEvent) {
      if (
        event.key !== "terra-viva:admin-catalog-history:v1" &&
        event.key !== null
      ) {
        return;
      }

      setResolvedCatalog(loadActiveAdminCatalog(catalog));
    }

    window.addEventListener("storage", syncCatalogFromAdminStorage);

    return () => {
      window.removeEventListener("storage", syncCatalogFromAdminStorage);
    };
  }, [catalog, syncWithAdminStorage, viewerMode]);

  useEffect(() => {
    const storageKey = getSelectionStorageKey(resolvedCatalog);
    const queryIds = decodeSelectionFromQuery(
      new URLSearchParams(window.location.search).get("selection")
    );

    if (queryIds.length > 0) {
      const result = pruneSelectionToPublicMoments(queryIds, visibleMoments);

      setSelectedMomentIds(result.selectedIds);
      window.localStorage.setItem(storageKey, JSON.stringify(result.selectedIds));
      setSelectionNotice(
        result.missingCount > 0
          ? "Algunos arboles de esta seleccion ya no estan disponibles."
          : "Seleccion actual del cliente/a."
      );
      setIsViewingSharedSelection(true);

      if (result.selectedIds[0]) {
        setSelectedMomentId(result.selectedIds[0]);
      }

      setHasLoadedSelection(true);
      return;
    }

    const storedSelection = window.localStorage.getItem(storageKey);

    if (!storedSelection) {
      setHasLoadedSelection(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedSelection);
      const storedIds = Array.isArray(parsed) ? parsed : [];
      const result = pruneSelectionToPublicMoments(storedIds, visibleMoments);

      setSelectedMomentIds(result.selectedIds);
      window.localStorage.setItem(storageKey, JSON.stringify(result.selectedIds));
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    setHasLoadedSelection(true);
  }, [resolvedCatalog, visibleMoments]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedSelection) {
      return;
    }

    window.localStorage.setItem(
      getSelectionStorageKey(resolvedCatalog),
      JSON.stringify(selectedMomentIds)
    );
  }, [resolvedCatalog, hasLoadedSelection, selectedMomentIds]);

  if (!selectedMoment) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
        <section className="rounded-lg border border-terra-moss/30 bg-white/85 p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-terra-clay">
            Terra Viva
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Cat&aacute;logo sin &aacute;rboles
          </h1>
          <p className="mt-3 text-lg text-terra-ink/75">
            Este catalogo existe, pero todavia no tiene momentos visibles.
          </p>
        </section>
      </main>
    );
  }

  const selectedVideo = getVideoForMoment(resolvedCatalog, selectedMoment);
  const selectedMoments = getSelectedMoments(selectedMomentIds, visibleMoments);
  const activeMoments =
    isViewingSharedSelection && selectedMoments.length > 0
      ? selectedMoments
      : visibleMoments;
  const selectedIndex = getMomentPosition(activeMoments, selectedMoment.id);
  const displayTreeNumber = getPublicTreeNumber(
    visibleMoments,
    selectedMoment.id
  );
  const currentLabel = isViewingSharedSelection
    ? `\u00c1rbol ${displayTreeNumber
        .toString()
        .padStart(2, "0")} \u00b7 selecci\u00f3n ${selectedIndex + 1} de ${
        activeMoments.length
      }`
    : `\u00c1rbol ${displayTreeNumber
        .toString()
        .padStart(2, "0")} de ${visibleMoments.length}`;
  const galleryMoments = isViewingSharedSelection
    ? selectedMoments
    : visibleMoments;
  const publicPathPrefix = assetPath("").replace(/\/$/, "");
  const currentMomentIsSelected = isMomentSelected(
    selectedMomentIds,
    selectedMoment.id
  );
  const selectionUrl =
    viewerMode === "public"
      ? buildSelectionUrl(resolvedCatalog, selectedMomentIds, {
          origin: typeof window !== "undefined" ? window.location.origin : "",
          pathPrefix: publicPathPrefix
        })
      : "";
  const selectionWhatsAppUrl =
    viewerMode === "public"
      ? buildWhatsAppUrlForSelection(
          resolvedCatalog,
          selectedMoments,
          visibleMoments,
          selectionUrl
        )
      : "";

  function selectAdjacent(direction: "previous" | "next") {
    const nextMoment = getAdjacentMoment(
      activeMoments,
      selectedMoment.id,
      direction
    );

    if (nextMoment) {
      setSelectedMomentId(nextMoment.id);
    }
  }

  function toggleCurrentMomentSelection() {
    setSelectionNotice("");
    setIsViewingSharedSelection(false);
    setSelectedMomentIds((current) =>
      toggleMomentSelection(current, selectedMoment)
    );
  }

  function removeSelectedMoment(momentId: string) {
    setSelectionNotice("");
    setIsViewingSharedSelection(false);
    setSelectedMomentIds((current) => removeMomentFromSelection(current, momentId));
  }

  function selectMomentFromThumbnail(momentId: string) {
    setSelectedMomentId(momentId);
  }

  return (
    <main className="safe-bottom mx-auto min-h-screen w-full max-w-6xl px-4 py-4 sm:px-6 lg:py-8">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.20em] text-terra-clay">
            Terra Viva
          </p>
          <h1 className="mt-1 text-2xl font-black text-terra-ink sm:text-4xl">
            Cat&aacute;logo de &Aacute;rboles
          </h1>
          <p className="mt-1 text-base font-bold text-terra-ink/65">
            {resolvedCatalog.date}
          </p>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          {viewerMode === "draftReview" ? (
            <section className="rounded-lg bg-[#ede7f6] px-4 py-4 text-center ring-1 ring-[#6b46a6]/20">
              <p className="text-base font-black text-[#4b2e83]">
                Borrador en revision
              </p>
              <p className="mt-1 text-sm font-bold text-[#4b2e83]/80">
                Esta vista es interna para revisar antes de publicar.
              </p>
            </section>
          ) : null}
          <VideoMomentPlayer
            moment={selectedMoment}
            playRequest={playRequest}
            video={selectedVideo}
          />
          <MomentNavigator
            currentLabel={currentLabel}
            onNext={() => selectAdjacent("next")}
            onPrevious={() => selectAdjacent("previous")}
          />
          {viewerMode === "draftReview" ? null : (
            <SelectionSummary count={selectedMomentIds.length} />
          )}
          {isViewingSharedSelection ? (
            <section className="rounded-lg bg-green-50 p-4 text-center ring-1 ring-green-700/20">
              <p className="text-base font-black text-green-900">
                Selecci&oacute;n actual del cliente/a
              </p>
              {selectionNotice &&
              selectionNotice !== "Seleccion actual del cliente/a." ? (
                <p className="mt-1 text-sm font-bold text-green-900/70">
                  {selectionNotice}
                </p>
              ) : null}
            </section>
          ) : selectionNotice ? (
            <p className="rounded-lg bg-white/80 p-3 text-center text-sm font-bold text-terra-ink/70 ring-1 ring-terra-moss/15">
              {selectionNotice}
            </p>
          ) : null}
          {viewerMode === "public" && !isViewingSharedSelection ? (
            <>
              <AddToSelectionButton
                isSelected={currentMomentIsSelected}
                onToggle={toggleCurrentMomentSelection}
              />
              <SendSelectionWhatsAppButton
                href={selectionWhatsAppUrl}
                selectedCount={selectedMomentIds.length}
              />
            </>
          ) : null}
          <button
            className="min-h-11 w-full rounded-lg border border-terra-moss/30 bg-white/80 px-4 text-base font-black text-terra-ink shadow-sm transition hover:bg-terra-paper"
            onClick={() => setPlayRequest((current) => current + 1)}
            type="button"
          >
            Ver video de este &aacute;rbol
          </button>
          {viewerMode === "public" ? (
            <SelectionPanel
              onRemove={removeSelectedMoment}
              publicMoments={visibleMoments}
              readOnly={isViewingSharedSelection}
              selectedMoments={selectedMoments}
              title={
                isViewingSharedSelection
                  ? "Selecci\u00f3n del cliente/a"
                  : "Mi selecci\u00f3n"
              }
            />
          ) : null}
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <MomentThumbnailStrip
            moments={galleryMoments}
            numberingMoments={visibleMoments}
            onSelectMoment={selectMomentFromThumbnail}
            selectedMomentId={selectedMoment.id}
            selectedMomentIds={selectedMomentIds}
            title={
              isViewingSharedSelection
                ? "Selecci\u00f3n del cliente/a"
                : "Todos los \u00c1rboles"
            }
          />
        </aside>
      </div>
      <footer className="mt-8 space-y-4 pb-6 text-center">
        <p className="text-sm font-bold text-terra-ink/60">
          Cat&aacute;logo actualizado: {formatCatalogDate(resolvedCatalog.date)}
        </p>
        {viewerMode === "public" ? (
          <ShareCatalogButton title={catalog.title} />
        ) : null}
      </footer>
    </main>
  );
}
