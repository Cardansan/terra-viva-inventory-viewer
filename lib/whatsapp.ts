import type { CatalogDay, CatalogVideo, TreeMoment } from "./catalogTypes";
import { getPublicTreeNumber } from "./selection";
import { formatCatalogDate, formatTimestamp } from "./time";

const DEFAULT_WHATSAPP_NUMBER = "5212226181133";

export function getWhatsAppNumber(): string {
  return (
    process.env.NEXT_PUBLIC_TERRA_VIVA_WHATSAPP_NUMBER ||
    DEFAULT_WHATSAPP_NUMBER
  );
}

export function buildWhatsAppMessage(
  catalog: CatalogDay,
  video: CatalogVideo | undefined,
  moment: TreeMoment,
  displayTreeNumber = moment.treeNumber
): string {
  return [
    "Hola, me interesa este \u00e1rbol de Terra Viva:",
    `\u00c1rbol #${displayTreeNumber.toString().padStart(2, "0")}`,
    `Cat\u00e1logo: ${catalog.date}`,
    `Video: ${video?.title || moment.sectionLabel}`,
    `Tiempo: ${formatTimestamp(moment.timestampSeconds)}`,
    "\u00bfSigue disponible?"
  ].join("\n");
}

export function buildWhatsAppUrl(
  catalog: CatalogDay,
  video: CatalogVideo | undefined,
  moment: TreeMoment,
  displayTreeNumber?: number
): string {
  const number = getWhatsAppNumber();
  const message = buildWhatsAppMessage(
    catalog,
    video,
    moment,
    displayTreeNumber
  );

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildSelectionWhatsAppMessage(
  catalog: CatalogDay,
  selectedMoments: TreeMoment[],
  publicMoments: TreeMoment[],
  selectionUrl: string
): string {
  const isSingle = selectedMoments.length === 1;
  const numbers = selectedMoments
    .map((moment) => getPublicTreeNumber(publicMoments, moment.id))
    .filter((number) => number > 0)
    .map((number) => `#${number.toString().padStart(2, "0")}`)
    .join(", ");

  return [
    isSingle
      ? "Hola, me interesa este \u00e1rbol de Terra Viva:"
      : "Hola, me interesan estos \u00e1rboles de Terra Viva:",
    "",
    isSingle ? "\u00c1rbol seleccionado:" : "\u00c1rboles seleccionados:",
    numbers,
    "",
    `Cat\u00e1logo: ${formatCatalogDate(catalog.date)}`,
    "",
    "Ver selecci\u00f3n:",
    selectionUrl,
    "",
    isSingle ? "\u00bfSigue disponible?" : "\u00bfSiguen disponibles?"
  ].join("\n");
}

export function buildWhatsAppUrlForSelection(
  catalog: CatalogDay,
  selectedMoments: TreeMoment[],
  publicMoments: TreeMoment[],
  selectionUrl: string
): string {
  const number = getWhatsAppNumber();
  const message = buildSelectionWhatsAppMessage(
    catalog,
    selectedMoments,
    publicMoments,
    selectionUrl
  );

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
