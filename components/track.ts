"use client";
// Fire-and-forget funnel event. Never blocks or breaks the UI.
export function track(name: string, data: { code?: string; city?: string } = {}) {
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code: data.code ?? null, city: data.city ?? null }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
