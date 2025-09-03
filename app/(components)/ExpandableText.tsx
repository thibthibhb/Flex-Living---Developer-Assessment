"use client";

import { useMemo, useState } from "react";

type Props = {
  text: string;
  max?: number;           // grapheme max for collapsed mode
  className?: string;
};

function normalizeText(src: string): string {
  // Make whitespace deterministic across SSR/CSR
  // - convert NBSP to normal space
  // - collapse all whitespace runs to a single space
  // - trim ends
  return src
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Robust grapheme splitter: Intl.Segmenter first, fallback to [...str]
function takeGraphemes(input: string, limit: number): { slice: string; needsToggle: boolean } {
  if (limit <= 0) return { slice: "", needsToggle: input.length > 0 };
  // Use Segmenter where available (both Node 18+ and modern browsers support it)
  try {
    // @ts-ignore
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const it = seg.segment(input)[Symbol.iterator]();
    let out = "";
    let i = 0;
    while (i < limit) {
      const n = it.next();
      if (n.done) break;
      // n.value.segment is a full grapheme cluster
      out += (n.value as any).segment ?? "";
      i++;
    }
    // Determine if truncation happened
    const next = it.next();
    const needsToggle = !next.done; // there was more beyond the slice
    return { slice: out, needsToggle };
  } catch {
    // Fallback: split by code points (handles surrogate pairs like emoji)
    const codepoints = Array.from(input);
    const out = codepoints.slice(0, limit).join("");
    const needsToggle = codepoints.length > limit;
    return { slice: out, needsToggle };
  }
}

export default function ExpandableText({ text, max = 50, className }: Props) {
  const [open, setOpen] = useState(false);

  // Make everything purely derived from `text` and `max` (no env dependence)
  const { cleanText, short, needsToggle } = useMemo(() => {
    const clean = normalizeText(text ?? "");
    const { slice, needsToggle } = takeGraphemes(clean, max);
    const short = needsToggle ? `${slice}…` : clean;
    return { cleanText: clean, short, needsToggle };
  }, [text, max]);

  const content = open || !needsToggle ? cleanText : short;

  return (
    <div className={className}>
      <span suppressHydrationWarning>{content}</span>
      {needsToggle && (
        <>
          {" "}
          <button
            type="button"
            aria-label={open ? "Show less" : "Show more"}
            onClick={() => setOpen((v) => !v)}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#0f766e", // teal-ish
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {open ? "Show less" : "Show more"}
          </button>
        </>
      )}
    </div>
  );
}