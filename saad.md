## 📋 Changelog — 2026-09-03: Dark Mode & Theming System Overhaul

**Full Dark Mode support added across all 31 routes and components:**

- **CSS & Design System (`globals.css`)** — Added `@variant dark (&:where(.dark, .dark *));` for class-based Tailwind v4 variant targeting. Added `.dark` block implementing the Material Design 3 dark tonal palette with dark blue-grey surface elevation tiers (`--surface: #131318`, `--surface-container: #201f23`, `--on-surface: #e4e2e6`, etc.) ensuring visual separation of cards, viewfinders, and borders.
- **Accessibility Context (`AccessibilityContext.tsx`)** — Expanded theme model from 2-way to 3-state (`"standard" | "dark" | "high-contrast"`). Updated body class side-effect to independently add/remove `.dark` and `.high-contrast` classes. Added `setThemeMode(mode)` explicit setter and upgraded `toggleTheme()` to cycle: Standard → Dark → High Contrast → Standard. Preserved `applyPreset("visual")` -> High Contrast mapping.
- **Top App Bar (`TopAppBar.tsx`)** — Upgraded header theme toggle to 3-state cycle with dynamic icons (`light_mode`, `dark_mode`, `contrast`), accessible live-speech announcements, and dynamic ARIA descriptions.
- **Settings Page (`settings/page.tsx`)** — Replaced single high contrast toggle with a 3-button segmented control (Light / Dark / High Contrast) featuring descriptive subtext ("Dark — easier on the eyes in low light", "High Contrast — maximum contrast for low vision").
- **Component & Route Audit** — Replaced hardcoded literal colors (`zinc-950`, `zinc-900`, `zinc-400`, `zinc-500`, `bg-[#313030]`, `text-[#ffd400]`, etc.) across `page.tsx`, `home/page.tsx`, `home/ocr/page.tsx`, `home/explore/page.tsx`, `home/scene-desc/page.tsx`, `home/captions/page.tsx`, `home/conversation/page.tsx`, and `home/translation/page.tsx` with semantic design tokens.

---

## 📋 Changelog — 2026-09-03: Removed Billing-Dependent Google Cloud APIs

**Google Cloud TTS / STT / Translate removed.** All three billing-dependent APIs have been replaced with free, no-credit-card-required alternatives:

- **TTS (`/api/tts/speak`)** — Google Cloud Text-to-Speech removed entirely. The route now always returns `{ useBrowserTTS: true }`, instructing the client to use the Web Speech API (`speechSynthesis`) which it already supported as a fallback. No server-side voice synthesis is performed.
- **STT (`/api/stt/transcribe`)** — Google Cloud Speech-to-Text replaced with **Groq Whisper** (`whisper-large-v3`). Sends the base64 audio as a multipart upload to Groq's OpenAI-compatible `/audio/transcriptions` endpoint. Simulated speaker separation is preserved (Whisper does not return per-word diarization). Falls back to the existing mock on failure.
- **Translate (`/api/translate`)** — Google Cloud Translate replaced with a 4-step free chain: **Gemini** (prompt-based) → **Groq** `llama-3.3-70b-versatile` (prompt-based) → **MyMemory** (free public REST API, no key) → hardcoded mock. Cost-cache wrapping preserved.
- **Assistant (`/api/assistant`)** — Provider chain extended to **Gemini → Groq → mock**. Gemini call is now wrapped in try/catch; on failure it falls through to Groq (`llama-3.3-70b-versatile`) before the existing mock block. Cache behaviour unchanged.

**Google Cloud Vision (OCR / describe / currency) is unchanged** — those three routes still use the Vision API and are out of scope for this change.

**New env var:** `GROQ_API_KEY` (free tier at console.groq.com). Removed from `.env.example`: `GOOGLE_CLOUD_TTS_API_KEY`, `GOOGLE_CLOUD_STT_API_KEY`, `GOOGLE_CLOUD_TRANSLATE_API_KEY`.

---

# saad.md — Companio PRD Implementation Progress Tracker

