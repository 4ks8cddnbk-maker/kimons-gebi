import type { MetadataRoute } from "next";

// Makes the site installable as a standalone "app" on the home screen.
// Tapping the installed icon launches it fullscreen, with no browser chrome —
// the phone becomes a real app on the guest's real phone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kimon — 23. Geburtstag",
    short_name: "Kimon",
    description: "Das geheime Telefon zu Kimons 23. Geburtstag.",
    start_url: "/fish-v2",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05080f",
    theme_color: "#0a1320",
    icons: [
      {
        src: "/fish-app-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/fish-app-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
