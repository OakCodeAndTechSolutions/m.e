'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu, ExternalLink, Github, Globe, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project, ProjectCategory } from '@/lib/data';
import { fadeInUp } from '@/lib/animations';

const CATEGORY: Record<ProjectCategory, { icon: LucideIcon; label: string }> = {
  web: { icon: Globe, label: 'Web' },
  electrical: { icon: Zap, label: 'Electrical' },
  iot: { icon: Cpu, label: 'IoT & hardware' },
};

const MAX_TECH = 6;

function siteHost(project: Project): string | null {
  const external = project.links.find((link) => link.type === 'external');
  if (!external) return null;
  try {
    return new URL(external.url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

interface ProjectCardProps {
  project: Project;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const item = {
    ...fadeInUp,
    show: {
      ...fadeInUp.show,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
      },
    },
  };
  const category = CATEGORY[project.category];
  const host = siteHost(project);
  const [showAllTech, setShowAllTech] = useState(false);
  const shownTech = showAllTech ? project.technologies : project.technologies.slice(0, MAX_TECH);
  const hiddenTech = project.technologies.length - shownTech.length;

  return (
    <motion.div variants={item} className="depth-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-surface-2/60 px-4 py-3 sm:px-6">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <span className="inline-flex rounded-md bg-primary/10 p-1.5">
            <category.icon className="h-4 w-4" aria-hidden />
          </span>
          {category.label}
        </span>
        {host && <span className="truncate text-xs text-muted-foreground">{host}</span>}
      </div>
      <div className="flex flex-grow flex-col space-y-3 p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold text-foreground text-balance sm:text-xl">
          {project.title}
        </h3>
        <p className="flex-grow text-sm text-muted-foreground">{project.description}</p>
        <div className="mb-4">
          <p className="sr-only">Built with</p>
          <ul className="flex flex-wrap gap-1.5">
            {shownTech.map((tech) => (
              <li key={tech} className="brand-chip">
                {tech}
              </li>
            ))}
            {hiddenTech > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => setShowAllTech(true)}
                  className="inline-flex min-h-6 items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  +{hiddenTech} more
                  <span className="sr-only"> technologies, show all</span>
                </button>
              </li>
            )}
          </ul>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {project.links.map((link, i) =>
            link.type === 'github' ? (
              link.label === 'In Progress' ? (
                <Button
                  key={i}
                  variant="default"
                  size="sm"
                  disabled
                  className="gradient-bg w-full text-primary-foreground opacity-70 sm:w-auto"
                >
                  <Github className="mr-2 h-4 w-4" />
                  {link.label}
                </Button>
              ) : (
                <Button
                  key={i}
                  variant="default"
                  size="sm"
                  className="gradient-bg min-h-10 w-full text-primary-foreground sm:w-auto"
                  asChild
                >
                  <Link
                    href={link.url}
                    target="_blank"
                    rel={`noopener noreferrer${link.nofollow ? ' nofollow' : ''}`}
                  >
                    <Github className="mr-2 h-4 w-4" />
                    {link.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </Link>
                </Button>
              )
            ) : (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="outline-brand w-full sm:w-auto"
                asChild
              >
                <Link
                  href={link.url}
                  target="_blank"
                  rel={`noopener noreferrer${link.nofollow ? ' nofollow' : ''}`}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {link.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </Link>
              </Button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
