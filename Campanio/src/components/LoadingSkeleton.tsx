"use client";

import React from "react";

interface LoadingSkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 3,
  height = "h-5",
  className = "",
}) => {
  return (
    <div className={`w-full flex flex-col gap-3 animate-pulse ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, idx) => {
        // Vary width slightly for organic text skeleton look
        const widthClass = idx === lines - 1 ? "w-4/5" : "w-full";
        return (
          <div
            key={idx}
            className={`${height} ${widthClass} bg-surface-container-highest dark:bg-surface-container rounded-lg`}
          />
        );
      })}
    </div>
  );
};