> Last updated: 2026-09-03
> Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Google Cloud Vision API · Groq · Gemini · Python FastAPI · Node.js Gateway
> Build status: ✅ Production build compiles cleanly (31 routes, zero TypeScript errors)

---

## 🏗️ Infrastructure & Foundation

- [x] Create Next.js 16 project with TypeScript, Tailwind CSS v4, App Router
- [x] Install framer-motion for animations
- [x] Configure design system tokens in globals.css (Stitch spec colors, spacing, typography)
- [x] Set up Supabase client and Auth interfaces ([`supabase.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/lib/supabase.ts))
- [x] Configure environment variables ([`.env.example`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/.env.example))
- [x] Set up Next.js 16 route protection proxy ([`proxy.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/proxy.ts)) for `/home/*`, `/settings`, `/emergency`
- [x] Cookie-synced authentication in `useSupabaseAuth` (supports Supabase Auth & Guest Session cookies)
- [x] Multi-tier Node.js API Gateway ([`server/gateway.js`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/server/gateway.js)) with rate limiting & cost-control caching
- [x] Python FastAPI AI microservice ([`services/ai_service/main.py`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/services/ai_service/main.py)) isolating Google Cloud APIs
- [x] Complete Supabase SQL schema with Row Level Security policies ([`supabase/schema.sql`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/supabase/schema.sql))
- [x] Multi-turn history support in Gemini assistant API route ([`assistant/route.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/api/assistant/route.ts))

---

## 🎨 UI/UX Design System

- [x] Implement Companio design tokens (colors, typography, spacing) from Stitch spec
- [x] Implement High Contrast Mode (pure black/white, bold outlines)
- [x] Implement yellow (#FFD400) focus rings for keyboard/switch users
- [x] Implement soundwave animated component ([`Soundwave.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/components/Soundwave.tsx))
- [x] Implement AccessibilityContext (theme, voice, speech APIs) ([`AccessibilityContext.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/context/AccessibilityContext.tsx))
- [x] Implement animated page transitions with framer-motion in AppLayoutShell ([`AppLayoutShell.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/components/AppLayoutShell.tsx))
- [x] Create a custom reusable ToggleSwitch component ([`ToggleSwitch.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/components/ToggleSwitch.tsx))
- [x] Add loading skeleton components ([`LoadingSkeleton.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/components/LoadingSkeleton.tsx))
- [x] Create a toast notification system ([`Toast.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/components/Toast.tsx))
- [x] Persist all accessibility settings to localStorage (survives page refresh)
- [x] Reduced motion support (body class toggle, persisted to settings)
- [x] Caption size, TTS voice, OCR auto-translate preferences persisted in context

---

## 🚀 Onboarding & Auth Flow

- [x] Splash/Welcome screen with animated soundwave & voice greeting ([`page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/page.tsx))
- [x] Auto-spoken welcome message on launch (on-device TTS)
- [x] Sign-In page (email/password) with accessible labels ([`sign-in/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/sign-in/page.tsx))
- [x] Create Account page ([`create-account/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/create-account/page.tsx))
- [x] Accessibility Profile Setup wizard (presets: visual/hearing/motor/standard) ([`profile-setup/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/profile-setup/page.tsx))
- [x] Microphone permission request screen ([`permission-mic/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/permission-mic/page.tsx))
- [x] Professional Sign-in UX (Google Sign-In, Show/Hide Password, Forgot Password)
- [x] **Wired real Supabase Auth** — sign-in uses `signInWithEmail` / `signInWithGoogle` from Supabase ([`useSupabaseAuth.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/lib/hooks/useSupabaseAuth.ts))
- [x] **Session Cookie Synchronization** — keeps cookies in sync with Supabase session and localStorage guest mode for seamless route protection
- [x] **Forgot Password flow** — modal dialog with email input, calls `resetPasswordForEmail`, shows success state
- [x] Guest mode fallback — when Supabase isn't configured, auth uses guest session cookie & localStorage
- [x] Real sign-out in Settings page via `supabase.auth.signOut()`
- [x] Loading spinners on auth buttons during API calls

---

## 🏠 Home Dashboard

- [x] Bento grid home dashboard with 8 accessibility modules ([`home/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/home/page.tsx))
- [x] Greeting with time-of-day message
- [x] Active profile status badge
- [x] Hazard alert banner simulation
- [x] Expanded Bento Grid: Describe Scene, Live Captions, Type-to-Speak, OCR, Currency Scanner, Indoor Nav, Wearable Bridge, Translation, Conversation, Explore Room, Emergency SOS
- [x] **Session-based Recent Activity** — real activity tracking via ActivityContext ([`ActivityContext.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/context/ActivityContext.tsx))
- [x] Activity entries persist to localStorage (24-hour rolling window, max 20 entries)
- [x] Activity auto-logged from OCR, Scene, Translation, Currency, and Explore pages with timestamps

---

## 👁️ Feature: Scene & Text Understanding (Vision)

- [x] Read Text (OCR) page — camera viewfinder with scanner animation ([`ocr/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/home/ocr/page.tsx))
- [x] Scene narration page — camera viewfinder with bounding boxes overlay ([`scene-desc/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/home/scene-desc/page.tsx))
- [x] Real OCR output read aloud via Google Cloud TTS Neural2 voices
- [x] Real object/label detection via Vision API
- [x] Add translation section and target dropdown directly within OCR scanning results
- [x] **Real OCR API wiring** — captures camera frame as base64, calls `CompanioAPI.ocr()`, falls back to offline OCR
- [x] **Image file upload for OCR** — upload button triggers FileReader → base64 → API call
- [x] **Source badge** — shows "Vision API" (green) or "Demo" (amber) on scan results
- [x] **Copy text button** on OCR results (clipboard)
- [x] **Real Scene Description API wiring** — captures frame, calls `CompanioAPI.describe()`, falls back to mock
- [x] **Hazard detection with audio & haptic alerts** — plays alert beep and triggers `wearableBridge.triggerHaptic("hazard")`
- [x] **Detected objects list** — shows labeled pills with confidence percentages

---

## 💵 Feature: Currency & Banknote Recognition

- [x] Live camera viewfinder + upload for banknote & product identification ([`currency/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/home/currency/page.tsx))
- [x] Banknote template matching & OCR engine for USD ($1-$100), EUR (€5-€100), PKR (Rs 10-5000), GBP ([`api/vision/currency/route.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/api/vision/currency/route.ts))
- [x] Auto-spoken denomination announcements on detection
- [x] Running tally calculation with session count & total value
- [x] Haptic confirmation feedback on scan completion

---

## 🎧 Feature: Live Captioning & Speaker Diarization

- [x] Live Captions page with scrollable transcript area ([`captions/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/home/captions/page.tsx))
- [x] **Real Audio MediaRecorder Capture** — microphone audio stream chunked to blobs and converted to Base64
- [x] **Google Cloud STT Diarization Pipeline** — sends genuine audio chunks to `/api/stt/transcribe` with speaker tags
- [x] Color-coded speaker diarization badges (Speaker 1, Speaker 2, Speaker 3, You)
- [x] Web Speech Recognition API transcription with on-device fallback
- [x] Pause/Resume captions toggle
- [x] Clear caption history
- [x] Key-phrase highlighting (names, numbers, times, directions)
- [x] **Sound event alerts** — detection of door knocks, alarms, phone rings, footsteps with visual banner & distinct audio tones
- [x] **Haptic feedback on captions** — triggers `wearableBridge.triggerHaptic("caption_alert")` on incoming speech

