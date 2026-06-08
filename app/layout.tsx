import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kimons 23. Geburtstag",
  description: "Einladung zu Kimons 23. Geburtstag am 27.06.2026."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d7e5f8"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
