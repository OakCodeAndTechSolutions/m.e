import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DepthCardProps {
  children: ReactNode;
  className?: string;
}

/** Raised card; the hover lift and glow live in `.depth-card` and respect reduced motion. */
export function DepthCard({ children, className }: DepthCardProps) {
  return <div className={cn('depth-card', className)}>{children}</div>;
}
