"use client";
import { useRouter } from "next/navigation";

export function CitySwitcher({ cities, current }: { cities: { slug: string; name: string }[]; current?: string }) {
  const router = useRouter();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">City</span>
      <select
        value={current ?? ""}
        onChange={(e) => e.target.value && router.push(`/c/${e.target.value}`)}
        className="h-9 appearance-none rounded-full border border-line bg-surface pr-8 pl-3 text-[15px] font-medium text-ink"
      >
        {!current && <option value="">Pick a city</option>}
        {cities.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-2.5 text-ink-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}
