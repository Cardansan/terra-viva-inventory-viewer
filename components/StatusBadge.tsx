import type { TreeMomentStatus } from "@/lib/catalogTypes";

const statusStyles: Record<TreeMomentStatus, string> = {
  available: "border-green-700 bg-green-50 text-green-800",
  reserved: "border-amber-700 bg-amber-50 text-amber-900",
  sold: "border-rose-700 bg-rose-50 text-rose-800",
  hidden: "border-stone-500 bg-stone-100 text-stone-700"
};

const statusLabels: Record<TreeMomentStatus, string> = {
  available: "Disponible",
  reserved: "Apartado",
  sold: "Vendido",
  hidden: "Oculto"
};

type StatusBadgeProps = {
  status: TreeMomentStatus;
  compact?: boolean;
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-bold ${statusStyles[status]} ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      {statusLabels[status]}
    </span>
  );
}
