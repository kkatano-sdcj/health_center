import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface UIState {
  isSidebarOpen: boolean;
  isInfoPanelOpen: boolean;
  theme: "light" | "dark";
  
  // Actions
  toggleSidebar: () => void;
  toggleInfoPanel: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      isSidebarOpen: true,
      isInfoPanelOpen: true,
      theme: "light",

      toggleSidebar: () =>
        set((state) => ({
          isSidebarOpen: !state.isSidebarOpen,
        })),

      toggleInfoPanel: () =>
        set((state) => ({
          isInfoPanelOpen: !state.isInfoPanelOpen,
        })),

      setTheme: (theme) =>
        set(() => ({
          theme,
        })),
    }),
    {
      name: "ui-store",
    }
  )
);