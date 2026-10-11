import { ChallengesPage } from '@/features/challenges/ChallengesPage';

/**
 * Thin OS wrapper, same pattern as LaboratoryApp.tsx — the window's own
 * titlebar already reads "CHALLENGES.SYS", so the page's standalone
 * heading would just repeat that; `hideHeader` drops it. The public
 * route (`/challenges`, registered directly against ChallengesPage, no
 * wrapper) keeps the full heading since it has no titlebar of its own.
 */
export function ExploreApp() {
  return <ChallengesPage hideHeader />;
}
