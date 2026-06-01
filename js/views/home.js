// home.js — language picker, grouped by collapsible script-family sections
import { loadRegistry } from '../data.js';
import { h, esc, flagImgs } from '../ui.js';
import { store } from '../store.js';

const CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="var(--accent)"/><path d="M6 10.2l2.6 2.6L14 7.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const OPEN_KEY = 'sl.home.open';

export async function render() {
  const reg = await loadRegistry();
  const screen = h('<div class="screen"></div>');

  const readyCount = reg.languages.filter(l => l.status === 'ready').length;
  const scriptCount = new Set(reg.languages.filter(l => l.status === 'ready').map(l => l.script)).size;

  let openSet = new Set(store.get(OPEN_KEY, []));

  screen.appendChild(h(`
    <header class="home-head">
      <p class="eyebrow">${readyCount} languages · ${scriptCount} writing systems</p>
      <h1 class="page-title">Learn to read<br>a new script.</h1>
      <p class="page-sub">Tap a script family to reveal its languages, then pick one to explore its letters — the sounds, the shapes, and a memory trick for each.</p>
    </header>
  `));

  for (const group of reg.groups) {
    const langs = reg.languages.filter(l => l.group === group.id);
    if (!langs.length) continue;
    const open = openSet.has(group.id);

    const section = h(`
      <section class="group ${group.accent} ${open ? 'is-open' : ''}">
        <button class="group__head" type="button" aria-expanded="${open}" data-group="${esc(group.id)}">
          <span class="group__dot"></span>
          <span class="group__titles">
            <span class="group__title">${esc(group.label)}</span>
            <span class="group__blurb">${esc(group.blurb || '')}</span>
          </span>
          <span class="group__count">${langs.length}</span>
          <span class="group__chev" aria-hidden="true">${CHEV}</span>
        </button>
        <div class="group__wrap"><div class="group__inner"><div class="lang-grid"></div></div></div>
      </section>
    `);
    const grid = section.querySelector('.lang-grid');

    for (const lang of langs) {
      const ready = lang.status === 'ready';
      const card = h(`
        <a class="lang-card ${ready ? '' : 'is-soon'}" ${ready ? `href="#/lang/${encodeURIComponent(lang.code)}"` : 'role="button" aria-disabled="true"'}>
          ${ready
            ? `<span class="lang-card__ready" aria-label="Ready">${CHECK}</span>`
            : '<span class="soon-tag">Soon</span>'}
          <span class="lang-card__glyph ${lang.script}">${esc(lang.glyph)}</span>
          <span class="lang-card__native ${lang.script}">${esc(lang.native)}</span>
          <span class="lang-card__name">${esc(lang.language)}</span>
          ${lang.countries ? `<span class="lang-card__stats"><span class="lang-card__flags">${flagImgs(lang.countries, 3)}</span><span class="lang-card__share" title="Estimated share of the world's people">${esc(lang.share || '')}</span></span>` : ''}
        </a>
      `);
      grid.appendChild(card);
    }

    const head = section.querySelector('.group__head');
    head.addEventListener('click', () => {
      const nowOpen = !section.classList.contains('is-open');
      section.classList.toggle('is-open', nowOpen);
      head.setAttribute('aria-expanded', String(nowOpen));
      if (nowOpen) openSet.add(group.id); else openSet.delete(group.id);
      store.set(OPEN_KEY, Array.from(openSet));
    });

    screen.appendChild(section);
  }

  return screen;
}
