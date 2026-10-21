import type { Metadata, Viewport } from "next";
import { Cinzel, EB_Garamond, Inter } from "next/font/google";
import "./globals.css";

const displayFont = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const editorialFont = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-editorial",
});

const uiFont = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "5e Character Sheet Generator",
  description: "A lightweight engine for validating D&D 5e character data and generating fillable PDF character sheets.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${editorialFont.variable} ${uiFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}