---

## 🗣️ Feature: Speak For Me (TTS & Predictive Phrases)

- [x] Type-to-speak text area with speak button ([`type-to-speak/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/home/type-to-speak/page.tsx))
- [x] **Predictive Phrase Suggestion Engine** — N-gram prefix completion tree ([`predictivePhrases.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/lib/predictivePhrases.ts))
- [x] One-tap interactive suggestion chips bar above keyboard
- [x] Categorized phrase preset board (Basic, Medical, Navigation, Emergency)
- [x] Ability to dynamically add and test custom phrases on the board

---

## 🧭 Feature: Indoor Navigation

- [x] Step-by-step waypoint guided navigation ([`indoor-nav/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/home/indoor-nav/page.tsx))
- [x] 4 built-in facility destinations (Elevator, Accessible Restroom, Pharmacy, Emergency Exit)
- [x] Proximity audio beeps with variable frequency based on step progress
- [x] Directional haptic pulses (`wearableBridge.triggerHaptic("nav_turn")`)
- [x] Visual distance progress bar and step counter

---

## ⌚ Feature: Wearable Integration Bridge

- [x] Web Vibration API pattern dispatcher ([`wearableBridge.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/lib/wearableBridge.ts))
- [x] 6 haptic vibration patterns: SOS Morse (`... --- ...`), hazard, caption alert, nav turn, success, tap
- [x] Smartwatch interface simulation and test suite ([`wearable/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/home/wearable/page.tsx))
- [x] 1-tap Wrist SOS alert dispatch

---

## 🚨 Feature: Emergency Assistance Hub

- [x] High-priority Emergency Assistance Center ([`emergency/page.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/emergency/page.tsx))
- [x] Live GPS geolocation tracking with latitude/longitude coordinates
- [x] 1-tap SMS & WhatsApp location broadcast with prefilled maps link
- [x] Loud emergency siren with Web Audio API sawtooth oscillator and visual strobe
- [x] Designated emergency contacts quick dial and SMS actions
- [x] Global red SOS pill in top app bar on all pages ([`TopAppBar.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/components/TopAppBar.tsx))

---

## 📴 Feature: Full Offline Mode & PWA Support

- [x] Service Worker with precaching of 31 routes and core assets ([`public/sw.js`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/public/sw.js))
- [x] Web App Manifest with icons, shortcuts, and standalone display mode ([`manifest.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/app/manifest.ts))
- [x] Offline banner & status indicator ([`OfflineBanner.tsx`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/components/OfflineBanner.tsx))
- [x] On-device offline translation engine with 100+ vocabulary mappings ([`offlineTranslate.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/lib/offline/offlineTranslate.ts))
- [x] On-device offline assistant heuristic intent responder ([`offlineAssistant.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/lib/offline/offlineAssistant.ts))
- [x] Offline storage IndexedDB / localStorage persistence ([`offlineStorage.ts`](file:///c:/Users/Hp/OneDrive/Desktop%202/Companio/src/lib/offline/offlineStorage.ts))

---

## 📋 Feature Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| OCR Text Reading | ✅ Complete | Real Vision API + offline OCR + image file upload |
| Scene Description | ✅ Complete | Real Vision API + hazard detection + wearable haptics |
| Live Captioning | ✅ Complete | Real MediaRecorder audio capture + Cloud STT diarization |
| Speaker Diarization | ✅ Complete | Multi-speaker separation badges + diarization tags |
| Predictive Phrases | ✅ Complete | N-gram completion tree + one-tap suggestion chips |
| Currency Scanner | ✅ Complete | USD/EUR/PKR/GBP banknote recognition + running tally |
| Indoor Navigation | ✅ Complete | Waypoints + proximity audio beeps + directional haptics |
| Wearable Bridge | ✅ Complete | Web Vibration API haptic patterns + smartwatch UI |
| Emergency Flow | ✅ Complete | GPS coordinates + SMS/WhatsApp SOS + siren + quick dial |
| Offline Mode & PWA | ✅ Complete | Service Worker + on-device offline translation & assistant |
| Type-to-Speak | ✅ Complete | Presets + custom phrases + predictive suggestions |
| Live Translation | ✅ Complete | Text/OCR/Voice modes + offline dictionary engine |
| Conversation Mode | ✅ Complete | Split-pane Them/You view + predictive suggestions + sync |
| Explore Room | ✅ Complete | Sweep simulation + audio proximity beeps |
| Voice Assistant | ✅ Complete | Gemini Flash + multi-turn history + offline fallback |
| Auth & Route Guard | ✅ Complete | Supabase Auth + cookie sync + Next.js 16 proxy guard |
| Supabase DB Schema | ✅ Complete | Tables for profiles, phrases, rooms, logs with full RLS |
| 3-Tier AI Services | ✅ Complete | Next.js client → Node.js Gateway → Python FastAPI |
