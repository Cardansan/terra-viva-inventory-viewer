import Link from "next/link";
import { CatalogViewer } from "@/components/CatalogViewer";
import { getCurrentDraftCatalog } from "@/lib/catalogRepository";

export default function CurrentDraftCatalogPage() {
  const catalog = getCurrentDraftCatalog();

  if (!catalog || catalog.status !== "draft") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
        <section className="rounded-lg border border-terra-moss/30 bg-white/80 p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-terra-clay">
            Terra Viva
          </p>
          <h1 className="mt-3 text-3xl font-bold text-terra-ink">
            No hay borrador listo
          </h1>
          <p className="mt-3 text-lg text-terra-ink/75">
            Primero procesa un borrador nuevo para poder revisarlo en linea.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-terra-leaf px-6 text-lg font-bold text-white"
            href="/admin/"
          >
            Volver al admin
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
