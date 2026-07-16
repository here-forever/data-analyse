import { create } from "zustand";

interface WorkspaceState {
  activeProjectId: string | null;
  advancedView: boolean;
  sidebarCollapsed: boolean;
  setActiveProject: (projectId: string | null) => void;
  toggleAdvancedView: () => void;
  toggleSidebar: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeProjectId: null,
  advancedView: false,
  sidebarCollapsed: false,
  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  toggleAdvancedView: () =>
    set((state) => ({ advancedView: !state.advancedView })),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
