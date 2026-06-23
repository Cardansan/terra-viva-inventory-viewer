"use client";

import { useState } from "react";
import type { TreeMoment, TreeMomentStatus } from "@/lib/catalogTypes";
import { formatTimestamp } from "@/lib/time";
import { StatusBadge } from "./StatusBadge";

type AdminMomentListProps = {
  moments: TreeMoment[];
  onChangeMoment: (moment: TreeMoment) => void;
  readOnly?: boolean;
};

const statusOptions: TreeMomentStatus[] = [
  "available",
  "reserved",
  "sold",
  "hidden"
];

const statusLabels: Record<TreeMomentStatus, string> = {
  available: "Disponible",
  reserved: "Apartado",
  sold: "Vendido",
  hidden: "Oculto"
};

export function AdminMomentList({
  moments,
  onChangeMoment,
  readOnly = false
}: AdminMomentListProps) {
  const [expandedMomentId, setExpandedMomentId] = useState<string | null>(null);
  const [previewMoment, setPreviewMoment] = useState<TreeMoment | null>(null);

  if (moments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-terra-moss/50 bg-white p-6 text-center">
        Este catalogo no tiene momentos todavia.
      </div>
    );
  }

  function setAvailability(moment: TreeMoment, isAvailable: boolean) {
    onChangeMoment({
      ...moment,
      status: isAvailable ? "available" : "hidden"
    });
  }

  return (
    <>
      <section className="overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-terra-moss/20">
        <div className="grid grid-cols-[54px_88px_minmax(112px,1fr)_70px] items-center gap-2 border-b border-terra-moss/15 bg-terra-paper px-2 py-3 text-xs font-black uppercase text-terra-ink/65 sm:grid-cols-[96px_116px_minmax(180px,1fr)_92px] sm:px-3 sm:text-sm sm:tracking-[0.10em]">
          <span>#</span>
          <span>
            <span className="sm:hidden">Foto</span>
            <span className="hidden sm:inline">Miniatura</span>
          </span>
          <span>{readOnly ? "Estado" : "Mostrar"}</span>
          <span className="text-center">{readOnly ? "Detalles" : "Editar"}</span>
        </div>

        <div className="divide-y divide-terra-moss/15">
          {moments.map((moment) => {
            const isExpanded = expandedMomentId === moment.id;
            const isAvailable = moment.status === "available";

            return (
              <article className="bg-white" key={moment.id}>
                <div className="grid grid-cols-[54px_88px_minmax(112px,1fr)_70px] items-center gap-2 px-2 py-3 sm:grid-cols-[96px_116px_minmax(180px,1fr)_92px] sm:px-3">
                  <div>
                    <p className="text-base font-black text-terra-ink sm:text-lg">
                      #{moment.treeNumber.toString().padStart(2, "0")}
                    </p>
                    <p className="text-xs font-bold text-terra-ink/55">
                      {formatTimestamp(moment.timestampSeconds)}
                    </p>
                  </div>

                  <button
                    aria-label={`Agrandar arbol ${moment.treeNumber}`}
                    className="h-14 w-20 overflow-hidden rounded-md bg-terra-paper shadow-sm ring-1 ring-terra-moss/20 focus:outline-none focus:ring-2 focus:ring-terra-clay sm:h-20 sm:w-24"
                    onClick={() => setPreviewMoment(moment)}
                    type="button"
                  >
                    <span
                      className="block h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${moment.thumbnailUrl})` }}
                    />
                  </button>

                  {readOnly ? (
                    <div className="flex min-h-14 flex-col justify-center gap-1 rounded-lg bg-terra-paper/70 px-2 py-2 sm:px-3">
                      <StatusBadge compact status={moment.status} />
                      <span className="truncate text-xs font-bold text-terra-ink/55">
                        {moment.sectionLabel}
                      </span>
                    </div>
                  ) : (
                    <label className="flex min-h-14 items-center gap-2 rounded-lg bg-terra-paper/70 px-2 py-2 sm:gap-3 sm:px-3">
                      <input
                        aria-label={`Disponible arbol ${moment.treeNumber}`}
                        checked={isAvailable}
                        className="h-7 w-7 shrink-0 accent-terra-leaf"
                        onChange={(event) =>
                          setAvailability(moment, event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-terra-ink sm:text-base">
                          Mostrar
                        </span>
                        <span className="hidden text-xs font-bold text-terra-ink/55 sm:block">
                          {isAvailable
                            ? "Si aparece a clientas"
                            : "No aparece a clientas"}
                        </span>
                      </span>
                    </label>
                  )}

                  <button
                    aria-expanded={isExpanded}
                    aria-label={`${
                      readOnly ? "Ver detalles del" : "Editar"
                    } arbol ${moment.treeNumber}`}
                    className="mx-auto inline-flex min-h-10 min-w-[64px] items-center justify-center rounded-lg border border-terra-moss/30 bg-white px-2 text-xs font-black text-terra-ink shadow-sm transition hover:bg-terra-paper sm:min-h-11 sm:min-w-[84px] sm:text-sm"
                    onClick={() =>
                      setExpandedMomentId(isExpanded ? null : moment.id)
                    }
                    type="button"
                  >
                    {readOnly ? "Ver" : "Editar"}
                  </button>
                </div>

                {isExpanded ? (
                  <AdminMomentAdvancedEditor
                    moment={moment}
                    onChangeMoment={onChangeMoment}
                    readOnly={readOnly}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {previewMoment ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-terra-ink/75 p-4"
          role="dialog"
        >
          <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-terra-clay">
                  Vista ampliada
                </p>
                <h2 className="text-2xl font-black text-terra-ink">
                  &Aacute;rbol #
                  {previewMoment.treeNumber.toString().padStart(2, "0")}
                </h2>
              </div>
              <button
                className="min-h-11 rounded-lg border border-terra-moss/30 px-4 text-base font-black text-terra-ink"
                onClick={() => setPreviewMoment(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>
            <img
              alt={`Miniatura ampliada del arbol ${previewMoment.treeNumber}`}
              className="max-h-[72vh] w-full rounded-lg object-contain"
              src={previewMoment.thumbnailUrl}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function AdminMomentAdvancedEditor({
  moment,
  onChangeMoment,
  readOnly
}: {
  moment: TreeMoment;
  onChangeMoment: (moment: TreeMoment) => void;
  readOnly: boolean;
}) {
  if (readOnly) {
    return (
      <div className="border-t border-terra-moss/15 bg-terra-paper/50 px-3 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-terra-clay">
            Detalles de esta version
          </p>
          <StatusBadge compact status={moment.status} />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-white p-3 ring-1 ring-terra-moss/15">
            <dt className="font-bold text-terra-ink/60">Numero</dt>
            <dd className="mt-1 font-black text-terra-ink">
              #{moment.treeNumber.toString().padStart(2, "0")}
            </dd>
          </div>
          <div className="rounded-md bg-white p-3 ring-1 ring-terra-moss/15">
            <dt className="font-bold text-terra-ink/60">Timestamp</dt>
            <dd className="mt-1 font-black text-terra-ink">
              {formatTimestamp(moment.timestampSeconds)}
            </dd>
          </div>
          <div className="rounded-md bg-white p-3 ring-1 ring-terra-moss/15">
            <dt className="font-bold text-terra-ink/60">Seccion</dt>
            <dd className="mt-1 font-black text-terra-ink">
              {moment.sectionLabel}
            </dd>
          </div>
          <div className="rounded-md bg-white p-3 ring-1 ring-terra-moss/15">
            <dt className="font-bold text-terra-ink/60">Notas</dt>
            <dd className="mt-1 font-black text-terra-ink">
              {moment.notes || "Sin notas"}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="border-t border-terra-moss/15 bg-terra-paper/50 px-3 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-terra-clay">
          Editar detalles
        </p>
        <StatusBadge compact status={moment.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1">
          <span className="text-sm font-bold text-terra-ink/70">Numero</span>
          <input
            className="min-h-11 w-full rounded-md border border-terra-moss/30 px-3"
            min={1}
            onChange={(event) =>
              onChangeMoment({
                ...moment,
                treeNumber: Number(event.target.value) || moment.treeNumber
              })
            }
            type="number"
            value={moment.treeNumber}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-bold text-terra-ink/70">
            Timestamp
          </span>
          <input
            className="min-h-11 w-full rounded-md border border-terra-moss/30 px-3"
            min={0}
            onChange={(event) =>
              onChangeMoment({
                ...moment,
                timestampSeconds:
                  Number(event.target.value) || moment.timestampSeconds
              })
            }
            type="number"
            value={moment.timestampSeconds}
          />
        </label>

        <label className="space-y-1 sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-bold text-terra-ink/70">Seccion</span>
          <input
            className="min-h-11 w-full rounded-md border border-terra-moss/30 px-3"
            onChange={(event) =>
              onChangeMoment({
                ...moment,
                sectionLabel: event.target.value
              })
            }
            type="text"
            value={moment.sectionLabel}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-bold text-terra-ink/70">Estado</span>
          <select
            className="min-h-11 w-full rounded-md border border-terra-moss/30 px-3"
            onChange={(event) =>
              onChangeMoment({
                ...moment,
                status: event.target.value as TreeMomentStatus
              })
            }
            value={moment.status}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-bold text-terra-ink/70">Notas</span>
          <input
            className="min-h-11 w-full rounded-md border border-terra-moss/30 px-3"
            onChange={(event) =>
              onChangeMoment({
                ...moment,
                notes: event.target.value
              })
            }
            placeholder="Opcional"
            type="text"
            value={moment.notes || ""}
          />
        </label>
      </div>
    </div>
  );
}
