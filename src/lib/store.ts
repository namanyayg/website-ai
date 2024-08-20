import { create } from "zustand";

interface AppStore {
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  openaiApiKey: '',
  setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
}));
