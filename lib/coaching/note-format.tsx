import { Fragment, type ReactNode } from "react";

const INLINE_PATTERN = /(\*\*.+?\*\*|__.+?__|~~.+?~~|\*.+?\*)/g;

function parseInline(text: string): ReactNode {
  const parts = text.split(INLINE_PATTERN).filter((part) => part !== "");
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length >= 4) {
      return <u key={i}>{part.slice(2, -2)}</u>;
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return <s key={i}>{part.slice(2, -2)}</s>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const bulletRe = /^- (.*)$/;
const numberRe = /^\d+\. (.*)$/;

/**
 * Renders the small markdown-lite subset the coaching-note toolbar writes
 * (**bold**, *italic*, __underline__, ~~strike~~, "- " and "1. " lists) as
 * React nodes — never via dangerouslySetInnerHTML, since note bodies are
 * user-authored and shown to other users.
 */
export function renderNoteBody(body: string): ReactNode {
  const lines = body.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    if (bulletRe.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && bulletRe.test(lines[i])) {
        items.push(lines[i].match(bulletRe)![1]);
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc space-y-0.5 pl-5">
          {items.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (numberRe.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && numberRe.test(lines[i])) {
        items.push(lines[i].match(numberRe)![1]);
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal space-y-0.5 pl-5">
          {items.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const plainLines: string[] = [];
    while (i < lines.length && !bulletRe.test(lines[i]) && !numberRe.test(lines[i])) {
      plainLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++}>
        {plainLines.map((line, idx) => (
          <Fragment key={idx}>
            {idx > 0 && <br />}
            {parseInline(line)}
          </Fragment>
        ))}
      </p>
    );
  }

  return <div className="space-y-2">{blocks}</div>;
}
