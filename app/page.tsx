import { redirect } from "next/navigation";
import { getLatestPublishedCatalog } from "@/lib/mockCatalogData";

export default function HomePage() {
  const catalog = getLatestPublishedCatalog();

  if (!catalog) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-terra-clay">
            Terra Viva
          </p>
          <h1 className="mt-3 text-3xl font-bold text-terra-ink">
            No hay catalogo publicado por ahora.
          </h1>
        </section>
      </main>
    );
  }

  redirect(`/catalog/${catalog.date}`);
}
