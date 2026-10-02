'use client';

import Link from 'next/link';
import { ArrowDown, ArrowRight, Zap, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ImmersiveHero() {
  return (
    <section id="immersive-hero" className="relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.22] retro-grid" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
      </div>

      <div className="container relative z-10 flex max-w-4xl flex-col items-center gap-6 text-center px-4 py-16 sm:py-20 md:py-24">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="display-xl font-display font-bold tracking-tight text-balance"
        >
          <span className="block gradient-text glow-text">A-Grade Electrician</span>
          <span className="block text-foreground">Web &amp; IoT Developer</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          I’m Ricky, a Melbourne electrician and developer. I work on homes, businesses and
          industrial sites, and build websites, web apps and connected devices.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row"
        >
          <Button
            size="lg"
            className="gradient-bg min-h-11 w-full text-primary-foreground shadow-glow sm:w-auto"
            asChild
          >
            <Link href="/services/electrician-melbourne">
              <Zap className="mr-2 h-4 w-4" />
              Electrical services
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="chrome-border min-h-11 w-full hover:border-primary/50 sm:w-auto"
            asChild
          >
            <Link href="/services/web-developer-melbourne">
              <Code className="mr-2 h-4 w-4" />
              Web development
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        <motion.a
          href="#switchboard-showcase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="group inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Or walk through a wired home I built in 3D
          <ArrowDown
            className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
            aria-hidden
          />
        </motion.a>
      </div>
    </section>
  );
}
