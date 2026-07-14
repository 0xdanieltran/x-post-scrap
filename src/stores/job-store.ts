import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JobFilters } from "@/types/database";

interface JobFilterState {
  filters: JobFilters;
  setFilter: <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: JobFilters = {
  sort: "newest",
  limit: 20,
};

export const useJobFilterStore = create<JobFilterState>()(
  persist(
    (set) => ({
      filters: defaultFilters,
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),
      resetFilters: () => set({ filters: defaultFilters }),
    }),
    { name: "job-filters" }
  )
);

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
}));
