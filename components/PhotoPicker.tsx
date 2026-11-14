"use client";
// Optional photo (TZ §13): center-crop to a square, shrink to 256×256, encode WebP in the browser, then upload.
import { useRef, useState } from "react";
import { Avatar } from "./Avatar";

async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(async () => {
    // Older Safari: fall back to an <img> decode.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  const w = "width" in bitmap ? bitmap.width : 0;
  const h = "height" in bitmap ? bitmap.height : 0;
  if (!w || !h) throw new Error("decode");
  const side = Math.min(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap as CanvasImageSource, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 256, 256);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob || blob.type !== "image/webp") throw new Error("encode");
  return blob;
}

export function PhotoPicker({ name, onChange }: { name: string; onChange: (photoPath: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setState("error");
      setMsg("That photo is over 5 MB. Please pick a smaller one.");
      return;
    }
    setState("busy");
    try {
      const webp = await toWebp(file);
      const body = new FormData();
      body.append("file", webp, "avatar.webp");
      const r = await fetch("/api/uploads/avatar", { method: "POST", body });
      const out = await r.json().catch(() => null);
      if (!r.ok || !out?.photoPath) throw new Error(out?.message ?? "upload");
      setPreview(URL.createObjectURL(webp));
      onChange(out.photoPath);
      setState("idle");
    } catch (e) {
      const m = (e as Error).message;
      setState("error");
      setMsg(["decode", "encode", "canvas"].includes(m) ? "Please use a JPG or PNG photo" : m === "upload" ? "Couldn't upload the photo. Try again." : m);
      onChange(null);
    }
  }

  return (
    <div>
      <span className="text-[15px] font-semibold">Photo</span> <span className="text-[14px] text-ink-3">optional</span>
      <div className="mt-1.5 flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" width={48} height={48} className="size-12 rounded-full object-cover" />
        ) : (
          <Avatar name={name || "?"} size={48} />
        )}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={state === "busy"}
          className="h-11 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-semibold disabled:opacity-60"
        >
          {state === "busy" ? "Uploading…" : preview ? "Change photo" : "Add a photo"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              onChange(null);
            }}
            className="min-h-11 px-2 text-[14px] font-semibold text-ink-2 underline"
          >
            Remove
          </button>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      <span className={`mt-1 block text-[14px] ${state === "error" ? "text-danger" : "text-ink-2"}`}>
        {state === "error" ? msg : "Add a photo so people recognize you"}
      </span>
    </div>
  );
}
