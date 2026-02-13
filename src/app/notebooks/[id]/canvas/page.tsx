'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CanvasEmbed } from '@/components/CanvasEmbed';

export default function FullScreenCanvas() {
  const params = useParams();
  const router = useRouter();
  const [canvasSlug, setCanvasSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/notebooks/${params.id}`)
      .then((res) => res.json())
      .then((nb) => setCanvasSlug(nb.canvasSlug))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-amber-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (!canvasSlug) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No canvas linked to this notebook yet.</p>
          <button
            onClick={() => router.back()}
            className="text-amber-400 hover:text-amber-300"
          >
            Back to Notebook
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] relative">
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => router.push(`/notebooks/${params.id}`)}
          className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-sm text-white backdrop-blur-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Notebook
        </button>
      </div>
      <CanvasEmbed canvasSlug={canvasSlug} className="h-full w-full" />
    </div>
  );
}
