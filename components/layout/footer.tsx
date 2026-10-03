'use client';

import Link from 'next/link';
import { Github, Coffee, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/layout/brand-mark';
import { footerQuickLinks, featuredElectricalLinks, featuredWebDevLinks } from '@/lib/navigation';

export default function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-surface-1/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0 retro-grid opacity-30 pointer-events-none" aria-hidden />
      <div className="container relative py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          <div className="space-y-4">
            <BrandMark />
            <p className="text-sm text-muted-foreground text-body">
              Melbourne electrician and developer. Electrical installations and repairs, business
              websites, web apps and connected hardware.
            </p>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="gradient-bg text-primary-foreground text-xs min-h-10"
                asChild
              >
                <Link
                  href="https://www.buymeacoffee.com/oakcodeandtechsolutions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Coffee className="mr-2 h-3 w-3" />
                  Buy Me a Coffee
                </Link>
              </Button>
              <Link
                href="https://github.com/Sleuth420"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2.5 hover:bg-muted transition-colors touch-target min-h-11 min-w-11 inline-flex items-center justify-center"
              >
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-primary">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {footerQuickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-primary">Electrical</h3>
            <ul className="space-y-2 text-sm">
              {featuredElectricalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/services"
                  className="text-muted-foreground hover:text-primary transition-colors text-xs"
                >
                  All services
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-primary">Digital</h3>
            <ul className="space-y-2 text-sm">
              {featuredWebDevLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center pt-8 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center inline-flex items-center justify-center flex-wrap gap-x-1">
            Built with
            <Heart className="h-3 w-3 fill-primary text-primary" aria-label="love" />
            by
            <Link
              href="https://github.com/Sleuth420"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              Oak Code And Tech Solutions
            </Link>
          </p>
        </div>
      </div>

      <div className="border-t border-border/50 bg-surface-0/80">
        <div className="container py-4">
          <p className="text-center text-xs text-muted-foreground">
            OakCodeAndTechSolutions is a trading name of Richard Steven Oakley (ABN 48 113 774
            962), who is an undischarged bankrupt under the Bankruptcy Act 1966 (Cth).
          </p>
        </div>
      </div>
    </footer>
  );
}
