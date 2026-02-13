'use client';

import { useEffect, useCallback } from 'react';
import { isCanvasMessage, CanvasShapeMessage } from '@/lib/canvas-sync';

interface CanvasEmbedProps {
  canvasSlug: string;
  className?: string;
  onShapeUpdate?: (message: CanvasShapeMessage) => void;
}

export function CanvasEmbed({ canvasSlug, className = '', onShapeUpdate }: CanvasEmbedProps) {
  const canvasUrl = `https://${canvasSlug}.rspace.online`;

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!isCanvasMessage(event)) return;
      if (event.data.communitySlug !== canvasSlug) return;
      onShapeUpdate?.(event.data);
    },
    [canvasSlug, onShapeUpdate]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <div className={`relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 ${className}`}>
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <a
          href={canvasUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-xs text-slate-300 backdrop-blur-sm transition-colors"
        >
          Open in rSpace
        </a>
      </div>
      <iframe
        src={canvasUrl}
        className="w-full h-full border-0"
        allow="clipboard-write"
        title="Notes Canvas"
      />
    </div>
  );
}
