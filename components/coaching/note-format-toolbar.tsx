"use client";

import { useCallback, type RefObject } from "react";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered } from "lucide-react";

type InlineMark = "bold" | "italic" | "underline" | "strike";
type BlockMark = "ul" | "ol";

const inlineMarkers: Record<InlineMark, [string, string]> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  underline: ["__", "__"],
  strike: ["~~", "~~"],
};

const inlinePlaceholder: Record<InlineMark, string> = {
  bold: "bold text",
  italic: "italic text",
  underline: "underlined text",
  strike: "struck text",
};

function applyInline(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void,
  mark: InlineMark
) {
  const [open, close] = inlineMarkers[mark];
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const text = selected || inlinePlaceholder[mark];
  const next = value.slice(0, start) + open + text + close + value.slice(end);
  onChange(next);

  const selectionStart = start + open.length;
  const selectionEnd = selectionStart + text.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(selectionStart, selectionEnd);
  });
}

function applyBlock(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void,
  mark: BlockMark
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIdx = value.indexOf("\n", end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");

  const bulletRe = /^- +/;
  const numberRe = /^\d+\.\s+/;
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  const isUl = nonEmpty.length > 0 && nonEmpty.every((l) => bulletRe.test(l));
  const isOl = nonEmpty.length > 0 && nonEmpty.every((l) => numberRe.test(l));

  let nextLines: string[];
  if (mark === "ul") {
    nextLines = isUl
      ? lines.map((l) => l.replace(bulletRe, ""))
      : lines.map((l) => (l.trim() === "" ? l : `- ${l.replace(numberRe, "")}`));
  } else {
    let n = 1;
    nextLines = isOl
      ? lines.map((l) => l.replace(numberRe, ""))
      : lines.map((l) => (l.trim() === "" ? l : `${n++}. ${l.replace(bulletRe, "")}`));
  }

  const nextBlock = nextLines.join("\n");
  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  onChange(next);

  const selectionStart = lineStart;
  const selectionEnd = lineStart + nextBlock.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(selectionStart, selectionEnd);
  });
}

const buttons: {
  mark: InlineMark | BlockMark;
  kind: "inline" | "block";
  icon: typeof Bold;
  label: string;
}[] = [
  { mark: "bold", kind: "inline", icon: Bold, label: "Bold" },
  { mark: "italic", kind: "inline", icon: Italic, label: "Italic" },
  { mark: "underline", kind: "inline", icon: Underline, label: "Underline" },
  { mark: "strike", kind: "inline", icon: Strikethrough, label: "Strikethrough" },
  { mark: "ul", kind: "block", icon: List, label: "Bullet list" },
  { mark: "ol", kind: "block", icon: ListOrdered, label: "Numbered list" },
];

export function NoteFormatToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const handleClick = useCallback(
    (kind: "inline" | "block", mark: InlineMark | BlockMark) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (kind === "inline") {
        applyInline(textarea, value, onChange, mark as InlineMark);
      } else {
        applyBlock(textarea, value, onChange, mark as BlockMark);
      }
    },
    [textareaRef, value, onChange]
  );

  return (
    <div className="flex items-center gap-1 rounded-lg border border-glass-border/60 bg-foreground/[0.02] p-1">
      {buttons.map(({ mark, kind, icon: Icon, label }) => (
        <button
          key={mark}
          type="button"
          title={label}
          aria-label={label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleClick(kind, mark)}
          className="flex size-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
