// fonts.js — per-script typeface preferences.
// Several complex scripts ship a default "modern" sans that distorts the
// shapes beginners need to recognise. Here we offer the traditional / textbook
// styles and let the learner pick whichever reads clearest. The choice is
// stored per script and applied via a CSS variable (--font-<script>) so every
// glyph in the app — grid, detail, quiz — updates live.

import { store } from './store.js';
import { h, esc } from './ui.js';

// Each list is ordered with the recommended learner default FIRST.
export const FONTS = {
  's-ar': [
    { id: 'naskh', label: 'Naskh',   note: 'Traditional · clearest', stack: "'Noto Naskh Arabic', serif" },
    { id: 'amiri', label: 'Amiri',   note: 'Classic calligraphic',   stack: "'Amiri', 'Noto Naskh Arabic', serif" },
    { id: 'sans',  label: 'Modern',  note: 'Geometric sans',         stack: "'Noto Sans Arabic', sans-serif" }
  ],
  's-hi': [
    { id: 'tiro',  label: 'Textbook', note: 'Open · easy to read',   stack: "'Tiro Devanagari Hindi', serif" },
    { id: 'serif', label: 'Traditional', note: 'Calligraphic',       stack: "'Noto Serif Devanagari', serif" },
    { id: 'sans',  label: 'Modern',  note: 'Geometric sans',         stack: "'Noto Sans Devanagari', sans-serif" }
  ],
  's-my': [
    { id: 'padauk', label: 'Padauk',  note: 'Traditional · taught',  stack: "'Padauk', sans-serif" },
    { id: 'serif',  label: 'Classic', note: 'Calligraphic',          stack: "'Noto Serif Myanmar', serif" },
    { id: 'sans',   label: 'Modern',  note: 'Geometric sans',        stack: "'Noto Sans Myanmar', sans-serif" }
  ],
  's-km': [
    { id: 'hanuman', label: 'Hanuman', note: 'Traditional · clearest', stack: "'Hanuman', serif" },
    { id: 'serif',   label: 'Classic', note: 'Calligraphic',           stack: "'Noto Serif Khmer', serif" },
    { id: 'sans',    label: 'Modern',  note: 'Geometric sans',         stack: "'Noto Sans Khmer', sans-serif" }
  ],
  's-ko': [
    { id: 'sans',   label: 'Standard', note: 'Clean · easy to read',  stack: "'Noto Sans KR', sans-serif" },
    { id: 'serif',  label: 'Myeongjo', note: 'Traditional brush',     stack: "'Noto Serif KR', serif" },
    { id: 'batang', label: 'Batang',   note: 'Soft classic',          stack: "'Gowun Batang', serif" }
  ]
};

const keyStack = (s) => 'sl.font.' + s;     // CSS stack string (read by the head pre-paint script too)
const keyId    = (s) => 'sl.fontid.' + s;   // selected option id, for highlighting the UI

export function hasOptions(script) {
  return Array.isArray(FONTS[script]) && FONTS[script].length > 1;
}

export function getOptions(script) {
  return FONTS[script] || [];
}

export function getCurrentId(script) {
  const opts = FONTS[script];
  if (!opts) return null;
  const stored = store.get(keyId(script), null);
  return opts.some(o => o.id === stored) ? stored : opts[0].id;
}

// Apply one script's stored (or default) choice to the document.
function applyOne(script) {
  const opts = FONTS[script];
  if (!opts) return;
  const id = getCurrentId(script);
  const opt = opts.find(o => o.id === id) || opts[0];
  document.documentElement.style.setProperty('--font-' + script, opt.stack);
}

// Apply every script's preference (call once at startup).
export function applyAll() {
  Object.keys(FONTS).forEach(applyOne);
}

// Persist + apply a new choice.
export function setFont(script, id) {
  const opts = FONTS[script];
  if (!opts) return;
  const opt = opts.find(o => o.id === id) || opts[0];
  store.set(keyStack(script), opt.stack);
  store.set(keyId(script), opt.id);
  document.documentElement.style.setProperty('--font-' + script, opt.stack);
}

// Build the typeface picker card for a script. Returns null for scripts with no
// alternatives (Latin, Hebrew). `sample` is the glyph previewed inside each chip.
export function renderTypeface(script, sample) {
  if (!hasOptions(script)) return null;
  const opts = getOptions(script);
  const current = getCurrentId(script);

  const card = h(`
    <div class="card typeface">
      <p class="card__label">Typeface · pick what reads clearest</p>
      <div class="type-opts" role="radiogroup" aria-label="Letter typeface"></div>
    </div>
  `);
  const row = card.querySelector('.type-opts');

  opts.forEach(opt => {
    const btn = h(`
      <button class="type-opt ${opt.id === current ? 'is-on' : ''}" role="radio"
              aria-checked="${opt.id === current}" data-id="${esc(opt.id)}">
        <span class="type-opt__glyph ${script}" style="font-family:${opt.stack}">${esc(sample)}</span>
        <span class="type-opt__meta">
          <span class="type-opt__label">${esc(opt.label)}</span>
          <span class="type-opt__note">${esc(opt.note)}</span>
        </span>
      </button>
    `);
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-on')) return;
      setFont(script, opt.id);
      row.querySelectorAll('.type-opt').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    });
    row.appendChild(btn);
  });

  return card;
}
