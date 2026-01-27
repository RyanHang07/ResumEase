'use client';

import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SidebarView = 'templates' | 'editor' | 'saved';

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

const NavItem = ({
  icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: NavItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center w-full gap-3 px-3 py-3 text-sm font-medium transition-colors rounded-md mx-2 relative overflow-hidden',
        isCollapsed ? 'justify-center mx-1 px-2' : '',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
      aria-label={label}
      aria-pressed={isActive}
    >
      {icon}
      {!isCollapsed && <span className="relative z-0">{label}</span>}
    </button>
  );
};

export const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const { isSignedIn } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true); // Default to dark mode
  const [mounted, setMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const heartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    
    // Default to dark mode if no saved preference
    if (savedTheme === 'dark' || !savedTheme) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
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
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col gap-1 py-2 overflow-hidden">
        <NavItem
          icon={<LayoutTemplate className="h-4 w-4 shrink-0" />}
          label="Templates"
          isActive={activeView === 'templates'}
          isCollapsed={isCollapsed}
          onClick={() => onViewChange('templates')}
        />
        <NavItem
          icon={<FileEdit className="h-4 w-4 shrink-0" />}
          label="Editor"
          isActive={activeView === 'editor'}
          isCollapsed={isCollapsed}
          onClick={() => onViewChange('editor')}
        />
        {isSignedIn && (
          <NavItem
            icon={<Save className="h-4 w-4 shrink-0" />}
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
            onClick={toggleTheme}
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
              aria-label="LinkedIn"
              tabIndex={0}
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href={AUTHOR_INFO.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="GitHub"
              tabIndex={0}
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href={AUTHOR_INFO.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Portfolio"
              tabIndex={0}
            >
              <Globe className="h-4 w-4" />
            </a>
            <div
              ref={heartRef}
              className={cn('relative', isCollapsed ? 'mt-1' : '')}
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
            >
              <Heart className="h-4 w-4 m-1 text-red-500 fill-red-500 cursor-default" />
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip Portal */}
      {mounted && showTooltip && typeof window !== 'undefined' && createPortal(
        <div
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
