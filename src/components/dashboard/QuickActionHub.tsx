import React from 'react';
import Link from 'next/link';
import { UploadCloud, FolderKanban, TrendingUp, ArrowRight } from 'lucide-react';

export function QuickActionHub() {
  const actions = [
    {
      id: 'upload',
      testId: 'dash-action-upload',
      title: 'Process & Upload',
      description: 'Ingest EPS/JPG pairs, generate AI metadata & export to portfolio.',
      href: '/upload',
      icon: UploadCloud,
      badge: 'Fast Batch',
      gradient: 'from-blue-600/15 to-indigo-600/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'portfolio',
      testId: 'dash-action-portfolio',
      title: 'Explore Portfolio',
      description: 'Search image catalog, copy high-converting keywords & manage tags.',
      href: '/portfolio',
      icon: FolderKanban,
      badge: 'Library',
      gradient: 'from-emerald-600/15 to-teal-600/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'sales',
      testId: 'dash-action-sales',
      title: 'Sales & Earnings',
      description: 'Sync royalty statements, track downloads & inspect performance.',
      href: '/sales',
      icon: TrendingUp,
      badge: 'Analytics',
      gradient: 'from-purple-600/15 to-pink-600/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">
          Quick Launchpad
        </h2>
        <span className="text-xs text-muted">Primary Workflows</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.id}
              href={act.href}
              data-testid={act.testId}
              className={`group bg-surface border rounded-xl p-4.5 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${act.gradient}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-surface border border-border/80 shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-border text-foreground">
                    {act.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {act.title}
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {act.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary">
                <span>Open Module</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
