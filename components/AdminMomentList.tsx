"use client";

import type { TreeMoment, TreeMomentStatus } from "@/lib/catalogTypes";
import { formatTimestamp } from "@/lib/time";
import { StatusBadge } from "./StatusBadge";

type AdminMomentListProps = {
  moments: TreeMoment[];
  onChangeMoment: (moment: TreeMoment) => void;
};

const statusOptions: TreeMomentStatus[] = [
  "available",
  "reserved",
  "sold",
  "hidden"
];

export function AdminMomentList({
  moments,
  onChangeMoment
}: AdminMomentListProps) {
  if (moments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-terra-moss/50 bg-white p-6 text-center">
        Este catalogo no tiene momentos todavia.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {moments.map((moment) => (
        <article
          className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-terra-moss/20"
          key={moment.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-black text-terra-ink">
                Árbol #{moment.treeNumber.toString().padStart(2, "0")}
              </p>
              <p className="text-sm font-bold text-terra-ink/60">
                {formatTimestamp(moment.timestampSeconds)}
              </p>
            </div>
            <StatusBadge compact status={moment.status} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1">
              <span className="text-sm font-bold text-terra-ink/70">
                Numero
              </span>
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
              <span className="text-sm font-bold text-terra-ink/70">
                Seccion
              </span>
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
              <span className="text-sm font-bold text-terra-ink/70">
                Estado
              </span>
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
                    {status}
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
        </article>
      ))}
    </div>
  );
}
