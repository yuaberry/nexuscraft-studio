/**
 * Connection store — where the phone is paired to a PC running VOXEL.
 * Persisted in AsyncStorage-style plain storage (expo-secure-store is
 * the upgrade path — token is a short-lived pairing secret).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Connection {
  address: string; // host:port of the PC bridge
  token: string;
}

interface ConnectionState {
  connection: Connection | null;
  connect: (address: string, token: string) => void;
  disconnect: () => void;
}

// Minimal storage shim (AsyncStorage without the extra dep — Expo ships
// AsyncStorage in 'react-native' runtime via expo? keep it simple and
// persist through zustand's default localStorage on web; on native the
// pairing is re-entered per install until secure storage lands).
export const useConnection = create<ConnectionState>()(
  persist(
    (set) => ({
      connection: null,
      connect: (address, token) => set({ connection: { address, token } }),
      disconnect: () => set({ connection: null }),
    }),
    { name: "voxel-connection" },
  ),
);
