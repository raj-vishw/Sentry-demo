import { FEATURES } from '../data/features';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animation/FadeIn';

export function FeatureSection() {
  return (
    <section className="border-t border-white/10 bg-black py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">What you get</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
            Everything a self-hosted CTF needs.
          </h2>
        </FadeIn>

        <StaggerContainer className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <StaggerItem key={feature.id}>
                <div className="flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-white/10 bg-zinc-950 p-6">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-zinc-400">{feature.description}</p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
