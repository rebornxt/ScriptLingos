// home.js — language picker, grouped by script family
import { loadRegistry } from '../data.js';
import { h, esc } from '../ui.js';

const CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="var(--accent)"/><path d="M6 10.2l2.6 2.6L14 7.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export async function render() {
  const reg = await loadRegistry();
  const screen = h('<div class="screen"></div>');

  const readyCount = reg.languages.filter(l => l.status === 'ready').length;

  screen.appendChild(h(`
    <header class="home-head">
      <p class="eyebrow">13 alphabets · one app</p>
      <h1 class="page-title">Learn to read<br>a new script.</h1>
      <p class="page-sub">Tap a language to explore its letters — the sounds, the shapes, and a memory trick for each. ${readyCount} ready to try now.</p>
      <div class="font-check" title="Confirms complex scripts render with no missing-glyph boxes">
        <span class="font-check__label">Font check</span>
        <div class="font-check__glyphs">
          <span class="fc-glyph"><b class="s-hi">अ</b><span>Hindi</span></span>
          <span class="fc-glyph"><b class="s-my">က</b><span>Burmese</span></span>
          <span class="fc-glyph"><b class="s-km">ក</b><span>Khmer</span></span>
          <span class="fc-glyph"><b class="s-ko">한</b><span>Korean</span></span>
          <span class="fc-glyph"><b class="s-ar">ب</b><span>Arabic</span></span>
        </div>
      </div>
    </header>
  `));

  for (const group of reg.groups) {
    const langs = reg.languages.filter(l => l.group === group.id);
    if (!langs.length) continue;

    const section = h(`
      <section class="group ${group.accent}">
        <div class="group__head">
          <span class="group__dot"></span>
          <h2 class="group__title">${esc(group.label)}</h2>
          <span class="group__count">${langs.length}</span>
        </div>
        <div class="lang-grid"></div>
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
        </a>
      `);
      grid.appendChild(card);
    }
    screen.appendChild(section);
  }

  return screen;
}
