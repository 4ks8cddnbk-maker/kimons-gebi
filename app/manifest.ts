import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ".fish",
    short_name: ".fish",
    description: ".fish for Friends only.",
    start_url: "/walls",
    scope: "/",
    display: "standalone",
    orientation: "any",
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
