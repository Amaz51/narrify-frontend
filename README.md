# Narrify — AI Audiobook Generation Platform

> **Turn any PDF into a professional, multi-speaker audiobook.**  
> Powered by XTTS v2 · NLLB-200 · spaCy · FastAPI (backend)

Narrify is a production-grade SaaS frontend built with **Next.js 16**, **TypeScript**, and **Tailwind CSS v4**. It provides a fully animated, premium UI for every stage of the audiobook generation pipeline — from PDF upload to multi-speaker synthesis and playback.

---

## Table of Contents

1. [Tech Stack](#-tech-stack)
2. [Project Structure](#-project-structure)
3. [Getting Started](#-getting-started)
4. [Pages](#-pages)
   - [Homepage `/`](#1-homepage-)
   - [Create Wizard `/create`](#2-create-wizard-create)
   - [Dashboard `/dashboard`](#3-dashboard-dashboard)
   - [Voice Library `/voices`](#4-voice-library-voices)
   - [Audiobook Detail `/audiobook/[id]`](#5-audiobook-detail-audiobookid)
   - [Settings `/settings`](#6-settings-settings)
   - [Login `/auth/login`](#7-login-authlogin)
   - [Register `/auth/register`](#8-register-authregister)
5. [Components](#-components)
6. [State Management](#-state-management)
7. [Design System](#-design-system)
8. [Backend Integration](#-backend-integration)
9. [Environment Variables](#-environment-variables)

---

## 🚀 Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + custom CSS design tokens |
| Animations | Framer Motion |
| State Management | Zustand (global wizard state) |
| Icons | Lucide React |
| HTTP Client | Axios with interceptors |
| Audio Visualization | WaveSurfer.js (integration-ready) |
| Font | Inter (Google Fonts) |

---

## 📂 Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Homepage (landing page)
│   ├── layout.tsx              # Root layout (fonts, providers)
│   ├── create/
│   │   └── page.tsx            # Audiobook creation wizard
│   ├── dashboard/
│   │   └── page.tsx            # User audiobook library
│   ├── voices/
│   │   └── page.tsx            # Voice library & cloning
│   ├── audiobook/
│   │   └── [id]/page.tsx       # Audiobook detail / player
│   ├── settings/
│   │   └── page.tsx            # Account & app settings
│   └── auth/
│       ├── login/page.tsx      # Login page
│       └── register/page.tsx   # Registration page
│
├── components/
│   ├── wizard/
│   │   ├── WizardContainer.tsx # Step stepper + transition wrapper
│   │   ├── Step1Upload.tsx     # PDF upload step
│   │   ├── Step2Language.tsx   # Language detection & translation
│   │   ├── Step3Speakers.tsx   # Speaker detection & voice config
│   │   └── Step4Generation.tsx # Generation progress & audio player
│   ├── layout/
│   │   └── MainLayout.tsx      # Navbar + page shell
│   └── ui/
│       ├── button.tsx          # Button component (variants)
│       └── card.tsx            # Card component
│
├── stores/
│   └── useNarrifyStore.ts      # Zustand global wizard store
│
├── services/
│   └── api.ts                  # Axios instance + API helpers
│
├── types/
│   └── index.ts                # Shared TypeScript types
│
├── styles/
│   └── globals.css             # Design tokens, animations, utilities
│
├── utils/
│   └── cn.ts                   # Class name merge utility
│
└── assets/
    └── logo/
        └── NarrifyLogo.tsx     # SVG logo component
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start development server (http://localhost:3000)
npm run dev

# 3. Build for production
npm run build

# 4. Start production server
npm start
```

### Fix Audit Vulnerabilities (Optional)
```bash
npm audit fix
```

---

## 📄 Pages

---

### 1. Homepage `/`

**File:** `src/app/page.tsx`

The marketing landing page. Designed to convert visitors into users.

#### Sections & Functionality

| Section | Details |
|---|---|
| **Navbar** | Logo, nav links (Dashboard, Create, Voice Library, Settings), notification bell, user avatar |
| **Hero** | Bold headline with gradient text, subtitle, two CTAs ("Create Free Audiobook" + "Try Demo Samples"). Right side: animated floating mock app card showing a Harry Potter audiobook processing — live waveform bars, progress bar at 46%, speaker gender badges (HARRY · MALE, HERMIONE · FEMALE, NARRATOR · NEUTRAL), "Chapter 3 Ready" completion popup, "200+ Languages" floating stat chip. Both cards animate with a float loop |
| **Stats Bar** | 4 animated stat cards: 200+ Languages, 10K+ Audiobooks, 2–3min/chapter, 99.2% Uptime |
| **How It Works** | 4 step cards with gradient icons and connector lines: Upload PDF → Select Language → Configure Speakers → Generate & Download |
| **Features Grid** | 6 feature cards (Multi-Speaker Detection, 200+ Languages, Emotion-Aware Prosody, Voice Cloning, Async Batch Processing, Multi-Format Export) with color-coded icons and type tags |
| **Use Cases** | 6 persona tiles: Students, Accessibility, Authors, Language Learners, Content Creators, Enterprises |
| **Live Demo Samples** | 3 clickable demo audiobook cards (Harry Potter → Urdu, German News → English, English Story → Hindi). Each has a waveform visualization and a play/pause toggle. Clicking plays an animated waveform state |
| **Testimonials** | 3 star-rated user quotes with avatar initials and role |
| **CTA Banner** | Full-width gradient banner with "Create Your First Audiobook" and "Sign In" buttons |

#### Animations
- Hero text: fade + slide up stagger on load
- Hero card: `animate-float` (6s loop)
- Floating stat badge: separate float with opposite phase
- Section headers: `whileInView` fade+slide from `viewport: { once: true }`
- Demo card waveform bars: color toggle on play state

---

### 2. Create Wizard `/create`

**File:** `src/app/create/page.tsx`  
**Container:** `src/components/wizard/WizardContainer.tsx`

A 4-step guided wizard to create an audiobook. All state is managed globally via Zustand.

#### Wizard Stepper (WizardContainer)
- 4 icon-based step indicators (Upload, Globe, Users, Headphones icons)
- Active step: blue border, `scale-110`, pulse ring animation
- Completed step: gradient background with a checkmark icon
- Animated gradient connector line grows left→right as steps complete
- Step label + subtitle below each indicator (hidden on mobile)
- **Transition:** each step slides in/out with a blur + X-axis translate animation using `AnimatePresence mode="wait"`

---

#### Step 1 — Upload PDF

**File:** `src/components/wizard/Step1Upload.tsx`

| Feature | Detail |
|---|---|
| **Drag & Drop Zone** | Full drag-and-drop support. Border turns purple and zone scales up on drag hover |
| **Click to Upload** | Clicking the zone opens the file picker (`<input type="file" accept=".pdf">`) |
| **File Validation** | Rejects non-PDF files with animated error state. Rejects files > 50MB |
| **Upload Progress** | Simulated upload progress bar fills from 0→100% once a file is selected. Shows filename, file size, and a remove (×) button |
| **Completion State** | Green checkmark replaces × button at 100%. Message "File validated — click Next to continue" appears |
| **Error State** | Red zone, error icon, error message, "Try Again" button |
| **Requirements Chips** | 3 info chips: PDF Format / Max 50MB / Any Language |
| **Demo Sample Selector** | "No PDF? Try a demo sample →" toggle reveals 3 pre-built demo cards (Harry Potter EN, German News DE, Urdu Story UR). Clicking a demo loads it as a mock file |
| **Next Button** | Disabled until `uploadProgress === 100`. Navigates to Step 2 on click |

---

#### Step 2 — Language Settings

**File:** `src/components/wizard/Step2Language.tsx`

| Feature | Detail |
|---|---|
| **Source Language Card** | Displays auto-detected language (from Zustand store, default: English) with flag emoji and "Auto-detected" green badge |
| **Translation Toggle** | On/Off switch. When OFF: audiobook generates in source language. When ON: NLLB-200 translation pipeline is enabled |
| **Popular Pairs** | 5 quick-select buttons: English→Urdu, English→Arabic, German→English, English→Hindi, English→Mandarin. Clicking pre-fills language selection |
| **Language Search** | Search input filters the 18-language grid by name or native name |
| **Language Grid** | 18 languages with flag emoji, native name, and RTL badge (Urdu, Arabic, Hebrew, Persian). Selected language highlighted in blue |
| **RTL Warning Banner** | Appears when an RTL language is selected: explains that Narrify mirrors text direction and adapts dialogue markers |
| **Translation Summary** | Shows "Source → Target" language pipeline with "+5-10 seconds" note |
| **No Translation Note** | When OFF: shows "Audiobook will be generated in [Language]" |
| Back / Next navigation buttons |

**Supported Languages (18):** English, Spanish, French, German, Mandarin, Urdu, Arabic, Hindi, Japanese, Korean, Portuguese, Russian, Turkish, Hebrew, Persian, Italian, Polish, Dutch

---

#### Step 3 — Speaker Configuration

**File:** `src/components/wizard/Step3Speakers.tsx`

**Phase A — Analysis Loader** (shown first, ~5 seconds):

| Feature | Detail |
|---|---|
| **Animated Spinner** | Dual-ring rotating spinner with Sparkles icon pulsing in center |
| **Live Log Messages** | 7 sequential status messages animate in/out (NLP parsing → segmentation → speaker detection → gender inference → emotion analysis → voice assignment → finalizing) |
| **Progress Bar** | Fills 0→100% as analysis runs |
| **Step Dot Indicators** | 7 dots grow/color as each analysis phase completes |
| **Live Stats Preview** | 3 cards progressively reveal real values: Segments found, Speakers found, Emotions detected |

**Phase B — Speaker Cards** (after analysis completes):

Displays 4 detected speaker cards (Narrator, Harry, Hermione, Dumbledore):

| Feature | Detail |
|---|---|
| **Name Editing** | Click any speaker name to enter inline edit mode. Press Enter or click ✓ to save |
| **Gender Badge** | Color-coded: blue (male), pink (female), slate (neutral) |
| **Voice Picker** | Dropdown showing 2–3 gender-matched voices with type label (Studio/Natural/Neural). "Upload Custom Voice" option at bottom |
| **Voice Preview** | Volume icon button — clicking animates an equalizer waveform for 2.5 seconds |
| **Emotion Slider** | 0.0–1.0 range. Labels: Calm → Intense. Current label shown (Calm / Subtle / Moderate / Expressive / Intense) |
| **Speed Slider** | 0.5x–2.0x range. Labels: Slow → Fast. Current value + label shown |
| **Clone Voice Button** | Dashed button at bottom of each card for uploading a custom voice clone |
| **Processing Stats** | 4 stat chips: Total Segments / Unique Speakers / Emotion Profiles / Est. Duration |
| **Gender Summary Badges** | Header area shows count per gender (♂ 2 Male, ♀ 1 Female, ◎ 1 Neutral) |
| **Info Toast** | "Click any speaker name to rename it" instruction banner |

---

#### Step 4 — Generation & Player

**File:** `src/components/wizard/Step4Generation.tsx`

**Phase A — Processing** (shown while generating):

| Feature | Detail |
|---|---|
| **Large Progress %** | Current percentage displayed prominently (0–100%) |
| **Progress Bar** | Gradient fill with shimmer animation |
| **Remaining Time** | Live countdown: "~Xm Ys remaining" + elapsed timer |
| **Terminal-style Log** | Dark console panel showing Celery steps in sequence: Queue workers → Translate (NLLB-200) → Segment → Synthesize per speaker → Apply emotion → Merge → Encode MP3/WAV/M4B → Upload CDN. Each completed step gets a green checkmark |
| **Per-Speaker Progress** | One progress bar per speaker with a pulsing dot (blue = active, green = done) and percentage |
| **Warning Banner** | "Don't close this tab" amber warning |

**Phase B — Completed**:

| Feature | Detail |
|---|---|
| **Success Animation** | Spring-animated green checkmark circle entrance |
| **Generation Stats** | Time taken, speaker count, TTS model used |
| **Waveform Player** | 100 animated waveform bars. Bars to the left of playhead are colored (blue/purple/cyan by speaker section), bars to the right are grey. Selected bars animate height when playing |
| **Speaker Color Legend** | Color-coded legend linking waveform colors to speaker names |
| **Scrubable Playhead** | Click anywhere on the waveform track to jump playback position. Playhead thumb draggable |
| **Time Display** | Current position + total duration (42:15) |
| **Playback Controls** | Skip Back, Play/Pause (large circular button with glow), Skip Forward, Mute toggle, Settings, Share, New button |
| **Download Format Cards** | 3 cards: MP3 320kbps 48.2MB, WAV 48kHz/24-bit 312MB, M4B with Chapter Marks 52.1MB. Hover reveals Download label |
| **Completion Stats Grid** | Total Segments / Unique Speakers / Audio Duration / Generation Time |
| **Action Buttons** | "View in Dashboard" (primary) + "Create Another" (resets wizard state) |

---

### 3. Dashboard `/dashboard`

**File:** `src/app/dashboard/page.tsx`

The main library page for managing all audiobooks.

| Feature | Detail |
|---|---|
| **Page Header** | Title, subtitle, "Create New Audiobook" button (links to `/create`) |
| **Stats Grid** | 4 cards: Total Audiobooks (12), Processing (1, spinning icon), Pages Narrated (2,450), Hours Generated (84h). Each has a trend indicator |
| **Voice Cloning Promo Banner** | Gradient purple banner: "Try Voice Cloning — Clone any voice with just 6 seconds of audio." CTA links to `/voices` |
| **Search Bar** | Filters audiobooks by title or author in real time |
| **Status Filter Tabs** | All / Completed / Processing / Failed — filters the list |
| **Audiobook List Rows** | Each row shows: color gradient thumbnail, title (links to `/audiobook/[id]`), author, status badge, duration, speaker count, language pair (e.g. English → Urdu), segment count, date |
| **Status Badges** | Completed (green ✓), Processing (amber pulsing spinner), Failed (red !) |
| **Processing Progress** | In-progress rows show an inline amber progress bar + percentage |
| **Row Actions** | Completed: Download icon + Play button. Failed: "Retry" button. All: ⋮ context menu |
| **Context Menu** | Per-row dropdown: Open Details, Download, Share, Delete (red) |
| **Empty State** | Icon + "No audiobooks found" + "Create Your First Audiobook" CTA |
| **Animations** | Each row fades + slides in with stagger delay. Exiting rows slide left |

**Mock Audiobooks Shown:**
1. The Great Gatsby — Completed · EN→EN · 4 speakers · 6h 12m
2. Physics Research Paper v2 — Processing 65% · EN→UR · 1 speaker
3. Urdu Poetry Collection — Completed · UR→EN · 2 speakers · 1h 5m
4. Harry Potter - Chapter 1 — Completed · EN→EN · 4 speakers · 42m
5. German Business Report — Failed · DE→EN · 1 speaker

---

### 4. Voice Library `/voices`

**File:** `src/app/voices/page.tsx`

Browse, preview, star, and select AI voices. Clone custom voices.

| Feature | Detail |
|---|---|
| **Page Header** | Title, total voice count, cloned voice count, "Clone New Voice" button |
| **Search** | Filters by voice name or mood in real time |
| **Gender Filter** | 4 buttons: All / ♂ Male / ♀ Female / ◎ Neutral |
| **Category Pills** | All Voices / Studio / Natural / Neural / Cloned / ★ Starred |
| **Language Filter** | All / English / Urdu / Arabic / French / German |
| **Voice Cards Grid** | Responsive 2–4 column grid. Each card shows: |
| — Voice icon | Gradient icon, turns to narrify gradient on hover |
| — Featured badge | ✦ amber badge for featured voices |
| — Cloned badge | 🪄 blue badge for user-cloned voices |
| — Star button | Toggle favorite. Starred voices appear in Starred filter |
| — Gender badge | Color-coded (blue/pink/slate) |
| — Type badge | Color-coded: Studio (blue), Natural (green), Neural (purple), Cloned (amber) |
| — Language & Mood | Globe icon + language name · mood descriptor |
| — Animated Waveform | 10-bar mini waveform that animates while playing, dimmed otherwise |
| — Preview Button | Play → stop toggle (3-second preview simulation with animated bars) |
| — Select Button | Becomes green checkmark when selected |
| **Empty State** | "No voices match your filters" with "Clear all filters" link |
| **Clone CTA Section** | Dark full-width section: "Your Voice. Any Character." — Upload 6–30s audio, no training time |
| **Voice Clone Modal** | Triggered by "Clone New Voice". Contains: voice name input, audio file drop zone (MP3/WAV/M4A, 6–30s), timing note, Cancel + Clone Voice buttons |

**Voices Available (12):**
James (Studio/M/EN), Sophia (Natural/F/EN), Marcus (Neural/M/EN), Elena (Studio/F/FR), The Professor (Neural/M/EN), Aria (Natural/F/EN), Tariq (Neural/M/UR), Amara (Natural/F/AR), Alex (Neural/N/EN), My Voice Clone (Cloned/M/EN), Child Storyteller (Natural/N/EN), Hans (Studio/M/DE)

---

### 5. Audiobook Detail `/audiobook/[id]`

**File:** `src/app/audiobook/[id]/page.tsx`

Dynamic route showing detailed info and playback for a single audiobook.

| Feature | Detail |
|---|---|
| **Back Button** | Ghost button → `/dashboard` |
| **Hero Section** | Large gradient thumbnail square (headphones icon) + title, author, "Completed" badge, generation date |
| **Play Controls** | "Listen Now / Pause Narrating" toggle button (large gradient), Download button, Share button |
| **Chapters & Speakers List** | Each chapter row shows: color bar (speaker color), chapter name, primary speaker name & voice, duration timestamp. Hover reveals play button |
| **Settings Used Sidebar Card** | Shows Voice Quality (Ultra-HD), Language, Sample Rate (48kHz), Source Format (PDF) |
| **Regenerate CTA** | Gradient card: "Need a revision? Regenerate with different speed or emotion settings" |

---

### 6. Settings `/settings`

**File:** `src/app/settings/page.tsx`

Account and app configuration page with a sidebar navigation layout.

| Section | Features |
|---|---|
| **Profile** | Avatar (click to change), Full Name field, Email Address field, Save Changes button |
| **Appearance** | Theme selector: Light / Dark / System (icon buttons) |
| **Billing** | (Placeholder section) |
| **Security** | (Placeholder section) |
| **API & Integration** | Masked API key display (`nr_live_••••••••4f2a`), Reveal button, Regenerate Key button |

Sidebar: 5 nav items. Active item is highlighted with white card + blue text + ring shadow.

---

### 7. Login `/auth/login`

**File:** `src/app/auth/login/page.tsx`

Full-page auth form (no layout shell — standalone page).

| Feature | Detail |
|---|---|
| **Logo** | NarrifyLogo centered at top, links back to `/` |
| **Heading** | "Welcome back" + subtitle |
| **OAuth Buttons** | "Continue with Google" (colored SVG logo), "Continue with GitHub" (icon) |
| **Divider** | "Or continue with" separator |
| **Email Field** | `type="email"`, placeholder, focus ring |
| **Password Field** | `type="password"`, "Forgot password?" link |
| **Sign In Button** | Full-width gradient button with arrow icon, links to `/dashboard` |
| **Footer Link** | "Don't have an account? Sign up for free" → `/auth/register` |
| **Animation** | Entire card fades and slides up on mount |

---

### 8. Register `/auth/register`

**File:** `src/app/auth/register/page.tsx`

Mirrors login layout with additional fields (Full Name, email, password, confirm password, terms checkbox).

---

## 🧩 Components

### `components/layout/MainLayout.tsx`
Wraps all interior pages. Contains:
- Top navigation bar with logo, nav links (Dashboard, Create, Voice Library, Settings), notification bell, user avatar
- Active route highlighting on nav items
- Full-height content area with `mesh-bg` gradient body

### `components/wizard/WizardContainer.tsx`
- 4-step icon stepper (Upload/Globe/Users/Headphones)
- Animated gradient connector progress line
- Pulse ring on active step
- Blur + slide `AnimatePresence` transitions between steps

### `components/ui/button.tsx`
Variants: `default`, `narrify` (indigo→purple gradient), `outline`, `ghost`, `destructive`, `secondary`, `link`

### `components/ui/card.tsx`
`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

---

## 🗂 State Management

**File:** `src/stores/useNarrifyStore.ts`  
Global Zustand store. Persists across all 4 wizard steps.

| State Field | Type | Purpose |
|---|---|---|
| `currentStep` | `1 \| 2 \| 3 \| 4` | Active wizard step |
| `file` | `File \| null` | Uploaded PDF file object |
| `sourceLanguage` | `string` | Detected source language (default: "English") |
| `targetLanguage` | `string` | Target language for translation |
| `speakers` | `Speaker[]` | Detected speaker list with voice/emotion/speed config |
| `isProcessing` | `boolean` | Whether async pipeline is running |
| `progress` | `number` | 0–100 pipeline completion % |
| `taskId` | `string \| null` | Backend Celery task ID (for polling) |

**Speaker object:**
```ts
type Speaker = {
  id: string;
  name: string;             // Editable character name
  gender: 'male' | 'female' | 'neutral';
  voiceId?: string;         // Selected voice from library
  emotion: number;          // 0.0 (calm) → 1.0 (intense)
  speed: number;            // 0.5x → 2.0x
}
```

**Actions:** `setStep`, `setFile`, `setLanguages`, `setSpeakers`, `updateSpeaker`, `setIsProcessing`, `setProgress`, `setTaskId`, `resetWizard`

---

## 🎨 Design System

**File:** `src/styles/globals.css`

| Token / Utility | Value / Purpose |
|---|---|
| `narrify-gradient` | `linear-gradient(135deg, #4F46E5 → #9333EA)` — primary brand gradient |
| `narrify-text-gradient` | Same gradient applied as text fill |
| `narrify-blue` | `#4F46E5` (Indigo 600) |
| `narrify-purple` | `#9333EA` (Purple 600) |
| `narrify-cyan` | `#06B6D4` (Cyan 500) |
| `glassmorphism` | `backdrop-blur-lg + rgba white bg + white border` |
| `mesh-bg` | Radial gradient background (blue/purple/cyan blobs) |
| `progress-bar` | Gradient fill + shimmer overlay animation |
| `badge-male/female/neutral` | Color tokens for speaker gender badges |
| `card-hover` | `translateY(-3px)` + shadow on hover |
| `animate-float` | 6s ease-in-out Y loop |
| `animate-pulse-glow` | Blue/purple box-shadow pulse |
| `animate-shimmer` | Skeleton loading shimmer |
| `waveform-bar` | Scale Y animation for audio bars |
| CSS Variables | Full light + dark mode token set via HSL `--background`, `--primary`, etc. |
| Typography | Inter (300–900 weight) via Google Fonts |
| Border Radius | `--radius: 0.875rem` base |

---

## 🔌 Backend Integration

**File:** `src/services/api.ts`

Pre-configured Axios instance. To connect to the FastAPI backend:

1. Set the environment variable:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

2. Replace mock data / simulated timeouts in wizard steps with real API calls:

| Step | Frontend Action | Backend Endpoint |
|---|---|---|
| Step 1 | File upload | `POST /api/v1/audiobooks/upload` |
| Step 2 | Language detection | `GET /api/v1/detect-language` |
| Step 3 | Speaker analysis | `POST /api/v1/analyze-speakers` |
| Step 4 | Trigger generation | `POST /api/v1/generate` |
| Step 4 | Poll progress | `GET /api/v1/tasks/{task_id}` |
| Dashboard | List audiobooks | `GET /api/v1/audiobooks` |
| Voice Library | List voices | `GET /api/v1/voices` |
| Voice Cloning | Upload sample | `POST /api/v1/voices/clone` |
| Audiobook Detail | Get by ID | `GET /api/v1/audiobooks/{id}` |

The `taskId` field in Zustand is specifically designed to store the Celery task ID returned by the backend after generation starts, enabling polling or WebSocket updates on Step 4.

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
# Backend API URL (FastAPI)
NEXT_PUBLIC_API_URL=http://localhost:8000

# OAuth (optional)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

---

## 📝 Notes

- All data shown in the UI (audiobook list, speakers, voices) is **mock/simulated** — ready to be replaced with real API responses
- The wizard simulation timers in Steps 3 & 4 mimic realistic backend latency for spaCy NLP analysis (~3s) and XTTS v2 synthesis (~2–5 min/chapter)
- Dark mode is supported via CSS variables — toggle with `.dark` class on `<html>`
- RTL language support: when Urdu/Arabic/Hebrew/Persian is selected, the UI renders a RTL warning and the backend is expected to handle text direction accordingly  
- WaveSurfer.js is installed and ready to replace the CSS-only waveform visualization in the production audio player

---

*Narrify FYP — Built with Next.js 16 · TypeScript · Tailwind CSS v4 · Framer Motion*
