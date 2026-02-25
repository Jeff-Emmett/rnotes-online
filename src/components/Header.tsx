'use client';

import Link from 'next/link';
import { AppSwitcher } from './AppSwitcher';
import { SpaceSwitcher } from './SpaceSwitcher';
import { SearchBar } from './SearchBar';
import { UserMenu } from './UserMenu';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  /** Which r*App is current (e.g. 'notes', 'vote', 'funds') */
  current?: string;
  /** Breadcrumb trail after the switchers */
  breadcrumbs?: BreadcrumbItem[];
  /** Right-side actions (rendered between breadcrumbs and UserMenu) */
  actions?: React.ReactNode;
  /** Max width class for the inner container */
  maxWidth?: string;
}

export function Header({ current = 'notes', breadcrumbs, actions, maxWidth = 'max-w-6xl' }: HeaderProps) {
  return (
    <nav className="border-b border-slate-800 backdrop-blur-sm bg-slate-900/85 sticky top-0 z-50">
      <div className={`${maxWidth} mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-2`}>
        {/* Left: App switcher + Space switcher + Breadcrumbs */}
        <div className="flex items-center gap-1 min-w-0">
          <AppSwitcher current={current} />
          <SpaceSwitcher />
          {breadcrumbs && breadcrumbs.length > 0 && (
            <>
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-1 min-w-0">
                  <span className="text-slate-600 hidden sm:inline">/</span>
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="text-slate-400 hover:text-white transition-colors text-sm hidden sm:inline truncate max-w-[140px]"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-white text-sm truncate max-w-[140px] md:max-w-[200px]">{crumb.label}</span>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Center: Search */}
        <div className="hidden md:block flex-1 max-w-md mx-4">
          <SearchBar />
        </div>

        {/* Feature shortcuts */}
        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
          <Link
            href="/opennotebook"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
            title="Open Notebook"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Open Notebook
          </Link>
          <Link
            href="/notes/new?type=CLIP"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
            title="Unlock a paywalled article"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Unlock Article
          </Link>
          <Link
            href="/notes/new?type=AUDIO"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
            title="Record and transcribe a voice note"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Transcribe
          </Link>
        </div>

        {/* Right: Actions + UserMenu */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {actions}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
