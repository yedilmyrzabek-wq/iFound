import type { MetadataRoute } from "next";

// Installable web app (FAQ Q40/Q87). No service worker on purpose: counters must always be live, never cached.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iFound — plans that only happen when enough people are in",
    short_name: "iFound",
    description: "Meet people in your new city, without showing up alone.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f1",
    theme_color: "#1b1c1f",
    categories: ["social", "lifestyle", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Swipe plans in Austin", url: "/c/austin/swipe", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Start a plan", url: "/new", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "My plans", url: "/me", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
