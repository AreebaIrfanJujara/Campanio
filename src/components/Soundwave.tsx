"use client";

import React from "react";

interface SoundwaveProps {
  color?: string;
  size?: "sm" | "md" | "lg";
}

export const Soundwave: React.FC<SoundwaveProps> = ({ color = "bg-white", size = "md" }) => {
  const heightClasses = {
    sm: "h-8 w-12",
    md: "h-12 w-20",
    lg: "h-16 w-32",
  };

  const barWidthClasses = {
    sm: "w-1",
    md: "w-2",
    lg: "w-3",
  };

  return (
    <div className={`flex items-end justify-center gap-1.5 ${heightClasses[size]} relative`}>
      <div className={`${barWidthClasses[size]} ${color} rounded-full soundwave-bar h-1/2`}></div>
      <div className={`${barWidthClasses[size]} ${color} rounded-full soundwave-bar h-full`}></div>
      <div className={`${barWidthClasses[size]} ${color} rounded-full soundwave-bar h-2/3`}></div>
      <div className={`${barWidthClasses[size]} ${color} rounded-full soundwave-bar h-5/6`}></div>
      <div className={`${barWidthClasses[size]} ${color} rounded-full soundwave-bar h-1/3`}></div>
    </div>
  );
};
