'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  FileEdit,
  Moon,
  Sun,
  Linkedin,
  Github,
  Globe,
  Save,
  Heart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SidebarView = 'templates' | 'parse' | 'editor' | 'claude' | 'saved';

interface SidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

// ================================
// EDIT YOUR INFO HERE
// ================================
const AUTHOR_INFO = {
  name: 'Ryan Hang',
  year: 2026,
  linkedIn: 'https://linkedin.com/in/ryanhang07',
  github: 'https://github.com/ryanhang07',
  portfolio: 'https://ryanhang.io',
  heartMessage: 'Made with ❤️ for Julie Truong',
};
// ================================

const THEME_EVENT = 'resumease-theme';

const subscribeIsClient = (): (() => void) => () => {};
const getIsClientSnapshot = (): boolean => true;
const getIsClientServerSnapshot = (): boolean => false;

const subscribeTheme = (onStoreChange: () => void): (() => void) => {
  const handleChange = () => onStoreChange();
  window.addEventListener('storage', handleChange);
  window.addEventListener(THEME_EVENT, handleChange);
  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(THEME_EVENT, handleChange);
  };
};

const getIsDarkSnapshot = (): boolean => {
  const savedTheme = localStorage.getItem('theme');
  return savedTheme !== 'light';
};

const getIsDarkServerSnapshot = (): boolean => true;

const NavItem = ({
  icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: NavItemProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center w-full gap-3 px-3 py-3 text-sm font-medium transition-colors mx-2 relative overflow-hidden',
        isCollapsed ? 'justify-center mx-1 px-2' : '',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
      aria-label={label}
      aria-pressed={isActive}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      {!isCollapsed && <span className="relative z-0">{label}</span>}
    </button>
  );
};

export const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const { isSignedIn } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeIsClient,
    getIsClientSnapshot,
    getIsClientServerSnapshot
  );
  const isDark = useSyncExternalStore(
    subscribeTheme,
    getIsDarkSnapshot,
    getIsDarkServerSnapshot
  );
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const heartRef = useRef<HTMLButtonElement>(null);

  // Sync React theme → document class (external system only; no setState).
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('dark', isDark);
  }, [mounted, isDark]);

  const handleToggleTheme = () => {
    const nextIsDark = !isDark;
    localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', nextIsDark);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full border-r bg-card transition-all duration-300 relative z-10 overflow-hidden',
        isCollapsed ? 'w-14' : 'w-48'
      )}
    >
      {/* Collapse Toggle */}
      <div className="flex items-center justify-end p-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex w-full flex-col gap-1 py-2 items-center justify-center">
        <NavItem
          icon={<LayoutTemplate className="h-4 w-4 shrink-0" aria-hidden="true" />}
          label="Templates"
          isActive={activeView === 'templates'}
          isCollapsed={isCollapsed}
          onClick={() => onViewChange('templates')}
        />
        <NavItem
          icon={<ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />}
          label="Parse"
          isActive={activeView === 'parse'}
          isCollapsed={isCollapsed}
          onClick={() => onViewChange('parse')}
        />
        <NavItem
          icon={<FileEdit className="h-4 w-4 shrink-0" aria-hidden="true" />}
          label="Editor"
          isActive={activeView === 'editor'}
          isCollapsed={isCollapsed}
          onClick={() => onViewChange('editor')}
        />
        <NavItem
          icon={<Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />}
          label="Claude"
          isActive={activeView === 'claude'}
          isCollapsed={isCollapsed}
          onClick={() => onViewChange('claude')}
        />
        {isSignedIn && (
          <NavItem
            icon={<Save className="h-4 w-4 shrink-0" aria-hidden="true" />}
            label="Saved"
            isActive={activeView === 'saved'}
            isCollapsed={isCollapsed}
            onClick={() => onViewChange('saved')}
          />
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer Section */}
      <div className="border-t p-2">
        {/* Dark Mode Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size={isCollapsed ? 'icon' : 'sm'}
            onClick={handleToggleTheme}
            className={cn(
              'w-full mb-2',
              isCollapsed ? 'h-10 w-10 mx-auto' : 'justify-start gap-2'
            )}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" />
            )}
            {!isCollapsed && (
              <span className="text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            )}
          </Button>
        )}

        {/* Author Info */}
        <div
          className={cn(
            'text-muted-foreground',
            isCollapsed ? 'flex flex-col items-center gap-1' : 'px-2 py-2'
          )}
        >
          {!isCollapsed && (
            <p className="text-xs mb-2">
              © {AUTHOR_INFO.year} {AUTHOR_INFO.name}
            </p>
          )}

          {/* Social Links */}
          <div className={cn('flex gap-1 items-center', isCollapsed ? 'flex-col' : 'flex-row')}>
            <a
              href={AUTHOR_INFO.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Open Ryan Hang's LinkedIn profile in a new tab"
              tabIndex={0}
            >
              <Linkedin className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={AUTHOR_INFO.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Open Ryan Hang's GitHub profile in a new tab"
              tabIndex={0}
            >
              <Github className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={AUTHOR_INFO.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Open Ryan Hang's portfolio in a new tab"
              tabIndex={0}
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              ref={heartRef}
              className={cn(
                'relative rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isCollapsed ? 'mt-1' : ''
              )}
              aria-label={AUTHOR_INFO.heartMessage}
              aria-describedby={showTooltip ? 'author-heart-tooltip' : undefined}
              onMouseEnter={() => {
                if (heartRef.current) {
                  const rect = heartRef.current.getBoundingClientRect();
                  if (isCollapsed) {
                    setTooltipPosition({
                      top: rect.top + rect.height / 2,
                      left: rect.right + 8,
                    });
                  } else {
                    setTooltipPosition({
                      top: rect.top - 8,
                      left: rect.left + rect.width / 2,
                    });
                  }
                  setShowTooltip(true);
                }
              }}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => {
                if (heartRef.current) {
                  const rect = heartRef.current.getBoundingClientRect();
                  setTooltipPosition({
                    top: isCollapsed ? rect.top + rect.height / 2 : rect.top - 8,
                    left: isCollapsed ? rect.right + 8 : rect.left + rect.width / 2,
                  });
                  setShowTooltip(true);
                }
              }}
              onBlur={() => setShowTooltip(false)}
            >
              <Heart className="h-4 w-4 m-1 text-red-500 fill-red-500" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Tooltip Portal */}
      {mounted && showTooltip && typeof window !== 'undefined' && createPortal(
        <div
          id="author-heart-tooltip"
          role="tooltip"
          className="fixed px-2 py-1 text-xs text-popover-foreground bg-popover border border-border rounded-md whitespace-nowrap pointer-events-none z-9999 shadow-lg transition-opacity duration-200"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: isCollapsed
              ? 'translateY(-50%)'
              : 'translateX(-50%) translateY(-100%)',
          }}
        >
          {AUTHOR_INFO.heartMessage}
          {!isCollapsed && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover"></div>
          )}
          {isCollapsed && (
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-0 border-4 border-transparent border-r-popover"></div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
