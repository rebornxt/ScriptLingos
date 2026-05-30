// ui.js — small DOM helpers shared by screens
import { play } from './audio.js';

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Apply a script-group accent class to an element (clears any prior group-*)
export function setAccent(el, accentClass) {
  el.className = el.className.replace(/\bgroup-\w+\b/g, '').trim();
  if (accentClass) el.classList.add(accentClass);
}

// Speaker-icon SVG
export const PLAY_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
export const SMALL_PLAY = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';

// Wire a button so clicking plays audio (mp3 → speechSynthesis) with a brief playing state.
export function bindSpeak(btn, getOpts) {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (btn.classList.contains('is-playing')) return;
    btn.classList.add('is-playing');
    try { await play(getOpts()); } catch (err) {}
    setTimeout(() => btn.classList.remove('is-playing'), 850);
  });
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
