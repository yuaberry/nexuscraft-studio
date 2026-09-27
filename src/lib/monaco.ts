/**
 * Monaco Editor — local, offline-first setup.
 *
 * Monaco is bundled with the app (no CDN), workers are served as web workers
 * from the same origin, and the color scheme matches the NexusCraft design
 * tokens so the editor feels native to the shell.
 */

import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/editor/editor.worker.js?worker";
import jsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import cssWorker from "monaco-editor/language/css/css.worker.js?worker";
import htmlWorker from "monaco-editor/language/html/html.worker.js?worker";
import tsWorker from "monaco-editor/language/typescript/ts.worker.js?worker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

const NEXUS_DARK: monaco.editor.IStandaloneThemeData = {
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
    "editor.background": "#0d1017",
    "editor.foreground": "#e6e9f0",
    "editorLineNumber.foreground": "#3b4354",
    "editorLineNumber.activeForeground": "#8b5cf6",
    "editor.selectionBackground": "#8b5cf64d",
    "editor.lineHighlightBackground": "#151926",
    "editorCursor.foreground": "#a78bfa",
    "editorIndentGuide.background1": "#1a1f2b",
    "editorIndentGuide.activeBackground1": "#2d3448",
    "editorWidget.background": "#10131a",
    "editorWidget.border": "#232936",
    "editorSuggestWidget.selectedBackground": "#1d222e",
    "scrollbarSlider.background": "#23293680",
    "scrollbarSlider.hoverBackground": "#2d3448aa",
  },
};

let themeReady = false;

export function setupMonacoTheme(): void {
  if (themeReady) return;
  monaco.editor.defineTheme("nexus-dark", NEXUS_DARK);
  monaco.editor.setTheme("nexus-dark");
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
