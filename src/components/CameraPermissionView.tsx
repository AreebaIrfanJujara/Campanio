"use client";

import React, { useRef } from "react";

interface CameraPermissionViewProps {
  onRetry: () => void;
  onImageSelected?: (base64: string) => void;
  title?: string;
  subtitle?: string;
}

export const CameraPermissionView: React.FC<CameraPermissionViewProps> = ({
  onRetry,
  onImageSelected,
  title = "Camera Permission Required",
  subtitle = "Companio needs camera access to scan text, narrate your surroundings, and detect obstacles in real-time."
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageSelected) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onImageSelected(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full h-full min-h-[380px] bg-surface-container-lowest border-2 border-outline-variant rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-5 shadow-inner">
      <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary shadow-sm">
        <span className="material-symbols-outlined text-4xl">videocam_off</span>
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h3 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">{title}</h3>
        <p className="text-base text-on-surface-variant font-semibold leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm mt-2">
        <button
          type="button"
          onClick={onRetry}
          className="flex-grow h-14 bg-primary hover:bg-primary-container text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-2xl">videocam</span>
          Enable Camera Permission
        </button>

        {onImageSelected && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-grow h-14 bg-surface hover:bg-surface-container border-2 border-outline font-bold text-base text-on-surface rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-2xl">upload_file</span>
              Upload Photo Instead
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl p-3 max-w-md mt-1 text-left flex items-start gap-2.5">
        <span className="material-symbols-outlined text-primary text-xl mt-0.5 shrink-0">info</span>
        <p className="text-xs text-on-surface-variant font-medium leading-normal">
          <strong className="text-on-surface">Browser Tip:</strong> If permission was previously blocked, click the lock or tune icon in your address bar (top left), set <strong className="text-on-surface">Camera</strong> to <strong className="text-primary font-bold">Allow</strong>, and tap Enable above.
        </p>
      </div>
    </div>
  );
};
