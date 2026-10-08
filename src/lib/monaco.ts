/**
 * Monaco Editor — local, offline-first setup.
 *
 * We compose Monaco from the core API + editor features + only the
 * languages relevant to Minecraft development instead of the kitchen-sink
 * package. This keeps the bundle lean and the build memory footprint low.
 *
 * Workers are served as web workers from the same origin (no CDN).
 */

import { loader } from "@monaco-editor/react";
// Full monaco entry (editor + all languages). Monaco 0.57 reorganized its
// ESM layout — composing individual contributions is version-fragile, so we
// use the stable root entry and compensate with a larger build heap.
import * as monaco from "monaco-editor";

// Workers
import editorWorker from "monaco-editor/editor/editor.worker.js?worker";
import jsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import cssWorker from "monaco-editor/language/css/css.worker.js?worker";
import htmlWorker from "monaco-editor/language/html/html.worker.js?worker";
import tsWorker from "monaco-editor/language/typescript/ts.worker.js?worker";

 
(self as any).MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    switch (label) {
      case "json":
        return new jsonWorker();
      case "css":
      case "scss":
      case "less":
        return new cssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new htmlWorker();
      case "typescript":
      case "javascript":
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

loader.config({ monaco });

const VOXEL_DARK: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "8a93a6", fontStyle: "italic" },
    { token: "keyword", foreground: "c084fc" },
    { token: "string", foreground: "7dd3fc" },
    { token: "number", foreground: "fbbf24" },
    { token: "type", foreground: "93c5fd" },
    { token: "delimiter", foreground: "64748b" },
  ],
  colors: {
    "editor.background": "#06080e",
    "editor.foreground": "#e6e9f0",
    "editorLineNumber.foreground": "#3b4354",
    "editorLineNumber.activeForeground": "#8b5cf6",
    "editor.selectionBackground": "#8b5cf64d",
    "editor.lineHighlightBackground": "#0e1220",
    "editorCursor.foreground": "#a78bfa",
    "editorIndentGuide.background1": "#151a28",
    "editorIndentGuide.activeBackground1": "#2d3448",
    "editorWidget.background": "#0a0d15",
    "editorWidget.border": "#1a1f30",
    "editorSuggestWidget.selectedBackground": "#151a2a",
    "scrollbarSlider.background": "#23293680",
    "scrollbarSlider.hoverBackground": "#2d3448aa",
  },
};

let themeReady = false;

export function setupMonacoTheme(): void {
  if (themeReady) return;
  monaco.editor.defineTheme("voxel-dark", VOXEL_DARK);
  monaco.editor.setTheme("voxel-dark");
  themeReady = true;
}

/** Registers Ctrl/Cmd+S on an editor instance. */
export function registerSaveShortcut(
  editor: monaco.editor.IStandaloneCodeEditor,
  onSave: () => void,
): void {
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, onSave);
}

/** Language id for a file path (Monaco handles the rest). */
export function languageFromPath(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  switch (ext) {
    case "java":
      return "java";
    case "json":
      return "json";
    case "gradle":
      return "groovy";
    case "properties":
      return "ini";
    case "md":
      return "markdown";
    case "js":
    case "mjs":
      return "javascript";
    case "ts":
      return "typescript";
    case "glsl":
    case "fsh":
    case "vsh":
      return "cpp";
    case "yml":
    case "yaml":
      return "yaml";
    case "xml":
      return "xml";
    case "html":
      return "html";
    case "css":
      return "css";
    default:
      return "plaintext";
  }
}
