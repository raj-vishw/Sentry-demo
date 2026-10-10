import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animation/FadeIn';

const STEPS = [
  { step: '01', title: 'Clone the repo', description: 'git clone and cd into the project — nothing to install first.' },
  { step: '02', title: 'Configure .env', description: 'Copy the example env files, set your secrets and domain.' },
  { step: '03', title: 'docker compose up', description: 'Frontend, backend, and MongoDB start together, one command.' },
  { step: '04', title: 'Open your browser', description: 'The first-run setup wizard walks you through creating an admin.' },
] as const;

export function QuickstartSection() {
  return (
    <section className="border-t border-white/10 bg-zinc-950 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">Quickstart</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
            From zero to running in four steps.
          </h2>
        </FadeIn>

        <StaggerContainer className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <StaggerItem key={s.step}>
              <div className="flex h-full flex-col gap-2 border-l-2 border-emerald-500/40 pl-5">
                <span className="font-mono text-sm text-emerald-400">{s.step}</span>
                <h3 className="font-display text-base font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-zinc-400">{s.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
