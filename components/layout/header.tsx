'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Code, Wrench, Building2, Globe } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/layout/brand-mark';
import { useScrollPosition } from '@/lib/hooks';
import { mainNav, megaMenuSections, megaMenuAllLinks } from '@/lib/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const megaMenuIcons = {
  electrical: Wrench,
  'web-dev': Code,
  company: Building2,
} as const;

export default function Header() {
  const isScrolled = useScrollPosition();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const megaToggleRef = useRef<HTMLButtonElement>(null);

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsMegaOpen(false);
  };

  useEffect(() => {
    if (!isMobileMenuOpen && !isMegaOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) closeMenus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      (isMobileMenuOpen ? mobileToggleRef : megaToggleRef).current?.focus();
      closeMenus();
    };
    const breakpoint = window.matchMedia('(min-width: 1024px)');
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('popstate', closeMenus);
    breakpoint.addEventListener('change', closeMenus);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', closeMenus);
      breakpoint.removeEventListener('change', closeMenus);
    };
  }, [isMobileMenuOpen, isMegaOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header
      ref={headerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeMenus();
      }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) closeMenus();
      }}
      className={cn(
        'sticky top-0 z-40 w-full border-b border-border/50 bg-background/90 backdrop-blur-md transition-shadow duration-300 pt-[env(safe-area-inset-top)]',
        isScrolled && 'shadow-[0_10px_30px_-18px_rgb(0_0_0/0.45)]'
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <BrandMark className="pr-3" />

        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          {/* Contact is the quote button below, so it is not repeated as a link. */}
          {mainNav
            .filter((item) => item.href !== '/contact')
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary',
                  isActive(item.href) ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          <button
            ref={megaToggleRef}
            type="button"
            onClick={() => setIsMegaOpen(!isMegaOpen)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary flex items-center gap-1',
              isMegaOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            )}
            aria-expanded={isMegaOpen}
            aria-controls="mega-menu"
          >
            <Globe className="h-4 w-4" />
            Explore
          </button>
          <ThemeToggle />
          <Button
            asChild
            size="sm"
            className="ml-1 gradient-bg font-semibold text-primary-foreground shadow-sm hover:opacity-95"
          >
            <Link href="/contact" aria-current={isActive('/contact') ? 'page' : undefined}>
              Get a quote
            </Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            ref={mobileToggleRef}
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-md p-2.5 text-foreground hover:bg-muted transition-colors touch-target min-h-11 min-w-11"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMegaOpen && (
        <div
          id="mega-menu"
          className="hidden lg:block border-t border-border/50 bg-surface-1/95 backdrop-blur-md"
        >
          <div className="container grid grid-cols-3 gap-8 py-8">
            {megaMenuSections.map((section) => {
              const Icon = megaMenuIcons[section.key];
              const allLink =
                section.key === 'electrical' || section.key === 'web-dev'
                  ? megaMenuAllLinks[section.key]
                  : null;

              return (
                <div key={section.key}>
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                    <Icon className="h-4 w-4" />
                    {section.title}
                  </div>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setIsMegaOpen(false)}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                    {allLink && (
                      <li>
                        <Link
                          href={allLink.href}
                          onClick={() => setIsMegaOpen(false)}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {allLink.label}
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 lg:hidden border-b border-t border-border/50 bg-background shadow-xl max-h-[calc(100dvh-4rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain"
        >
          <nav className="container py-4 space-y-1" aria-label="Mobile navigation">
            <Button
              asChild
              size="lg"
              className="mb-3 w-full gradient-bg font-semibold text-primary-foreground"
            >
              <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)}>
                Get a quote
              </Link>
            </Button>
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3.5 min-h-11 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-4 border-t border-border/50 pt-4">
              {megaMenuSections.map((section) => (
                <div key={section.key} className="mb-4">
                  <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-primary">
                    {section.title}
                  </p>
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 min-h-11 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
