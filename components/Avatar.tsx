// Initials on a colored disc (color from a hash of the name) — the default everywhere until photos ship.
const TONES = ["#E8A33D", "#3E8E7E", "#C4553B", "#5470C6", "#8E5BB5", "#2F8F4E", "#B5652E", "#3C7FA8"];

function tone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl?: string | null; size?: number }) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-surface" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface"
      style={{ width: size, height: size, background: tone(name), fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function LockedAvatar({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#e4e6e1] text-ink-3 ring-2 ring-surface"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <rect x="5" y="10.5" width="14" height="10" rx="2" />
        <path d="M8 10.5V8a4 4 0 018 0v2.5" />
      </svg>
    </span>
  );
}
