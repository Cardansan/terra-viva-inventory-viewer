"use client";

import { useMemo, useState } from "react";
import type { CatalogDay, CatalogStatus, TreeMoment } from "@/lib/catalogTypes";
import { assetPath } from "@/lib/assets";
import { AdminMomentList } from "./AdminMomentList";

type AdminCatalogEditorProps = {
  initialCatalog: CatalogDay;
};

export function AdminCatalogEditor({ initialCatalog }: AdminCatalogEditorProps) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const availableCount = useMemo(
    () =>
      catalog.moments.filter((moment) => moment.status === "available").length,
    [catalog.moments]
  );
  const unavailableCount = useMemo(
    () =>
      catalog.moments.filter((moment) => moment.status !== "available").length,
    [catalog.moments]
  );

  function updateMoment(updatedMoment: TreeMoment) {
    setCatalog((current) => ({
      ...current,
      moments: current.moments.map((moment) =>
        moment.id === updatedMoment.id ? updatedMoment : moment
      )
    }));
  }

  function updateStatus(status: CatalogStatus) {
    setCatalog((current) => ({
      ...current,
      status
    }));
  }

  function addManualMoment() {
    const nextNumber =
      Math.max(0, ...catalog.moments.map((moment) => moment.treeNumber)) + 1;
    const firstVideo = catalog.videos[0];

    if (!firstVideo) {
      return;
    }

    const nextMoment: TreeMoment = {
      id: `local-moment-${Date.now()}`,
      catalogDayId: catalog.id,
      videoId: firstVideo.id,
      treeNumber: nextNumber,
      timestampSeconds: 0,
      thumbnailUrl: "/placeholder-tree.svg",
      sectionLabel: firstVideo.sectionLabel,
      status: "available"
    };

    setCatalog((current) => ({
      ...current,
      moments: [...current.moments, nextMoment]
    }));
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
              {catalog.title}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-terra-paper px-3 py-1 text-sm font-black text-terra-ink">
                Total: {catalog.moments.length}
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
          <div className="flex flex-wrap gap-2">
            <button
              className="min-h-12 rounded-lg bg-terra-leaf px-5 text-base font-black text-white"
              onClick={addManualMoment}
              type="button"
            >
              Agregar momento
            </button>
            <select
              aria-label="Estado de publicacion"
              className="min-h-12 rounded-lg border border-terra-moss/30 bg-terra-paper px-4 font-bold"
              onChange={(event) =>
                updateStatus(event.target.value as CatalogStatus)
              }
              value={catalog.status}
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
            <a
              className="inline-flex min-h-12 items-center rounded-lg border border-terra-moss/30 bg-white px-5 text-base font-black text-terra-ink"
              href={assetPath(`/catalog/${catalog.date}/`)}
            >
              Vista de Cliente
            </a>
          </div>
        </div>
      </header>

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        {catalog.videos.map((video) => (
          <article
            className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-terra-moss/20"
            key={video.id}
          >
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-terra-clay">
              Video {video.order}
            </p>
            <h2 className="mt-1 text-lg font-black text-terra-ink">
              {video.title}
            </h2>
            <p className="mt-1 text-sm font-bold text-terra-ink/65">
              Video proto local - reemplazar por carga real despues
            </p>
          </article>
        ))}
      </section>

      <AdminMomentList moments={catalog.moments} onChangeMoment={updateMoment} />
    </main>
  );
}
