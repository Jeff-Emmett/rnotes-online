'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    // Check if already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Check dismiss cooldown (24h)
    const dismissedAt = localStorage.getItem('pwa_dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 86400000) return;

    setShowBanner(true);

    // Capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // No native prompt available — show manual instructions
      setShowInstructions(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem('pwa_dismissed', Date.now().toString());
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">📲</span>
        <div className="flex-1 min-w-0">
          {showInstructions ? (
            isIOS ? (
              <div>
                <p className="text-sm font-semibold text-white mb-1">Add to Home Screen</p>
                <p className="text-xs text-slate-400">
                  Tap{' '}
                  <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                    ⎋ Share
                  </span>{' '}
                  then{' '}
                  <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                    Add to Home Screen
                  </span>
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-white mb-1">Install rNotes</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  1. Tap{' '}
                  <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                    ⋮
                  </span>{' '}
                  (three dots) at top-right
                  <br />
                  2. Tap{' '}
                  <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                    Add to Home screen
                  </span>
                  <br />
                  3. Tap{' '}
                  <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                    Install
                  </span>
                </p>
              </div>
            )
          ) : (
            <div>
              <p className="text-sm font-semibold text-white">Install rNotes</p>
              <p className="text-xs text-slate-400">Add to your home screen for quick access</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!showInstructions && (
            <button
              onClick={handleInstall}
              className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors"
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none transition-colors"
            title="Dismiss"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}
