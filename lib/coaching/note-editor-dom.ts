/**
 * Converts between the coaching-note markdown-lite storage format
 * (**bold**, *italic*, __underline__, ~~strike~~, "- " / "1. " lines — see
 * lib/coaching/note-format.tsx) and the DOM of the live-formatting
 * contentEditable editor in components/coaching/note-rich-editor.tsx.
 *
 * markdownLiteToHtml always renders one <div> per line (even empty ones, via
 * a lone <br>) so the editor can map a line index straight to
 * `root.children[i]` after a re-render — see toggleBlock in
 * note-rich-editor.tsx. htmlElementToMarkdownLite is the inverse, and is
 * deliberately tolerant of whatever line structure the browser's own native
 * Enter-key handling produces (some browsers use <div> per line, others
 * <br>), normalizing either into "\n"-joined text.
 */

const INLINE_PATTERN = /(\*\*.+?\*\*|__.+?__|~~.+?~~|\*.+?\*)/g;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineToHtml(line: string): string {
  const parts = line.split(INLINE_PATTERN).filter((part) => part !== "");
  return parts
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
      }
      if (part.startsWith("__") && part.endsWith("__") && part.length >= 4) {
        return `<u>${escapeHtml(part.slice(2, -2))}</u>`;
      }
      if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
        return `<s>${escapeHtml(part.slice(2, -2))}</s>`;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        return `<em>${escapeHtml(part.slice(1, -1))}</em>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

export function markdownLiteToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<div>${line === "" ? "<br>" : inlineToHtml(line)}</div>`)
    .join("");
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  if (el.tagName === "BR") return "\n";

  const children = Array.from(el.childNodes);
  // A lone <br> is our own "empty line" placeholder from markdownLiteToHtml
  // (kept so the empty <div> still has height) — not a real line break.
  const isLoneBr =
    children.length === 1 &&
    children[0].nodeType === Node.ELEMENT_NODE &&
    (children[0] as HTMLElement).tagName === "BR";
  const inner = isLoneBr ? "" : children.map(nodeToMarkdown).join("");

  switch (el.tagName) {
    case "STRONG":
    case "B":
      return inner ? `**${inner}**` : "";
    case "EM":
    case "I":
      return inner ? `*${inner}*` : "";
    case "U":
      return inner ? `__${inner}__` : "";
    case "S":
    case "STRIKE":
    case "DEL":
      return inner ? `~~${inner}~~` : "";
    default:
      return inner;
  }
}

export function htmlElementToMarkdownLite(root: HTMLElement): string {
  const lineParts: string[] = [];
  let current = "";

  for (const child of Array.from(root.childNodes)) {
    const isBlock =
      child.nodeType === Node.ELEMENT_NODE &&
      (child as HTMLElement).tagName === "DIV";
    if (isBlock) {
      lineParts.push(current);
      current = nodeToMarkdown(child);
    } else {
      current += nodeToMarkdown(child);
    }
  }
  lineParts.push(current);

  // The normal case: the root's first child is itself a <div> (one per
  // line, per markdownLiteToHtml), which leaves a spurious empty entry
  // ahead of it.
  if (lineParts.length > 1 && lineParts[0] === "") {
    lineParts.shift();
  }

  return lineParts.join("\n");
}
