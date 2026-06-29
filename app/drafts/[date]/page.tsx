import Link from "next/link";
import { CatalogViewer } from "@/components/CatalogViewer";
import { getDraftCatalogByDate, getDraftCatalogDates } from "@/lib/catalogRepository";
import { buildNoIndexMetadata } from "@/lib/pageMetadata";
import { ADMIN_EDITOR_PATH } from "@/lib/sitePaths";

type DraftCatalogPageProps = {
  params: {
    date: string;
  };
};

export function generateStaticParams() {
  return getDraftCatalogDates().map((date) => ({
    date
  }));
}

export const dynamicParams = false;

export const metadata = buildNoIndexMetadata({
  title: "Borrador por fecha | Terra Viva",
  description: "Vista interna de un borrador Terra Viva por fecha."
});

export default function DraftCatalogPage({ params }: DraftCatalogPageProps) {
  const catalog = getDraftCatalogByDate(params.date);

  if (!catalog || catalog.status !== "draft") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
        <section className="rounded-lg border border-terra-moss/30 bg-white/80 p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-terra-clay">
            Terra Viva
          </p>
          <h1 className="mt-3 text-3xl font-bold text-terra-ink">
            Borrador no disponible
          </h1>
          <p className="mt-3 text-lg text-terra-ink/75">
            No existe un borrador en linea para esta fecha.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-terra-leaf px-6 text-lg font-bold text-white"
            href={ADMIN_EDITOR_PATH}
          >
            Volver a edicion
          </Link>
        </section>
      </main>
    );
  }

  return (
    <CatalogViewer
      catalog={catalog}
      syncWithAdminStorage={false}
      viewerMode="draftReview"
    />
  );
}
