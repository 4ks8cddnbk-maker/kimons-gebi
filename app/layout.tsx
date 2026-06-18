import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kimon",
  description: "Einladung zu Kimons 23. Geburtstag am 27.06.2026.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kimon"
  },
  icons: {
    icon: "/fish-app-icon.png",
    apple: "/fish-app-icon.png"
  },
  other: {
    // Legacy iOS still needs this to launch fullscreen from the home screen.
    "apple-mobile-web-app-capable": "yes"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a1320"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        {children}
        <footer className="global-contact-footer">
          <span>Kontakt / Impressum</span>
          <a href="mailto:management@kimon.fish">management@kimon.fish</a>
        </footer>
      </body>
    </html>
  );
}
