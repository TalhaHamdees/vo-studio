# VO Studio

A personal, self-hosted voiceover generator for YouTube scripts. Wraps a TTS API with a focused editor UI, client-side script chunking for long-form content, and a pronunciation library purpose-built for stubborn proper nouns (ASOIAF names, foreign words, brand names).

Built for small editor teams who want a consistent VO workflow without sharing accounts or copy-pasting between tools.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Why this exists

Generating VO for YouTube videos through a generic TTS UI has friction:

- Long scripts (1,500–2,500 words) get rejected or produce unstable output.
- Mispronunciations of proper nouns are a recurring pain. You fix them once, then the next script reintroduces them.
- Editors need a shared workflow without sharing a single paid account.

VO Studio solves all three with a thin, opinionated UI on top of the Voicer API.

## Features

- **Live script editor** with character count and real-time chunk preview
- **Voice template picker** sourced from your connected TTS account
- **Pronunciation Library** — persistent word → respelling dictionary, applied at submit time so the editor view stays clean. Each entry has a one-click **Test** button that synthesizes a preview so you can iterate the respelling until it sounds right
- **JSON import / export** for the library, so a team lead can ship an `asoiaf.json` or `tech-brand-names.json` to every editor
- **Sentence-aware chunking** — long scripts split into ~5,000-character chunks at sentence boundaries, submitted sequentially with a progress bar
- **Single-MP3 or ZIP download** — chunks stitched into one file, or bundled per chunk
- **Live credits balance** pulled from the TTS account
- **Local-first** — API key and library live in browser `localStorage`. Nothing persisted server-side.

## Screenshots

_Add screenshots of the UI to `/docs/screenshots/` and link them here._

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Audio handling | Browser `Blob` + JSZip |
| Deploy target | Vercel |

No database, no auth layer, no backend services to provision.

## Architecture

```
┌──────────────┐   fetch      ┌──────────────────┐   X-API-Key   ┌──────────────┐
│   Browser    │ ───────────▶ │  Next.js /api/*  │ ────────────▶ │  Voicer API  │
│  (React UI)  │ ◀─────────── │  (proxy routes)  │ ◀──────────── │   (TTS)      │
└──────────────┘   blob/json  └──────────────────┘   audio/json  └──────────────┘
```

- The browser never talks to the TTS API directly — avoids CORS and keeps the key out of URLs.
- API key is held in the user's `localStorage`, passed per request as a header to our own proxy routes, which forward it upstream.
- Result streams (MP3 / ZIP) are proxied back as-is.

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

Paste your TTS API key in the sidebar. Templates and balance will load automatically.

## Deploy to Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. Import the repo on [vercel.com](https://vercel.com/new).
3. No environment variables required for default behavior.
4. Optional: set `VOICER_API_URL` to point at a different TTS backend.

Or one-liner from this folder:

```bash
npx vercel
```

## Configuration

All configuration is optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VOICER_API_URL` | `https://voiceapi.csv666.ru` | TTS backend base URL. Override if you self-host or point at a different instance. |

Copy `.env.example` to `.env.local` and edit if you need to override.

## Generation flow

1. Pronunciation library entries are applied to the script (word-boundary matching).
2. Resulting text is split into chunks (~5,000 chars, sentence-boundary aware).
3. For each chunk: `POST /tasks` → poll `/tasks/{id}/status` every 2s → fetch `/tasks/{id}/result`.
4. Returned audio blobs (MP3 or ZIP of MP3s) are collected.
5. User downloads either the merged single MP3 or the per-chunk ZIP.

## Pronunciation tips

The underlying model responds best to natural-looking respellings:

- **Avoid dashes** — they introduce mid-word pauses (`Duh-NAIR-iss` ≠ good).
- **Avoid ALL CAPS** — triggers over-emphasis.
- **Prefer natural spellings** — `Daenerys → Dahnairiss`, `Cersei → Sersee`, `Jaime → Jaymee`, `Tywin → Tie-win` (actually better as `Tywinn`).
- **Use the Test button** — results differ per voice. Iterate until it sounds right.
- **"Test in sentence"** — some respellings sound off in isolation but fine in flow.

## Project layout

```
app/
  api/                    Proxy routes to the TTS backend
    balance/              GET   — credit balance
    templates/            GET   — list user voice templates
    tasks/                POST  — create synthesis task
    tasks/[id]/status/    GET   — poll task status
    tasks/[id]/result/    GET   — stream audio result
  layout.tsx
  page.tsx                Main orchestrator
  globals.css

components/
  Header.tsx              Logo, credits badge
  Sidebar.tsx             API key, voice picker, library entrypoint
  ScriptEditor.tsx        Textarea + char/chunk counters
  GenerateBar.tsx         Generate / progress / download controls
  AudioPlayer.tsx         Inline playback
  PronunciationLibrary.tsx  Modal with CRUD, test, import/export

lib/
  voicer.ts               TTS API types + server-side fetch helpers
  client.ts               Browser-side wrapper over /api/*
  chunker.ts              Sentence-boundary chunk splitter
  pronunciation.ts        Replacement engine + JSON import/export
  audio.ts                MP3 concat, ZIP bundling, downloads
  useLocalStorage.ts      Hydration-safe localStorage hook
```

## Data privacy

- API keys are stored in browser `localStorage` only — never sent to any server other than the TTS backend via proxy.
- Pronunciation library is stored locally.
- Generated audio is held in memory as a `Blob`; it is not uploaded anywhere and is lost on page reload unless downloaded.

## License

MIT — see [LICENSE](./LICENSE).
