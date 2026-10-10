import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface AppContentProps {
  windowId: string;
  params: Record<string, string>;
  /** True when the window's own content box is narrow — apps should reflow using this, not viewport breakpoints. */
  isCompact: boolean;
}

export interface AppDefinition {
  id: string;
  title: string;
  shortTitle?: string;
  icon: LucideIcon;
  /** react-router path pattern (e.g. '/challenges/:slug') this app is bound to, if any. */
  routePattern?: string;
  /** Builds a concrete URL from a window's params — used to keep the address bar in sync. */
  buildPath?: (params: Record<string, string>) => string;
  defaultSize: Size;
  minSize: Size;
  component: ComponentType<AppContentProps>;
  /** Only one instance may exist per distinct params key. Defaults to true. */
  singleInstance?: boolean;
  /** Shown in the dock even when not running. */
  pinned?: boolean;
  /** Shown in the app launcher grid. Defaults to true. */
  launchable?: boolean;
  adminOnly?: boolean;
}

export interface WindowInstance {
  id: string;
  appId: string;
  params: Record<string, string>;
  title: string;
  workspace: number;
  position: Point;
  size: Size;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  prevPosition: Point | null;
  prevSize: Size | null;
}

export type SnapZone = 'left' | 'right' | 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;
