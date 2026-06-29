import type { Metadata } from "next";

export function buildNoIndexMetadata({
  title,
  description
}: {
  title: string;
  description: string;
}): Metadata {
  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        noarchive: true
      }
    }
  };
}

