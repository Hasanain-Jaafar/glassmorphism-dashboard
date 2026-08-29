"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markdownLiteToHtml,
  htmlElementToMarkdownLite,
} from "@/lib/coaching/note-editor-dom";

type InlineMark = "bold" | "italic" | "underline" | "strike";
type BlockMark = "ul" | "ol";

const inlineTag: Record<InlineMark, string> = {
  bold: "STRONG",
  italic: "EM",
  underline: "U",
  strike: "S",
};

const inlinePlaceholder: Record<InlineMark, string> = {
  bold: "bold text",
  italic: "italic text",
  underline: "underlined text",
  strike: "struck text",
};

/**
 * The Range to apply a toolbar action to. If the current selection isn't
 * inside the editor — e.g. the user clicks a toolbar button before ever
 * focusing the composer — falls back to a collapsed range at the end of its
 * content, so the button still does something sensible instead of no-op'ing.
 */
function getEditorRange(el: HTMLElement, selection: Selection): Range {
  if (selection.rangeCount > 0) {
    const current = selection.getRangeAt(0);
    if (el.contains(current.commonAncestorContainer)) return current;
  }
  const fallback = document.createRange();
  fallback.selectNodeContents(el);
  fallback.collapse(false);
  return fallback;
}

const toolbarButtons: {
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

/**
 * A contentEditable note body input with live (WYSIWYG) bold/italic/
 * underline/strikethrough — unlike a plain <textarea>, which can only show
 * the raw **markdown** markers. Stores and emits the same markdown-lite
 * string coaching notes always have (see lib/coaching/note-format.tsx), so
 * the DB column and the read-only timeline view are unaffected.
 *
 * List/numbered-list buttons toggle the "- "/"1. " line prefix as plain
 * text (as before) rather than rendering live bullets — real list DOM
 * (nesting, Enter-to-continue) is a much bigger lift than what was asked
 * for here, and a "- " prefix is already readable unstyled.
 */
export function NoteRichEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);

  // Sync the DOM from external value changes (form reset, switching to a
  // different note to edit) — skipped when `value` is just an echo of our
  // own last onChange, so we never fight the user's cursor mid-edit.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = markdownLiteToHtml(value);
    lastEmitted.current = value;
  }, [value]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = htmlElementToMarkdownLite(el);
    lastEmitted.current = next;
    onChange(next);
  }, [onChange]);

  const toggleInline = useCallback(
    (mark: InlineMark) => {
      const el = editorRef.current;
      const selection = window.getSelection();
      if (!el || !selection) return;

      const fallback = getEditorRange(el, selection);
      el.focus();
      selection.removeAllRanges();
      selection.addRange(fallback);
      const range = selection.getRangeAt(0);

      const tag = inlineTag[mark];

      if (range.collapsed) {
        const node = document.createElement(tag);
        node.textContent = inlinePlaceholder[mark];
        range.insertNode(node);
        const next = document.createRange();
        next.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(next);
        emit();
        return;
      }

      const container =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : (range.commonAncestorContainer as Element);
      const existing = container?.closest(tag.toLowerCase());
      if (existing && el.contains(existing) && existing.textContent === range.toString()) {
        const parent = existing.parentNode;
        if (parent) {
          let lastMoved: ChildNode | null = null;
          while (existing.firstChild) {
            lastMoved = parent.insertBefore(existing.firstChild, existing);
          }
          parent.removeChild(existing);
          if (lastMoved) {
            const next = document.createRange();
            next.setStartAfter(lastMoved);
            next.collapse(true);
            selection.removeAllRanges();
            selection.addRange(next);
          }
        }
        emit();
        return;
      }

      const wrapper = document.createElement(tag);
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);
      const next = document.createRange();
      next.selectNodeContents(wrapper);
      selection.removeAllRanges();
      selection.addRange(next);
      emit();
    },
    [emit]
  );

  const toggleBlock = useCallback(
    (mark: BlockMark) => {
      const el = editorRef.current;
      const selection = window.getSelection();
      if (!el || !selection) return;

      const fallback = getEditorRange(el, selection);
      el.focus();
      selection.removeAllRanges();
      selection.addRange(fallback);
      const range = selection.getRangeAt(0);

      // Line index at the caret: serialize everything from the start of the
      // editor up to the caret through the same converter used for saving —
      // its "\n" count is the line index, regardless of inline formatting.
      const preRange = document.createRange();
      preRange.selectNodeContents(el);
      preRange.setEnd(range.startContainer, range.startOffset);
      const preContainer = document.createElement("div");
      preContainer.appendChild(preRange.cloneContents());
      const lineIndex =
        htmlElementToMarkdownLite(preContainer).split("\n").length - 1;

      const lines = htmlElementToMarkdownLite(el).split("\n");
      const line = lines[lineIndex] ?? "";
      const bulletRe = /^- +/;
      const numberRe = /^\d+\.\s+/;
      const isUl = bulletRe.test(line);
      const isOl = numberRe.test(line);

      lines[lineIndex] =
        mark === "ul"
          ? isUl
            ? line.replace(bulletRe, "")
            : `- ${line.replace(numberRe, "")}`
          : isOl
            ? line.replace(numberRe, "")
            : `1. ${line.replace(bulletRe, "")}`;

      const nextMarkdown = lines.join("\n");
      el.innerHTML = markdownLiteToHtml(nextMarkdown);
      lastEmitted.current = nextMarkdown;
      onChange(nextMarkdown);

      // Best-effort caret restore: end of the line just toggled.
      const lineEl = el.children[lineIndex] as HTMLElement | undefined;
      const restored = document.createRange();
      restored.selectNodeContents(lineEl ?? el);
      restored.collapse(false);
      selection.removeAllRanges();
      selection.addRange(restored);
    },
    [onChange]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const lines = text.split("\n");
      let lastInserted: ChildNode;
      if (lines.length === 1) {
        lastInserted = document.createTextNode(lines[0]);
        range.insertNode(lastInserted);
      } else {
        const fragment = document.createDocumentFragment();
        lines.forEach((line, i) => {
          if (i > 0) fragment.appendChild(document.createElement("br"));
          fragment.appendChild(document.createTextNode(line));
        });
        lastInserted = fragment.lastChild!;
        range.insertNode(fragment);
      }
      range.setStartAfter(lastInserted);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      emit();
    },
    [emit]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 rounded-lg border border-glass-border/60 bg-foreground/[0.02] p-1">
        {toolbarButtons.map(({ mark, kind, icon: Icon, label }) => (
          <button
            key={mark}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              kind === "inline"
                ? toggleInline(mark as InlineMark)
                : toggleBlock(mark as BlockMark)
            }
            className="flex size-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          onInput={emit}
          onPaste={handlePaste}
          className={cn(
            "min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "md:text-sm"
          )}
        />
        {value === "" && (
          <span className="pointer-events-none absolute top-2 left-2.5 text-base text-muted-foreground md:text-sm">
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
}
