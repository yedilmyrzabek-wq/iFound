"use client";
// Spells words in snap-in plastic letters on felt. When `lines` change, letters re-set with a stagger.
import { Fragment } from "react";

export function LetterLine({
  text,
  className = "",
  animate = false,
  delayOffset = 0,
  style,
}: {
  text: string;
  className?: string;
  animate?: boolean;
  delayOffset?: number;
  style?: React.CSSProperties;
}) {
  const chars = [...text.toUpperCase()];
  return (
    <span className={`block whitespace-nowrap leading-[1.02] ${className}`} style={style} aria-hidden="true">
      {chars.map((ch, i) =>
        ch === " " ? (
          <span key={i} className="letter-space" />
        ) : (
          <span
            key={i}
            className={`letter ${animate ? "letter-in" : ""}`}
            style={animate ? { animationDelay: `${delayOffset + i * 40}ms` } : undefined}
          >
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

export function Bulbs({ count = 14, lit }: { count?: number; lit: boolean | "chase" }) {
  return (
    <div className="bulbs" data-lit={String(lit)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Fragment key={i}>
          <span className="bulb" style={{ ["--i" as string]: i }} />
        </Fragment>
      ))}
    </div>
  );
}
