'use client';

import * as React from 'react';
import Link from 'next/link';
import { X, BriefcaseBusiness } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

const SHOW_AT_DEPTH = 0.55;

interface AvailableForWorkPopupProps {
  className?: string;
}

export function AvailableForWorkPopup({ className }: AvailableForWorkPopupProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isFading, setIsFading] = React.useState(false);

  const dismissPopup = () => {
    setIsFading(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsFading(false);
      sessionStorage.setItem('availablePopupDismissed', 'true');
    }, 300);
  };

  // Offer help once the visitor has read past the middle of the page, not on the first scroll.
  React.useEffect(() => {
    if (isVisible || sessionStorage.getItem('availablePopupDismissed') === 'true') return;

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= SHOW_AT_DEPTH) setIsVisible(true);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isVisible]);

  React.useEffect(() => {
    if (!isVisible) return;
    const dismissTimer = setTimeout(dismissPopup, 30000);
    return () => clearTimeout(dismissTimer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      data-site-popup
      className={cn(
        'fixed z-50 p-1 shadow-lg rounded-lg bg-gradient-to-r from-primary to-amber-500',
        'bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 left-4 sm:left-auto sm:max-w-[320px]',
        'animate-fade-in animate-slide-in-from-bottom',
        isFading && 'animate-fade-out',
        className
      )}
    >
      <div className="relative rounded-md bg-background text-foreground p-4 border border-border">
        <button
          type="button"
          onClick={dismissPopup}
          className="absolute right-2 top-2 rounded-full p-2 hover:bg-muted touch-target"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col space-y-3 pr-6">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-5 w-5 text-primary shrink-0" />
            <h3 className="font-semibold text-foreground">Have a project in mind?</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Tell me about your electrical job, website or app. I’ll confirm availability and the
            next steps.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              className="gradient-bg text-primary-foreground w-full sm:w-auto"
              asChild
            >
              <Link href="/contact">Contact Me</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="outline-brand w-full sm:w-auto"
              onClick={dismissPopup}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
