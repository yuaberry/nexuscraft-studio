import { create } from "zustand";
import {
  listProjects,
  removeProject,
} from "@/services/db/repositories/projectsRepository";
import type { ProjectRecord } from "@/types";

interface ProjectsState {
  loaded: boolean;
  projects: ProjectRecord[];
  hydrate: () => Promise<void>;
  addProject: (project: ProjectRecord) => void;
  removeProject: (id: string) => Promise<void>;
  patchProject: (id: string, patch: Partial<ProjectRecord>) => void;
  getProject: (id: string) => ProjectRecord | undefined;
}

export const useProjectsStore = create<ProjectsState>()((set, get) => ({
  loaded: false,
  projects: [],

  hydrate: async () => {
    const projects = await listProjects();
    set({ projects, loaded: true });
  },

  addProject: (project) => {
    set((state) => ({ projects: [project, ...state.projects] }));
  },

  removeProject: async (id) => {
    await removeProject(id);
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
  },

  patchProject: (id, patch) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },

  getProject: (id) => get().projects.find((p) => p.id === id),
}));
