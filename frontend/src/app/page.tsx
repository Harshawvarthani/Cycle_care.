'use client';

import React from 'react';
import { Heart } from 'lucide-react';

export default function EntryPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="relative flex items-center justify-center">
        {/* Soft pulsing glow */}
        <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-primary-light opacity-75"></span>
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg">
          <Heart className="h-9 w-9 fill-current animate-pulse" />
        </div>
      </div>
      <h1 className="mt-8 text-2xl font-bold tracking-tight text-text-dark">
        CycleCare
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Opening your personal health space...
      </p>
    </div>
  );
}
