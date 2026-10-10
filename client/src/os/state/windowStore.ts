import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Point, Size, WindowInstance } from '../types';
import { getApp } from '../apps/registry';

const WORKSPACE_COUNT = 3;
const CASCADE_STEP = 28;

function paramsKey(params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  return keys.map((k) => `${k}=${params[k]}`).join('&');
}

function windowKey(appId: string, params: Record<string, string>): string {
  return `${appId}::${paramsKey(params)}`;
}

interface WindowState {
  windows: WindowInstance[];
  focusedId: string | null;
  nextZ: number;
  activeWorkspace: number;
  workspaceCount: number;

  openApp: (
    appId: string,
    params?: Record<string, string>,
    opts?: { silent?: boolean },
  ) => string | null;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  setWindowTitle: (id: string, title: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, position: Point) => void;
  resizeWindow: (id: string, size: Size, position?: Point) => void;
  snapWindow: (id: string, position: Point, size: Size) => void;
  setActiveWorkspace: (workspace: number) => void;
  moveWindowToWorkspace: (id: string, workspace: number) => void;
  findByAppParams: (appId: string, params: Record<string, string>) => WindowInstance | undefined;
  closeAppRouteWindow: (appId: string, params: Record<string, string>) => void;
}

function cascadePosition(index: number): Point {
  const base = 90;
  return {
    x: base + ((index * CASCADE_STEP) % 260),
    y: base + ((index * CASCADE_STEP) % 180),
  };
}

export const useWindowStore = create<WindowState>()(
  persist(
    (set, get) => ({
      windows: [],
      focusedId: null,
      nextZ: 1,
      activeWorkspace: 0,
      workspaceCount: WORKSPACE_COUNT,

      openApp: (appId, params = {}, opts) => {
        const app = getApp(appId);
        if (!app) return null;

        if (app.singleInstance !== false) {
          const existing = get().findByAppParams(appId, params);
          if (existing) {
            set((s) => ({
              windows: s.windows.map((w) =>
                w.id === existing.id ? { ...w, minimized: false, zIndex: s.nextZ } : w,
              ),
              focusedId: existing.id,
              nextZ: s.nextZ + 1,
              activeWorkspace: existing.workspace,
            }));
            return existing.id;
          }
        }

        const id = crypto.randomUUID();
        const index = get().windows.length;
        const instance: WindowInstance = {
          id,
          appId,
          params,
          title: app.title,
          workspace: get().activeWorkspace,
          position: cascadePosition(index),
          size: app.defaultSize,
          zIndex: get().nextZ,
          minimized: false,
          maximized: false,
          prevPosition: null,
          prevSize: null,
        };

        set((s) => ({
          windows: [...s.windows, instance],
          focusedId: opts?.silent ? s.focusedId : id,
          nextZ: s.nextZ + 1,
        }));
        return id;
      },

      closeWindow: (id) => {
        set((s) => ({
          windows: s.windows.filter((w) => w.id !== id),
          focusedId: s.focusedId === id ? null : s.focusedId,
        }));
      },

      focusWindow: (id) => {
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: false, zIndex: s.nextZ } : w)),
          focusedId: id,
          nextZ: s.nextZ + 1,
        }));
      },

      setWindowTitle: (id, title) => {
        set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, title } : w)) }));
      },

      minimizeWindow: (id) => {
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
          focusedId: s.focusedId === id ? null : s.focusedId,
        }));
      },

      restoreWindow: (id) => get().focusWindow(id),

      toggleMaximize: (id) => {
        set((s) => ({
          windows: s.windows.map((w) => {
            if (w.id !== id) return w;
            if (w.maximized) {
              return {
                ...w,
                maximized: false,
                position: w.prevPosition ?? w.position,
                size: w.prevSize ?? w.size,
              };
            }
            return {
              ...w,
              maximized: true,
              prevPosition: w.position,
              prevSize: w.size,
            };
          }),
        }));
      },

      moveWindow: (id, position) => {
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, position, maximized: false } : w)),
        }));
      },

      resizeWindow: (id, size, position) => {
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, size, position: position ?? w.position } : w,
          ),
        }));
      },

      snapWindow: (id, position, size) => {
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id
              ? { ...w, position, size, maximized: false, prevPosition: w.position, prevSize: w.size }
              : w,
          ),
        }));
      },

      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

      moveWindowToWorkspace: (id, workspace) => {
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, workspace } : w)),
        }));
      },

      findByAppParams: (appId, params) => {
        const key = windowKey(appId, params);
        return get().windows.find((w) => windowKey(w.appId, w.params) === key);
      },

      closeAppRouteWindow: (appId, params) => {
        const existing = get().findByAppParams(appId, params);
        if (existing) get().closeWindow(existing.id);
      },
    }),
    {
      name: 'os:windows:v2',
      partialize: (s) => ({
        windows: s.windows.map((w, i) => ({ ...w, minimized: false, zIndex: i + 1 })),
        activeWorkspace: s.activeWorkspace,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.nextZ = state.windows.length + 1;
      },
    },
  ),
);
