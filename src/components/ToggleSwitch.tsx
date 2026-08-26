"use client";

import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  id,
}) => {
  return (
    <div className="flex items-center justify-between py-2 gap-4 w-full">
      <div className="flex flex-col text-left">
        <label htmlFor={id} className="font-semibold text-lg text-on-surface cursor-pointer">
          {label}
        </label>
        {description && (
          <span className="text-sm text-on-surface-variant leading-relaxed">
            {description}
          </span>
        )}
      </div>

      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`w-[52px] h-[28px] rounded-full p-0.5 transition-colors cursor-pointer relative focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--tertiary-fixed)] ${
          checked ? "bg-primary" : "bg-outline/25"
        }`}
      >
        <span
          className={`block w-[24px] h-[24px] rounded-full bg-white transition-all shadow-md ${
            checked ? "translate-x-[24px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};
