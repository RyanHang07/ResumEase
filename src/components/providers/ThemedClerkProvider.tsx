'use client';

import { useEffect, useState } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

interface ThemedClerkProviderProps {
  children: React.ReactNode;
}

const darkThemeConfig = {
  baseTheme: dark,
  variables: {
    colorBackground: '#1e1e2e',
    colorInputBackground: '#313244',
    colorInputText: '#cdd6f4',
    colorPrimary: '#89b4fa',
    colorText: '#cdd6f4',
    colorTextSecondary: '#a6adc8',
    colorDanger: '#f38ba8',
    colorSuccess: '#a6e3a1',
    colorWarning: '#f9e2af',
    colorNeutral: '#45475a',
    borderRadius: '0.625rem',
    fontFamily: 'var(--font-geist-sans)',
  },
  elements: {
    card: {
      backgroundColor: '#181825',
      borderColor: '#45475a',
    },
    headerTitle: {
      color: '#cdd6f4',
    },
    headerSubtitle: {
      color: '#a6adc8',
    },
    socialButtonsBlockButton: {
      backgroundColor: '#313244',
      color: '#cdd6f4',
      borderColor: '#45475a',
    },
    formButtonPrimary: {
      backgroundColor: '#89b4fa',
      color: '#1e1e2e',
    },
    formFieldInput: {
      backgroundColor: '#313244',
      color: '#cdd6f4',
      borderColor: '#45475a',
    },
    formFieldLabel: {
      color: '#cdd6f4',
    },
    footerActionLink: {
      color: '#89b4fa',
    },
    userButtonPopoverCard: {
      backgroundColor: '#181825',
      borderColor: '#45475a',
    },
    userButtonPopoverActionButton: {
      color: '#cdd6f4',
      backgroundColor: 'transparent',
    },
    userButtonPopoverActionButtonText: {
      color: '#cdd6f4',
    },
    userButtonPopoverFooter: {
      color: '#a6adc8',
    },
    userButtonPopoverActionButtonIcon: {
      color: '#89b4fa',
    },
    userPreview: {
      borderColor: '#45475a',
    },
    userPreviewMainIdentifier: {
      color: '#cdd6f4',
    },
    userPreviewSecondaryIdentifier: {
      color: '#a6adc8',
    },
    avatarBox: {
      borderColor: '#45475a',
    },
  },
};

const lightThemeConfig = {
  baseTheme: undefined,
  variables: {
    colorBackground: '#ffffff',
    colorInputBackground: '#f7f7f7',
    colorInputText: '#252525',
    colorPrimary: '#252525',
    colorText: '#252525',
    colorTextSecondary: '#8e8e8e',
    colorDanger: '#e5484d',
    colorSuccess: '#30a46c',
    colorWarning: '#f1c40f',
    colorNeutral: '#ebebeb',
    borderRadius: '0.625rem',
    fontFamily: 'var(--font-geist-sans)',
  },
  elements: {
    card: {
      backgroundColor: '#ffffff',
      borderColor: '#ebebeb',
    },
    headerTitle: {
      color: '#252525',
    },
    headerSubtitle: {
      color: '#8e8e8e',
    },
    socialButtonsBlockButton: {
      backgroundColor: '#f7f7f7',
      color: '#252525',
      borderColor: '#ebebeb',
    },
    formButtonPrimary: {
      backgroundColor: '#252525',
      color: '#ffffff',
    },
    formFieldInput: {
      backgroundColor: '#f7f7f7',
      color: '#252525',
      borderColor: '#ebebeb',
    },
    formFieldLabel: {
      color: '#252525',
    },
    footerActionLink: {
      color: '#252525',
    },
    userButtonPopoverCard: {
      backgroundColor: '#ffffff',
      borderColor: '#ebebeb',
    },
    userButtonPopoverActionButton: {
      color: '#252525',
      backgroundColor: 'transparent',
    },
    userButtonPopoverActionButtonText: {
      color: '#252525',
    },
    userButtonPopoverFooter: {
      color: '#8e8e8e',
    },
    userButtonPopoverActionButtonIcon: {
      color: '#252525',
    },
    userPreview: {
      borderColor: '#ebebeb',
    },
    userPreviewMainIdentifier: {
      color: '#252525',
    },
    userPreviewSecondaryIdentifier: {
      color: '#8e8e8e',
    },
    avatarBox: {
      borderColor: '#ebebeb',
    },
  },
};

export const ThemedClerkProvider = ({ children }: ThemedClerkProviderProps) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };

    // Check initial theme from localStorage or DOM
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
    } else if (savedTheme === 'dark' || !savedTheme) {
      setIsDark(true);
    } else {
      // Fallback to checking DOM
      checkTheme();
    }

    // Watch for theme changes using MutationObserver
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <ClerkProvider appearance={isDark ? darkThemeConfig : lightThemeConfig}>
      {children}
    </ClerkProvider>
  );
};
