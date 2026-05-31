// grid.js — letter grid for one language (RTL-aware)
import { loadLanguage } from '../data.js';
import { h, esc } from '../ui.js';
import { renderTypeface } from '../fonts.js';

export async function render({ code }) {
  const data = await loadLanguage(code);
  const meta = data._meta;
  const rtl = (data.direction || 'ltr') === 'rtl';

  const screen = h('<div class="screen"></div>');

  screen.appendChild(h(`
    <header class="grid-head">
      <div class="grid-head__row">
        <span class="pill ${meta.script}">${esc(data.language)}</span>
        <span class="dir-tag">${rtl ? 'Right → Left' : 'Left → Right'}</span>
      </div>
      <h1 class="page-title" style="margin-top:12px">${esc(data.language)} letters</h1>
      <p class="page-sub">${data.letters.length} letters to explore. Tap any tile for its sound, forms and a memory trick.</p>
    </header>
  `));

  // typeface picker — only for complex scripts that offer alternatives
  const typeface = renderTypeface(meta.script, data.letters[0] ? data.letters[0].char : meta.glyph);
  if (typeface) screen.appendChild(typeface);

  const grid = h(`<div class="letters" ${rtl ? 'dir="rtl"' : ''}></div>`);
  for (const letter of data.letters) {
    const tile = h(`
      <a class="letter-tile" href="#/lang/${encodeURIComponent(code)}/letter/${encodeURIComponent(letter.id)}">
        <span class="letter-tile__char ${meta.script}">${esc(letter.char)}</span>
        <span class="letter-tile__name">${esc(letter.name)}</span>
        <span class="letter-tile__rom">${esc(letter.romanization)}</span>
      </a>
    `);
    grid.appendChild(tile);
  }
  screen.appendChild(grid);

  return screen;
}
