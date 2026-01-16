import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ruleta de la Suerte Algarve | FITUR 2026",
  description: "Participa en la Ruleta de la Suerte y gana premios increíbles del Algarve. Stand de Turismo del Algarve en FITUR 2026.",
  keywords: ["Algarve", "FITUR", "ruleta", "premios", "turismo", "Portugal"],
  authors: [{ name: "Turismo del Algarve" }],
  openGraph: {
    title: "Ruleta de la Suerte Algarve",
    description: "Gira la ruleta y gana experiencias únicas en el Algarve",
    type: "website",
    locale: "es_ES",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0077B6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
