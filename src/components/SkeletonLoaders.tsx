import React from 'react';

// Reusable Pulse Shimmer Line
export const SkeletonPulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} />
);

// 1. PHARMACOLOGY TAB SKELETON LOADER
export const PharmacologySkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-4 animate-fade-in" aria-label="Loading Pharmacology Data">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-900/90 dark:bg-slate-900 border border-slate-800 rounded-xl gap-3 shadow-sm">
        <div className="space-y-2 w-full md:w-1/2">
          <SkeletonPulse className="h-3 w-32 bg-emerald-900/40" />
          <SkeletonPulse className="h-6 w-48 bg-slate-800" />
        </div>
        <SkeletonPulse className="h-7 w-28 bg-slate-800 rounded-lg shrink-0" />
      </div>

      {/* 2-Column Info Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Indications & Usage */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <SkeletonPulse className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-900/50" />
            <SkeletonPulse className="h-4 w-40" />
          </div>
          <div className="space-y-2 pt-1">
            <SkeletonPulse className="h-3.5 w-full" />
            <SkeletonPulse className="h-3.5 w-11/12" />
            <SkeletonPulse className="h-3.5 w-4/5" />
            <SkeletonPulse className="h-3.5 w-2/3" />
          </div>
        </div>

        {/* Card 2: Warnings & Contraindications */}
        <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <SkeletonPulse className="w-4 h-4 rounded-full bg-rose-200 dark:bg-rose-900/50" />
            <SkeletonPulse className="h-4 w-44" />
          </div>
          <div className="space-y-2 pt-1 bg-rose-50/50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-100/50 dark:border-rose-900/30">
            <SkeletonPulse className="h-3.5 w-full bg-rose-100 dark:bg-rose-900/40" />
            <SkeletonPulse className="h-3.5 w-5/6 bg-rose-100 dark:bg-rose-900/40" />
            <SkeletonPulse className="h-3.5 w-3/4 bg-rose-100 dark:bg-rose-900/40" />
          </div>
        </div>
      </div>

      {/* Interaction Checker Skeleton */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md space-y-3 border border-slate-800">
        <div className="flex items-center gap-2">
          <SkeletonPulse className="w-4 h-4 rounded-full bg-amber-400/40" />
          <SkeletonPulse className="h-4 w-52 bg-slate-800" />
        </div>
        <div className="grid gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-2">
              <div className="flex justify-between items-center">
                <SkeletonPulse className="h-3.5 w-36 bg-slate-700" />
                <SkeletonPulse className="h-4 w-16 bg-rose-900/50 rounded" />
              </div>
              <SkeletonPulse className="h-3 w-full bg-slate-700/60" />
              <SkeletonPulse className="h-3 w-4/5 bg-slate-700/60" />
            </div>
          ))}
        </div>
      </div>

      {/* Graph Skeleton Box */}
      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <SkeletonPulse className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950" />
            <div className="space-y-1">
              <SkeletonPulse className="h-4 w-56" />
              <SkeletonPulse className="h-3 w-72" />
            </div>
          </div>
          <SkeletonPulse className="h-7 w-32 rounded-lg" />
        </div>

        <div className="h-64 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center gap-8 opacity-40">
            <div className="w-16 h-16 rounded-full bg-blue-300 dark:bg-blue-800 animate-ping" />
            <div className="w-12 h-12 rounded-full bg-emerald-300 dark:bg-emerald-800 animate-pulse" />
            <div className="w-14 h-14 rounded-full bg-rose-300 dark:bg-rose-800 animate-pulse" />
          </div>
          <div className="z-10 text-center space-y-2">
            <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rendering interaction topology graph...</span>
          </div>
        </div>
      </div>

      {/* Clinical Records Section Skeleton */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <SkeletonPulse className="w-4 h-4 rounded-full bg-blue-500/40" />
          <SkeletonPulse className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <SkeletonPulse className="h-3 w-28 bg-blue-100 dark:bg-blue-950" />
              <SkeletonPulse className="h-3 w-full" />
              <SkeletonPulse className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 2. MEDICAL DICTIONARY ENTITY GRID SKELETON
export const DictionaryGridSkeletonLoader: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in" aria-label="Loading Medical Dictionary">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/85 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs space-y-3 flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <SkeletonPulse className="h-4 w-20 rounded-full" />
              <SkeletonPulse className="h-4 w-4 rounded-md" />
            </div>
            <SkeletonPulse className="h-4 w-3/4" />
            <div className="space-y-1.5 pt-1">
              <SkeletonPulse className="h-3 w-full" />
              <SkeletonPulse className="h-3 w-11/12" />
              <SkeletonPulse className="h-3 w-4/5" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <SkeletonPulse className="h-3 w-20" />
            <SkeletonPulse className="h-3.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};

// 3. ICD-11 SEARCH RESULTS SKELETON
export const IcdSearchSkeletonLoader: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-slate-700 p-2.5 space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-3 w-36 bg-blue-100 dark:bg-blue-950" />
        <SkeletonPulse className="h-3 w-12" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded border border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="space-y-1.5 w-2/3">
            <SkeletonPulse className="h-3.5 w-48" />
            <SkeletonPulse className="h-2.5 w-32" />
          </div>
          <SkeletonPulse className="h-5 w-16 rounded" />
        </div>
      ))}
    </div>
  );
};

