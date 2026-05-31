// home.js — language picker, grouped by script family
import { loadRegistry } from '../data.js';
import { h, esc } from '../ui.js';
import { getOptions, getCurrentId, setFont } from '../fonts.js';

const CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="var(--accent)"/><path d="M6 10.2l2.6 2.6L14 7.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export async function render() {
  const reg = await loadRegistry();
  const screen = h('<div class="screen"></div>');

  const readyCount = reg.languages.filter(l => l.status === 'ready').length;

  const checks = [
    { script: 's-hi', label: 'Hindi',   glyph: 'अ' },
    { script: 's-my', label: 'Burmese', glyph: 'က' },
    { script: 's-km', label: 'Khmer',   glyph: 'ក' },
    { script: 's-ko', label: 'Korean',  glyph: '한' },
    { script: 's-ar', label: 'Arabic',  glyph: 'ب' }
  ];
  screen.appendChild(h(`
    <header class="home-head">
      <p class="eyebrow">13 alphabets · one app</p>
      <h1 class="page-title">Learn to read<br>a new script.</h1>
      <p class="page-sub">Tap a language to explore its letters — the sounds, the shapes, and a memory trick for each. ${readyCount} ready to try now.</p>
      <div class="font-check">
        <span class="font-check__label">Tap to switch typeface</span>
        <div class="font-check__glyphs"></div>
      </div>
    </header>
  `));

  const glyphRow = screen.querySelector('.font-check__glyphs');
  checks.forEach(c => {
    const opts = getOptions(c.script);
    const cur = () => opts.find(o => o.id === getCurrentId(c.script)) || opts[0];
    const btn = h(`
      <button class="fc-glyph" type="button" title="Tap to change the ${esc(c.label)} typeface">
        <b class="${c.script}">${esc(c.glyph)}</b>
        <span class="fc-glyph__meta">
          <span class="fc-glyph__lang">${esc(c.label)}</span>
          <span class="fc-glyph__style">${esc(cur().label)}</span>
        </span>
      </button>
    `);
    const styleEl = btn.querySelector('.fc-glyph__style');
    const glyphEl = btn.querySelector('b');
    btn.addEventListener('click', () => {
      const i = opts.findIndex(o => o.id === getCurrentId(c.script));
      const next = opts[(i + 1) % opts.length];
      setFont(c.script, next.id); // applies live everywhere via CSS var
      styleEl.textContent = next.label;
      glyphEl.classList.remove('fc-pulse');
      void glyphEl.offsetWidth; // restart the pulse
      glyphEl.classList.add('fc-pulse');
    });
    glyphRow.appendChild(btn);
  });

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
