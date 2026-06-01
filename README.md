# ScriptLingos

**Learn to read the world's alphabets — characters, sounds, and a memory trick for every letter.**

A lightweight, install-free web app for absolute beginners learning a new writing system. Pick a language, explore its letters one tile at a time, compare scripts side by side, and test yourself with a listen-and-choose quiz that remembers what you got wrong.

> **Status:** Released. Vanilla JavaScript, no build step, no framework, no backend (audio is served by a small external Worker — see [Audio](#audio)).

---

## Contents

- [What it does](#what-it-does)
- [Languages included](#languages-included)
- [Tech & architecture](#tech--architecture)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Data model](#data-model)
- [Adding a new language](#adding-a-new-language)
- [Audio](#audio)
- [Known issues / things to verify](#known-issues--things-to-verify)
- [Roadmap & ideas](#roadmap--ideas)
- [Accessibility](#accessibility)
- [Credits & license](#credits--license)

---

## What it does

The app has three sections, switched from a bottom tab bar:

**Learn.** Languages are grouped on the home screen by script family (right-to-left, Indic, Cyrillic, European/Latin, East Asian, Southeast Asian, African & Austronesian). Tap a language to see its full letter grid, then tap any letter for a detail view:

- The glyph, large, in a learner-friendly typeface.
- A **reveal toggle** — the name, romanization, and IPA start hidden so you can quiz yourself before checking (defaults to hidden; the choice is remembered).
- Positional **forms** where relevant (Arabic isolated / initial / medial / final).
- A plain-language **memory trick** for the shape and sound.
- **Example words** with emoji, romanization, meaning, and tap-to-hear audio.
- A **typeface picker** for complex scripts, so the learner can switch to whichever rendering reads clearest.

**Compare.** A sortable, filterable table that puts every alphabet next to a reference language you already know. It shows script family, reading direction, letter count, shared vs. unique sounds, and a similarity percentage, with a one-line plain-English summary per row.

**Quiz.** Pick one language; hear a letter and tap the character that makes that sound — ten questions, then a score ring. For Arabic, every positional form is quizzed separately. **Missed letters are saved per language and come back first next time**, and your best score per language is kept.

Cross-cutting features:

- **Light / dark theme**, remembered, with no flash on load.
- **Per-script typefaces**, remembered per script and applied live everywhere.
- **Offline-safe storage** — preferences degrade gracefully to in-memory if `localStorage` is blocked.
- A **hash router** with smooth screen transitions and back-button handling.

---

## Languages included

Thirteen languages across eight writing systems:

| Group | Languages |
|---|---|
| Right-to-left | Arabic, Hebrew |
| Indic / Brahmic | Hindi (Devanagari) |
| Cyrillic | Russian |
| European · Latin | French, German, Italian, Brazilian Portuguese |
| East Asian | Korean (Hangul) |
| Southeast Asian | Burmese, Khmer |
| African & Austronesian | Bahasa Indonesia, Swahili |

The Compare table additionally uses **English** as a default reference language (it has its own sound data in `compare.json` but is not a Learn/Quiz language).

---

## Tech & architecture

- **Plain ES modules** loaded directly by the browser (`<script type="module">`). No bundler, no transpile step.
- **Hash-based routing** (`#/`, `#/compare`, `#/quiz`, `#/lang/<code>`, `#/lang/<code>/letter/<id>`) in `js/main.js`. Each navigation gets a token so a slow async render can't overwrite a newer screen.
- **Data-driven registry.** Everything the UI shows comes from JSON in `data/`. Views never hardcode language lists; they read the registry, so most new content needs no code changes.
- **CSS design system** (`css/app.css`) with a neutral ramp, a per-script-family accent palette, and full dark-mode variables. Screen-specific styles live in `css/screens.css`.
- **Fonts** from Google Fonts, including textbook/traditional faces for complex scripts (Naskh, Amiri, Tiro Devanagari, Padauk, Hanuman, Myeongjo, Batang…). Per-script choices are applied via a `--font-<script>` CSS variable and pre-applied before paint to avoid a font flash.
- **Audio** via a Cloudflare Worker (Azure TTS) with a `window.speechSynthesis` fallback. Single Latin/Cyrillic letters are spoken by name; Arabic, Hebrew, Korean, and Burmese letters are spoken by their native letter name via a lookup table.
- **Persistence** through a tiny `store` wrapper over `localStorage` with a `Map`-based fallback.

No accounts, no analytics, no server of your own to run.

---

## Project structure

```
/
├─ index.html              # shell: topbar, tab bar, pre-paint theme/font scripts, font links
├─ css/
│  ├─ app.css              # design system, theme vars, per-group accents, base components
│  └─ screens.css          # per-screen styles (home, grid, detail, compare, quiz)
├─ js/
│  ├─ main.js              # hash router, theme toggle, accent application, transitions
│  ├─ data.js              # registry + per-language loading, quiz-item + compare loaders
│  ├─ store.js             # localStorage with in-memory fallback
│  ├─ ui.js                # DOM helpers, escaping, accent class, speak-on-click binding
│  ├─ fonts.js             # per-script typeface options, persistence, picker UI
│  ├─ audio.js             # pronunciation (Worker TTS + speechSynthesis fallback)
│  └─ views/
│     ├─ home.js           # language picker grouped by script family
│     ├─ grid.js           # letter grid for one language (RTL-aware)
│     ├─ letter.js         # letter detail: hero, forms, IPA, memory trick, words
│     ├─ compare.js        # sortable/filterable comparison table
│     └─ quiz.js           # listen-and-choose quiz with missed-item carryover
├─ data/
│  ├─ languages.json       # the registry: groups + language entries
│  ├─ compare.json         # comparison dataset (sounds per language)
│  └─ <code>.json          # one file per language (ar-SA, he-IL, hi-IN, ru-RU, …)
└─ audio/                  # pronunciation clips referenced by the data (see Audio note)
```

---

## Running locally

Because the app uses ES modules and `fetch`, it must be served over HTTP — opening `index.html` from the file system (`file://`) will not work. Any static server is fine:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000`. There is no build, install, or watch step.

---

## Data model

### Registry — `data/languages.json`

```jsonc
{
  "groups": [
    { "id": "rtl", "label": "Right-to-Left Scripts", "accent": "group-rtl", "blurb": "…" }
    // …
  ],
  "languages": [
    {
      "code": "ar-SA",          // BCP-47-ish; used in routes and audio locale
      "language": "Arabic",     // English display name
      "native": "العربية",      // shown on the card
      "group": "rtl",           // must match a groups[].id (drives accent + section)
      "script": "s-ar",         // CSS class controlling the typeface (see below)
      "glyph": "ب",            // representative character shown on the card
      "direction": "rtl",       // "ltr" | "rtl"
      "status": "ready",        // "ready" shows it live; "soon" shows a coming-soon card
      "file": "data/ar-SA.json" // the per-language letter data
    }
  ]
}
```

### Per-language file — `data/<code>.json`

```jsonc
{
  "language": "Arabic",
  "code": "ar-SA",
  "direction": "rtl",
  "letters": [
    {
      "id": "ar-alif",                 // unique within the language; used in routes
      "char": "ا",                     // the letter
      "name": "Alif",                  // letter name
      "romanization": "ā / ʾ",
      "ipa": "/aː/ / /ʔ/",             // optional
      "forms": {                        // optional — positional forms (Arabic etc.)
        "isolated": "ا", "initial": "ا", "medial": "ـا", "final": "ـا"
      },
      "letterAudio": "audio/ar/letters/ar-alif.mp3",   // see Audio note
      "memoryTrick": "A tall vertical stroke like the number 1 …",
      "words": [
        { "text": "أَسَد", "roman": "ʾasad", "meaning": "lion",
          "emoji": "🦁", "audio": "audio/ar/words/ar-alif-01.mp3" }
      ]
    }
  ]
}
```

When a letter has `forms`, the quiz expands each present form into its own question. The audio always uses the base character; the displayed glyph is the form.

### Comparison — `data/compare.json`

Each language carries a representative array of phoneme tokens (`sounds`) plus `script`, `familyId`, `family`, `direction`, and `letters`. Shared/unique counts and the similarity percentage are computed against the selected base language. **This file is maintained separately from the registry** — a language added to Learn will not appear in Compare until you add it here too.

---

## Adding a new language

### Same script you already support (e.g. Spanish, Polish)

1. Add an entry to `data/languages.json` (`code`, `language`, `native`, `group`, `script`, `glyph`, `direction`, `status: "ready"`, `file`).
2. Create `data/<code>.json` with the `letters` array.
3. (Optional) Add its `sounds` to `data/compare.json` so it shows in the comparison.

That's it — home grouping, the grid, the detail view, and the quiz all read it generically. No view code changes.

### A brand-new writing system

In addition to the two steps above:

1. **CSS class** — add `.s-<name> { font-family: var(--font-s-<name>, '<FallbackFont>'), <generic>; }` in `css/app.css`, and point the language's `script` at it.
2. **Font links** — add the Google Fonts `<link>` for that script in `index.html`, and add the script id to the two pre-paint scripts in `<head>` so saved typefaces apply before paint.
3. **Typeface options (optional)** — add a `FONTS['s-<name>']` array in `js/fonts.js` to offer alternative faces; scripts with a single face simply have no picker.
4. **Letter names (optional)** — if letters are read by name rather than by sound, add a `LETTER_NAMES['<code>']` map in `js/audio.js`. If `js/audio.js` includes the locale in `LETTER_NAME_LOCALES`, single letters are spelled by name automatically (used for Latin/Cyrillic).
5. **New group (optional)** — if the script family isn't represented, add a `groups` entry and an accent palette (`.group-<id>` light + dark) in `css/app.css`.

Positional scripts are already handled by the `forms` mechanism used for Arabic. Use `status: "soon"` to publish a placeholder card before the data is finished.

---

## Audio

Pronunciation is produced live by a Cloudflare Worker (Azure TTS), configured at the top of `js/audio.js`:

```js
const WORKER_URL = "https://tts.omwhatsup.workers.dev/";
```

If the Worker is unreachable, the app falls back to the browser's `speechSynthesis`. Single Latin/Cyrillic letters are spoken by name; Arabic, Hebrew, Korean, and Burmese letters use a native-name lookup table so the voice says the letter's name rather than only its raw sound. Hindi and Khmer letters are recited by sound and need no table.

> **Important:** the per-letter `letterAudio` and per-word `audio` paths in the data files are **not currently played** — `play()` synthesizes from text and ignores any `mp3` field passed to it. If the recorded clips are meant to be used, `play()` should try an `<audio>` element on the clip first and fall back to TTS on error. If live TTS is the intended source, the `audio/` folder and those fields can be removed. See Known issues #1.

---

## Known issues / things to verify

1. **Recorded clips are never played.** The data references MP3s, and `letter.js`/`quiz.js` pass them to `play()`, but `play()` only synthesizes from text. Decide between TTS-only (drop the clips) or clip-first-with-TTS-fallback (extend `play()`).
2. **Russian uses `script: "s-latin"`.** It renders today (Noto Sans covers Cyrillic) but there is no dedicated `s-cyr` class. Add one so the Latin face and the Cyrillic face aren't coupled.
3. **Language count copy.** `index.html`'s meta description says "14 languages"; there are 13. The home eyebrow's "13" is hardcoded next to a computed `readyCount` — derive it from the registry so it can't drift. ("13 languages" is more accurate than "13 alphabets," since six share the Latin script.)
4. **Quiz has no audio fallback.** If neither the Worker nor a browser voice can play (e.g. Khmer/Burmese), the question is unanswerable. `play()` returns `'none'` in that case — surface the romanization as a hint when it does.
5. **Public Worker URL.** The TTS Worker URL is committed in the client; consider locking it to your origin and rate-limiting it.
6. **Smaller items:** confirm every language marked `"ready"` has its `data/<code>.json`; add `aria-label`s (letter names) to quiz option buttons; confirm the letter-to-letter slide respects `prefers-reduced-motion`.

---

## Roadmap & ideas

**Learn faster**

- **Spaced repetition.** Promote the existing missed-item carryover into a real schedule (per-item ease + next-due time, expanding intervals). Highest-leverage change for retention.
- **Tracing / handwriting mode** with stroke-order guides — especially valuable for Khmer, Burmese, Hangul, and Arabic.
- **Reverse quiz** (show glyph → pick sound) to train recall in both directions.
- **Syllable-building view** for abugidas and Hangul, showing how a consonant + vowel sign combine.
- **Progress & streaks** surfaced on the home cards (best score and carried items are already stored).
- **Daily review** — one tap that assembles just the due items.
- **Confusable drills** that deliberately pit visually similar letters against each other.

**More attractive**

- **PWA / offline** — a manifest and service worker so it installs to the home screen and works offline (pairs well with caching recorded clips).
- **First-run onboarding** that asks which script to learn and drops you straight in.
- **Shareable result cards** ("100% on the Arabic alphabet").
- **Celebration touches** — confetti / haptics on a perfect round.
- **Search / jump-to-letter** in the longer grids.
- **Settings panel** consolidating theme, default-reveal, and per-script typefaces (the typeface feature is currently easy to miss).

---

## Accessibility

- `aria-live="polite"` on the screen host; descriptive `aria-label`s on the topbar controls.
- The reveal toggle is a real `aria-pressed` button; the typeface picker is a labelled `radiogroup`.
- Light and dark themes with adequate contrast in both.
- To do: per-letter labels on quiz options, and a reduced-motion check on transitions (see Known issues #6).

---

## Credits & license

Built as a from-scratch vanilla-JS project. Fonts are from Google Fonts under their respective open licenses. Pronunciation is generated via Azure TTS through a Cloudflare Worker, with a `speechSynthesis` fallback.

_Add your chosen license here (e.g. MIT) before publishing._
