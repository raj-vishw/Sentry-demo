import { matchPath } from 'react-router-dom';
import { APP_REGISTRY } from '../apps/registry';

export interface ResolvedApp {
  appId: string;
  params: Record<string, string>;
}

/**
 * Maps the current URL to the app + params it represents, if any. The
 * registry's `routePattern`s are always in canonical `/app/...` form.
 */
export function resolveAppFromPath(pathname: string): ResolvedApp | null {
  for (const app of Object.values(APP_REGISTRY)) {
    if (!app.routePattern) continue;
    const match = matchPath(app.routePattern, pathname);
    if (!match) continue;

    // Pass through every matched route param generically (slug, id, ...) so
    // a new param-based app never needs a bespoke branch added here — the
    // one exception is 'admin', whose own routePattern ('/app/admin/*')
    // yields a wildcard match, not a usable param, so it gets the raw
    // pathname instead.
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(match.params)) {
      if (value !== undefined) params[key] = value;
    }
    if (app.id === 'admin') params.section = pathname;
    return { appId: app.id, params };
  }
  return null;
}
