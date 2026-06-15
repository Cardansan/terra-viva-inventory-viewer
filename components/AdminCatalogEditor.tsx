"use client";

import { useMemo, useState } from "react";
import type { CatalogDay, CatalogStatus, TreeMoment } from "@/lib/catalogTypes";
import { AdminMomentList } from "./AdminMomentList";

type AdminCatalogEditorProps = {
  initialCatalog: CatalogDay;
};

export function AdminCatalogEditor({ initialCatalog }: AdminCatalogEditorProps) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const visibleCount = useMemo(
    () => catalog.moments.filter((moment) => moment.status !== "hidden").length,
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
    <main className="safe-bottom mx-auto min-h-screen max-w-6xl px-4 py-4 sm:px-6 lg:py-8">
      <header className="mb-5 rounded-lg bg-white p-5 shadow-soft ring-1 ring-terra-moss/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.20em] text-terra-clay">
              Terra Viva Admin
            </p>
            <h1 className="mt-1 text-3xl font-black text-terra-ink">
              Editor de catalogo diario
            </h1>
            <p className="mt-2 text-base font-bold text-terra-ink/65">
              {catalog.title} · {catalog.moments.length} momentos ·{" "}
              {visibleCount} visibles
            </p>
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
              href={`/catalog/${catalog.date}`}
            >
              Ver publico
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
              Video proto local · reemplazar por carga real despues
            </p>
          </article>
        ))}
      </section>

      <AdminMomentList moments={catalog.moments} onChangeMoment={updateMoment} />
    </main>
  );
}
