"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";

/**
 * tldraw is pinned to 3.15.6 (see package.json) — the last release under
 * tldraw's watermark-and-free license, before v4+ restricted free use to
 * Development Environments only. Do not bump the major version without
 * re-checking https://github.com/tldraw/tldraw/blob/main/LICENSE.md.
 */
export function TldrawCanvas() {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<Editor | null>(null);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  // Keep the canvas theme in sync with the dashboard's light/dark toggle,
  // not just its value at mount time.
  useEffect(() => {
    editorRef.current?.user.updateUserPreferences({
      colorScheme: resolvedTheme === "dark" ? "dark" : "light",
    });
  }, [resolvedTheme]);

  return (
    <Tldraw persistenceKey="sales-dashboard-planning" onMount={handleMount} />
  );
}
