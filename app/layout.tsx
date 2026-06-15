import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra Viva Inventory Viewer",
  description: "Catálogo navegable de árboles de cuarzo Terra Viva."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
