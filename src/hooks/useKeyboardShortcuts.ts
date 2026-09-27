import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

/**
 * Global keyboard shortcuts for the application shell.
 * - Ctrl/Cmd + K  → command palette
 * - Ctrl/Cmd + ,  → open settings
 */
export function useKeyboardShortcuts() {
  const togglePalette = useUiStore((s) => s.togglePalette);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
        return;
      }

      if (mod && event.key === ",") {
        event.preventDefault();
        window.location.hash = "#/settings/general";
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePalette]);
}