// 4. PATHOLOGY DISEASE PROFILE SKELETON LOADER
export const PathologyProfileSkeletonLoader: React.FC = () => {
  return (
    <div className="w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-5 animate-fade-in" aria-label="Loading Pathology Disease Profile">
      {/* Header & Title Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div className="space-y-2.5 w-full sm:w-2/3">
          <div className="flex items-center gap-2">
            <SkeletonPulse className="h-4 w-28 rounded-md bg-blue-100 dark:bg-blue-950" />
            <SkeletonPulse className="h-4 w-20 rounded-md" />
          </div>
          <SkeletonPulse className="h-6 w-3/4" />
          <SkeletonPulse className="h-3.5 w-full" />
          <SkeletonPulse className="h-3.5 w-5/6" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SkeletonPulse className="h-8 w-20 rounded-lg" />
          <SkeletonPulse className="h-8 w-16 rounded-lg" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <SkeletonPulse className="h-2.5 w-20 bg-slate-300 dark:bg-slate-700" />
            <SkeletonPulse className="h-4 w-28 bg-blue-200 dark:bg-blue-900/60" />
          </div>
        ))}
      </div>

      {/* Pathophysiology & Overview Card Skeleton */}
      <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <SkeletonPulse className="w-4 h-4 rounded-full bg-blue-500/40" />
          <SkeletonPulse className="h-4 w-52" />
        </div>
        <div className="space-y-2 pt-1">
          <SkeletonPulse className="h-3.5 w-full" />
          <SkeletonPulse className="h-3.5 w-11/12" />
          <SkeletonPulse className="h-3.5 w-4/5" />
        </div>
      </div>

      {/* Clinical Symptoms Chips Skeleton */}
      <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <SkeletonPulse className="w-4 h-4 rounded-full bg-rose-500/40" />
          <SkeletonPulse className="h-4 w-44" />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <SkeletonPulse className="h-6 w-28 rounded-lg bg-rose-100/70 dark:bg-rose-950/40" />
          <SkeletonPulse className="h-6 w-36 rounded-lg bg-rose-100/70 dark:bg-rose-950/40" />
          <SkeletonPulse className="h-6 w-24 rounded-lg bg-rose-100/70 dark:bg-rose-950/40" />
          <SkeletonPulse className="h-6 w-32 rounded-lg bg-rose-100/70 dark:bg-rose-950/40" />
        </div>
      </div>

      {/* Diagnostic & Treatment Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-2">
          <SkeletonPulse className="h-4 w-40" />
          <SkeletonPulse className="h-3.5 w-full" />
          <SkeletonPulse className="h-3.5 w-4/5" />
        </div>
        <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-2">
          <SkeletonPulse className="h-4 w-40" />
          <SkeletonPulse className="h-3.5 w-full" />
          <SkeletonPulse className="h-3.5 w-4/5" />
        </div>
      </div>
    </div>
  );
};
