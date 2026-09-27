import { create } from "zustand";

interface UiState {
  paletteOpen: boolean;
  aboutOpen: boolean;
  createWizardOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  setAboutOpen: (open: boolean) => void;
  setCreateWizardOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  paletteOpen: false,
  aboutOpen: false,
  createWizardOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setCreateWizardOpen: (open) => set({ createWizardOpen: open }),
}));
