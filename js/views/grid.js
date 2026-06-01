// grid.js — letter grid for one language (RTL-aware). Japanese gets a special
// layout: a Hiragana / Katakana toggle with category sections, 5 per row.
import { loadLanguage } from '../data.js';
import { h, esc, flagImgs } from '../ui.js';
import { renderTypeface } from '../fonts.js';
import { store } from '../store.js';

const LABELS_KEY = 'sl.grid.labels';   // true = show romanization labels under letters
const EYE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .35 4.2.9M21.5 12S18 18.5 12 18.5c-1.6 0-3-.35-4.2-.9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M9.5 9.6a3 3 0 0 0 4.2 4.3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

function letterTile(code, letter, script) {
  return h(`
    <a class="letter-tile" href="#/lang/${encodeURIComponent(code)}/letter/${encodeURIComponent(letter.id)}">
      <span class="letter-tile__char ${script}">${esc(letter.char)}</span>
      <span class="letter-tile__name">${esc(letter.name)}</span>
      <span class="letter-tile__rom">${esc(letter.romanization)}</span>
    </a>
  `);
}

// Show / hide the romanization labels under every letter (self-quiz mode).
function labelToggle(screen) {
  let show = store.get(LABELS_KEY, true);
  screen.classList.toggle('labels-hidden', !show);
  const btn = h(`
    <div class="grid-tools">
      <button class="label-toggle" type="button" aria-pressed="${!show}">
        <span class="label-toggle__ico">${show ? EYE : EYE_OFF}</span>
        <span class="label-toggle__txt">${show ? 'Hide labels' : 'Show labels'}</span>
      </button>
    </div>
  `);
  const b = btn.querySelector('.label-toggle');
  b.addEventListener('click', () => {
    show = !show;
    store.set(LABELS_KEY, show);
    screen.classList.toggle('labels-hidden', !show);
    b.setAttribute('aria-pressed', String(!show));
    b.querySelector('.label-toggle__ico').innerHTML = show ? EYE : EYE_OFF;
    b.querySelector('.label-toggle__txt').textContent = show ? 'Hide labels' : 'Show labels';
  });
  return btn;
}

// column layout per Japanese category (textbook gojūon = 5 across)
const CAT_GRID = { gojuon: 'letters--g5', dakuten: 'letters--g5', yoon: 'letters--g3', special: 'letters--combo', sokuon: 'letters--wide' };

function renderJapanese(screen, data, code) {
  const meta = data._meta;
  const conf = data.jp;
  const TAB_KEY = 'sl.jp.tab';
  let tab = store.get(TAB_KEY, 'hiragana');
  if (!conf.tabs.some(t => t.id === tab)) tab = conf.tabs[0].id;

  const count = (kana) => data.letters.filter(l => l.kana === kana).length;

  const toggle = h(`
    <div class="jp-toggle" role="tablist" aria-label="Japanese script">
      ${conf.tabs.map(t => `
        <button class="jp-toggle__btn ${t.id === tab ? 'is-on' : ''}" role="tab" aria-selected="${t.id === tab}" data-tab="${t.id}">
          <span class="jp-toggle__native s-ja">${esc(t.native)}</span>
          <span class="jp-toggle__label">${esc(t.label)}</span>
          <span class="jp-toggle__count">${count(t.id)}</span>
        </button>`).join('')}
    </div>
  `);
  screen.appendChild(toggle);

  const body = h('<div class="jp-body"></div>');
  screen.appendChild(body);

  function draw() {
    const tabConf = conf.tabs.find(t => t.id === tab);
    body.innerHTML = '';
    for (const catId of tabConf.cats) {
      const cat = conf.cats[catId];
      const letters = data.letters.filter(l => l.kana === tab && l.cat === catId);
      if (!letters.length) continue;
      const section = h(`
        <section class="jp-cat">
          <div class="jp-cat__head">
            <h2 class="jp-cat__title">${esc(cat.label)}</h2>
            <span class="jp-cat__count">${letters.length}</span>
          </div>
          <p class="jp-cat__blurb">${esc(cat.blurb)}</p>
          <div class="letters letters--jp ${CAT_GRID[catId] || ''}"></div>
        </section>
      `);
      const grid = section.querySelector('.letters');
      for (const letter of letters) grid.appendChild(letterTile(code, letter, meta.script));
      body.appendChild(section);
    }
  }

  toggle.querySelectorAll('.jp-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === tab) return;
      tab = btn.dataset.tab;
      store.set(TAB_KEY, tab);
      toggle.querySelectorAll('.jp-toggle__btn').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      draw();
    });
  });

  draw();
}

export async function render({ code }) {
  const data = await loadLanguage(code);
  const meta = data._meta;
  const rtl = (data.direction || 'ltr') === 'rtl';

  const screen = h('<div class="screen"></div>');

  const isJP = data.layout === 'jp';
  const subText = isJP
    ? 'Two syllabaries, one sound system. Switch between Hiragana and Katakana, and browse by category.'
    : `${data.letters.length} letters to explore. Tap any tile for its sound, forms and a memory trick.`;

  screen.appendChild(h(`
    <header class="grid-head">
      <div class="grid-head__row">
        <span class="pill ${meta.script}">${esc(data.language)}</span>
        <span class="dir-tag">${rtl ? 'Right → Left' : 'Left → Right'}</span>
      </div>
      <h1 class="page-title" style="margin-top:12px">${esc(data.language)}${isJP ? ' kana' : ' letters'}</h1>
      <p class="page-sub">${esc(subText)}</p>
      ${meta.countries ? `<p class="grid-speakers"><span class="grid-speakers__flags">${flagImgs(meta.countries)}</span> <span>Spoken by <b>≈${esc(meta.speakers || '')}</b> people${meta.share ? ` · about <b>${esc(meta.share)}</b> of the world` : ''}</span></p>` : ''}
    </header>
  `));

  // self-quiz: show / hide the romanization labels
  screen.appendChild(labelToggle(screen));

  // typeface picker — only for complex scripts that offer alternatives
  const typeface = renderTypeface(meta.script, data.letters[0] ? data.letters[0].char : meta.glyph);
  if (typeface) screen.appendChild(typeface);

  if (isJP) {
    renderJapanese(screen, data, code);
    return screen;
  }

  const grid = h(`<div class="letters" ${rtl ? 'dir="rtl"' : ''}></div>`);
  for (const letter of data.letters) grid.appendChild(letterTile(code, letter, meta.script));
  screen.appendChild(grid);

  return screen;
}
