import Link from "next/link";
import { getLatestPublishedCatalog } from "@/lib/catalogRepository";

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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-terra-clay">
          Terra Viva
        </p>
        <h1 className="mt-3 text-4xl font-bold text-terra-ink">
          Catálogo de Árboles
        </h1>
        <p className="mt-3 text-lg text-terra-ink/75">
          Abre el catálogo publicado más reciente.
        </p>
        <Link
          className="mt-6 inline-flex min-h-14 items-center justify-center rounded-lg bg-terra-leaf px-7 text-lg font-bold text-white shadow-soft"
          href={`/catalog/${catalog.date}`}
        >
          Ver catálogo actual
        </Link>
      </section>
    </main>
  );
}
