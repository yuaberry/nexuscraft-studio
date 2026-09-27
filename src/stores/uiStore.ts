import { create } from "zustand";

interface UiState {
  paletteOpen: boolean;
  aboutOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  setAboutOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  paletteOpen: false,
  aboutOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
}));
