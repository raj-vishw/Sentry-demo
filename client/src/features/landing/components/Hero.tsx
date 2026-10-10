import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, Terminal } from 'lucide-react';
import { LandingButton } from './LandingButton';
import { staggerContainer, staggerItem } from '@/components/animation/variants';
import { useAuthStore } from '@/stores/authStore';
import { useAppBasePath } from '@/lib/appPath';
import { SITE_CONFIG } from '@/app/config/site';

export function Hero() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const appBasePath = useAppBasePath();

  return (
    <section className="relative overflow-hidden bg-black">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-28 text-center sm:px-6 lg:py-36"
      >
        <motion.span
          variants={staggerItem}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-emerald-400"
        >
          Open source · Self-hosted
        </motion.span>

        <motion.h1
          variants={staggerItem}
          className="mt-8 text-balance font-display text-5xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          Run your own
          <br />
          <span className="text-emerald-400">Capture The Flag.</span>
        </motion.h1>

        <motion.p
          variants={staggerItem}
          className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-zinc-400"
        >
          {SITE_CONFIG.description}
        </motion.p>

        <motion.div variants={staggerItem} className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link to={isAuthenticated ? `${appBasePath}/dashboard` : '/docs/self-hosting'}>
            <LandingButton size="lg" rightIcon={<ArrowRight className="size-4" />}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
            </LandingButton>
          </Link>
        </motion.div>

        <motion.div variants={staggerItem} className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-6">
          <Link
            to="/docs"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-400"
          >
            Read the documentation →
          </Link>
          <a
            href={SITE_CONFIG.githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-400"
          >
            <Code2 className="size-4" /> View source
          </a>
        </motion.div>

        <motion.div variants={staggerItem} className="mt-16 w-full max-w-lg">
          <TerminalMockup />
        </motion.div>
      </motion.div>
    </section>
  );
}

function TerminalMockup() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-zinc-950 text-left shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-zinc-700" />
        <span className="size-2.5 rounded-full bg-zinc-700" />
        <span className="size-2.5 rounded-full bg-zinc-700" />
        <span className="ml-2 flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
          <Terminal className="size-3" /> operator@localhost
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed text-zinc-300">
        <code>
          <span className="text-zinc-500">$</span> git clone https://github.com/you/sentry.git{'\n'}
          <span className="text-zinc-500">$</span> cd sentry{'\n'}
          <span className="text-zinc-500">$</span> cp server/.env.example server/.env{'\n'}
          <span className="text-zinc-500">$</span> docker compose up -d{'\n'}
          <span className="text-emerald-400">✓ Sentry is running at http://localhost:5173</span>
        </code>
      </pre>
    </div>
  );
}
