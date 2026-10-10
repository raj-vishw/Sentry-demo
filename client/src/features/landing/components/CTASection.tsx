import { Link } from 'react-router-dom';
import { ArrowRight, Code2 } from 'lucide-react';
import { LandingButton } from './LandingButton';
import { FadeIn } from '@/components/animation/FadeIn';
import { useAuthStore } from '@/stores/authStore';
import { useAppBasePath } from '@/lib/appPath';
import { SITE_CONFIG } from '@/app/config/site';

export function CTASection() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const appBasePath = useAppBasePath();
  return (
    <section id="about" className="relative overflow-hidden border-t border-white/10 bg-zinc-950 py-28">
      <FadeIn className="relative mx-auto flex max-w-2xl flex-col items-center px-4 text-center sm:px-6">
        <h2 className="text-balance font-display text-3xl font-semibold text-white sm:text-4xl">
          Self-host your own CTF today.
        </h2>
        <p className="mt-4 text-zinc-400">
          Clone the repo, run one command, and you have a fully working competition platform —
          on your own infrastructure, under your own control.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to={isAuthenticated ? `${appBasePath}/dashboard` : '/docs/self-hosting'}>
            <LandingButton size="lg" rightIcon={<ArrowRight className="size-4" />}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
            </LandingButton>
          </Link>
          <a href={SITE_CONFIG.githubUrl} target="_blank" rel="noreferrer noopener">
            <LandingButton size="lg" variant="outline" leftIcon={<Code2 className="size-4" />}>
              View on GitHub
            </LandingButton>
          </a>
        </div>
      </FadeIn>
    </section>
  );
}
