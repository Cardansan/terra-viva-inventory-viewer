import Link from "next/link";
import { CatalogViewer } from "@/components/CatalogViewer";
import { getAllCatalogDates, getCatalogByDate } from "@/lib/catalogRepository";

type CatalogPageProps = {
  params: {
    date: string;
  };
};

export function generateStaticParams() {
  return getAllCatalogDates().map((date) => ({
    date
  }));
}

export const dynamicParams = false;

export default function CatalogPage({ params }: CatalogPageProps) {
  const catalog = getCatalogByDate(params.date);

  if (!catalog || catalog.status !== "published") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
        <section className="rounded-lg border border-terra-moss/30 bg-white/80 p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-terra-clay">
            Terra Viva
          </p>
          <h1 className="mt-3 text-3xl font-bold text-terra-ink">
            Catalogo no disponible
          </h1>
          <p className="mt-3 text-lg text-terra-ink/75">
            El catalogo de esta fecha no esta publicado o no existe.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-terra-leaf px-6 text-lg font-bold text-white"
            href="/"
          >
            Ver catalogo actual
          </Link>
        </section>
      </main>
    );
  }

  return <CatalogViewer catalog={catalog} syncWithAdminStorage={false} />;
}
