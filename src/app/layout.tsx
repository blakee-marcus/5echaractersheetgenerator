import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "5e Character Sheet Generator",
  description: "A lightweight engine for validating D&D 5e character data and generating fillable PDF character sheets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
