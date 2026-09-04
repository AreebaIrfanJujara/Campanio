"use client";

import React from "react";
import Link from "next/link";
import { useAccessibility } from "@/context/AccessibilityContext";

export default function PrivacyPage() {
  const { speak } = useAccessibility();

  return (
    <div className="flex-grow flex flex-col px-margin-edge py-stack-lg gap-6 w-full text-on-surface">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-display-ocr">Privacy & Data Retention</h1>
        <p className="text-lg text-on-surface-variant leading-relaxed">
          How Companio handles camera frames, audio streams, and user accessibility data.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Core Guarantee */}
        <section className="bg-surface-container rounded-3xl p-6 border-2 border-emerald-500/30 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
            <h2 className="text-xl font-bold">Zero Permanent Bystander Retention</h2>
          </div>
          <p className="text-base leading-relaxed text-on-surface">
            Companio is designed strictly for assistive real-time comprehension. All camera frames, OCR sweeps, and audio microphone recordings are processed <strong>ephemerally in memory (RAM)</strong> and discarded immediately following analysis.
          </p>
        </section>

        {/* Policies breakdown */}
        <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant flex flex-col gap-4">
          <h2 className="text-lg font-bold border-b border-outline-variant pb-2">Policy Principles</h2>
          
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-1">no_photography</span>
              <div>
                <strong className="block text-base">Ephemeral Image & Video Processing</strong>
                <span className="text-sm text-on-surface-variant">
                  Camera frames captured during Read Text (OCR) or Scene Narration are never saved to cloud storage or long-term disk.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-1">mic_off</span>
              <div>
                <strong className="block text-base">Real-time Audio Streams</strong>
                <span className="text-sm text-on-surface-variant">
                  Live Captions and Speech-to-Text streams are transcribed on-device or via secure streaming endpoints without long-term audio storage.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-1">auto_delete</span>
              <div>
                <strong className="block text-base">24-Hour Rolling Log Expiration</strong>
                <span className="text-sm text-on-surface-variant">
                  Local activity logs and caption buffers automatically expire and purge every 24 hours. Users can also purge them instantly in Settings.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-1">security</span>
              <div>
                <strong className="block text-base">On-Device Offline Fallbacks</strong>
                <span className="text-sm text-on-surface-variant">
                  When offline, all TTS, translation phrasebooks, and conversational guidance remain entirely local to your device.
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex gap-4">
          <Link
            href="/settings"
            className="h-12 px-6 bg-primary hover:bg-primary-container text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            Manage Privacy in Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
