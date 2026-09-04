"use client";

import React from "react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 max-w-4xl mx-auto w-full">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-9 w-48 bg-surface-container-highest dark:bg-surface-container rounded-lg animate-pulse" />
        <div className="h-5 w-72 bg-surface-container-highest dark:bg-surface-container rounded-lg animate-pulse" />
      </div>

      {/* Hero / Banner skeleton */}
      <div className="w-full h-40 bg-surface-container rounded-3xl p-6 flex flex-col justify-between animate-pulse">
        <LoadingSkeleton lines={2} height="h-6" />
      </div>

      {/* Cards skeleton grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border-2 border-outline-variant rounded-2xl p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-highest animate-pulse" />
          <LoadingSkeleton lines={2} height="h-5" />
        </div>
        <div className="bg-surface border-2 border-outline-variant rounded-2xl p-6 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-highest animate-pulse" />
          <LoadingSkeleton lines={2} height="h-5" />
        </div>
      </div>
    </div>
  );
}
