'use client';

import Link from 'next/link';
import { AppSwitcher } from './AppSwitcher';
import { SpaceSwitcher } from './SpaceSwitcher';
import { UserMenu } from './UserMenu';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  /** Breadcrumb trail after the switchers (e.g. [{label: 'Notebooks', href: '/notebooks'}, {label: 'My Notebook'}]) */
  breadcrumbs?: BreadcrumbItem[];
  /** Right-side actions (rendered between breadcrumbs and UserMenu) */
  actions?: React.ReactNode;
  /** Max width class for the inner container */
  maxWidth?: string;
}

export function Header({ breadcrumbs, actions, maxWidth = 'max-w-6xl' }: HeaderProps) {
  return (
    <nav className="border-b border-slate-800 backdrop-blur-sm bg-[#0a0a0a]/90 sticky top-0 z-50">
      <div className={`${maxWidth} mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-2`}>
        {/* Left: App switcher + Space switcher + Breadcrumbs */}
        <div className="flex items-center gap-1 min-w-0">
          <AppSwitcher current="notes" />
          <SpaceSwitcher />
          {breadcrumbs && breadcrumbs.length > 0 && (
            <>
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-1 min-w-0">
                  <span className="text-slate-600 hidden sm:inline">/</span>
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-slate-400 hover:text-white transition-colors text-sm hidden sm:inline truncate max-w-[140px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-white text-sm truncate max-w-[140px] md:max-w-[200px]">{crumb.label}</span>
                  )}
                </div>
              ))}
            </>
          )}
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
