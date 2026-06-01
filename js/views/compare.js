// compare.js — compact, searchable comparison of all languages against a base you know.
import { loadCompare } from '../data.js';
import { h, esc } from '../ui.js';
import { store } from '../store.js';

function intersect(a, b) { const s = new Set(b); return a.filter(x => s.has(x)); }

function buildNote(lang, base, shared, unique) {
  if (lang.code === base.code) return 'This is your reference language.';
  const sameFam = lang.familyId === base.familyId;
  const sameDir = lang.direction === base.direction;
  const dirTxt = lang.direction === 'rtl' ? 'right-to-left' : 'left-to-right';
  let lead;
  if (sameFam) lead = `Same ${base.family} family as ${base.name}`;
  else if (sameDir) lead = `Different script but also reads ${dirTxt}`;
  else lead = `Reads ${dirTxt}, unlike ${base.name}`;
  return `${lead}; shares ${shared} core sounds, with ${unique} unique to it.`;
}

function rowData(langs, baseCode) {
  const base = langs.find(l => l.code === baseCode) || langs[0];
  return langs.map(lang => {
    const shared = intersect(lang.sounds, base.sounds).length;
    const uni = new Set([...lang.sounds, ...base.sounds]).size;
    const unique = lang.sounds.length - shared;
    const sim = lang.code === base.code ? 100 : Math.round((shared / uni) * 100);
    return { ...lang, shared, unique, sim, note: buildNote(lang, base, shared, unique), isBase: lang.code === base.code };
  });
}

const SORTS = [
  { id: 'sim',   label: 'Most similar' },
  { id: 'name',  label: 'A–Z' },
  { id: 'letters', label: 'Letter count' }
];

export async function render() {
  const data = await loadCompare();
  const langs = data.languages;

  const state = {
    base: store.get('sl.cmp.base', data.defaultBase || langs[0].code),
    sort: store.get('sl.cmp.sort', 'sim'),
    fam: 'all',
    q: ''
  };
  if (!langs.some(l => l.code === state.base)) state.base = langs[0].code;

  const screen = h('<div class="screen"></div>');
  screen.appendChild(h(`
    <header>
      <p class="eyebrow">Side by side</p>
      <h1 class="page-title">Compare the alphabets</h1>
      <p class="page-sub">Pick a language you already know — every other writing system is ranked by how close its sounds are to it.</p>
    </header>
  `));

  // ---- controls ----
  const fams = ['all', ...Array.from(new Set(langs.map(l => l.familyId)))];
  const famLabel = (id) => id === 'all' ? 'All families' : (langs.find(l => l.familyId === id).family);

  const controls = h(`
    <div class="cmp2-controls">
      <div class="cmp2-base">
        <label for="baseSel">Compare against</label>
        <select id="baseSel">
          ${langs.map(l => `<option value="${l.code}" ${l.code === state.base ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
        </select>
      </div>
      <div class="cmp2-row2">
        <div class="cmp2-search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input id="cmpSearch" type="search" placeholder="Search a language…" autocomplete="off" />
        </div>
        <div class="cmp2-sort">
          ${SORTS.map(s => `<button class="cmp2-sortbtn ${s.id === state.sort ? 'is-on' : ''}" data-sort="${s.id}">${esc(s.label)}</button>`).join('')}
        </div>
      </div>
      <div class="cmp2-fams">
        ${fams.map(f => `<button class="chip ${f === state.fam ? 'is-on' : ''}" data-fam="${f}">${esc(famLabel(f))}</button>`).join('')}
      </div>
    </div>
  `);
  screen.appendChild(controls);

  const summary = h('<div class="cmp2-summary"></div>');
  screen.appendChild(summary);

  const list = h('<div class="cmp2-list"></div>');
  screen.appendChild(list);

  const dirChip = (d) => d === 'rtl'
    ? '<span class="cmp2-dir cmp2-dir--rtl">RTL ←</span>'
    : '<span class="cmp2-dir">LTR →</span>';

  function draw() {
    const rows = rowData(langs, state.base);
    const base = rows.find(r => r.isBase);

    // base summary
    summary.innerHTML = `
      <span class="cmp2-summary__glyph ${base.script}">${esc(base.glyph)}</span>
      <div class="cmp2-summary__txt">
        <b>You know ${esc(base.name)}</b>
        <span>${esc(base.family)} · ${base.direction === 'rtl' ? 'right-to-left' : 'left-to-right'} · ${base.letters} letters · ${base.sounds.length} core sounds</span>
      </div>`;

    // filter
    let rest = rows.filter(r => !r.isBase);
    if (state.fam !== 'all') rest = rest.filter(r => r.familyId === state.fam);
    const q = state.q.trim().toLowerCase();
    if (q) rest = rest.filter(r => r.name.toLowerCase().includes(q) || r.family.toLowerCase().includes(q));

    // sort
    if (state.sort === 'name') rest.sort((a, b) => a.name.localeCompare(b.name));
    else if (state.sort === 'letters') rest.sort((a, b) => b.letters - a.letters || b.sim - a.sim);
    else rest.sort((a, b) => b.sim - a.sim || a.name.localeCompare(b.name));

    const tier = (s) => s >= 70 ? 'hi' : s >= 45 ? 'mid' : 'lo';

    list.innerHTML = `
      <p class="cmp2-count">${rest.length} language${rest.length === 1 ? '' : 's'}${state.fam !== 'all' ? ' · ' + esc(famLabel(state.fam)) : ''}</p>
      ${rest.length ? rest.map(r => `
        <button class="cmp2-item" data-code="${esc(r.code)}" aria-expanded="false">
          <span class="cmp2-item__glyph ${r.script}">${esc(r.glyph)}</span>
          <span class="cmp2-item__main">
            <span class="cmp2-item__top">
              <span class="cmp2-item__name">${esc(r.name)}</span>
              ${dirChip(r.direction)}
            </span>
            <span class="cmp2-item__fam">${esc(r.family)}</span>
          </span>
          <span class="cmp2-item__sim cmp2-item__sim--${tier(r.sim)}">
            <span class="cmp2-item__bar"><span class="cmp2-item__fill" style="width:${r.sim}%"></span></span>
            <span class="cmp2-item__pct">${r.sim}<small>%</small></span>
          </span>
          <span class="cmp2-item__chev" aria-hidden="true">▾</span>
        </button>
        <div class="cmp2-detail" data-for="${esc(r.code)}" hidden>
          <div class="cmp2-detail__stats">
            <span><b>${r.shared}</b> shared sounds</span>
            <span><b>${r.unique}</b> unique to it</span>
            <span><b>${r.letters}</b> letters</span>
          </div>
          <p class="cmp2-detail__note">${esc(r.note)}</p>
        </div>`).join('')
      : '<p class="cmp2-empty">No languages match — try a different family or search.</p>'}`;

    list.querySelectorAll('.cmp2-item').forEach(it => {
      it.addEventListener('click', () => {
        const open = it.getAttribute('aria-expanded') === 'true';
        // close others
        list.querySelectorAll('.cmp2-item[aria-expanded="true"]').forEach(o => {
          if (o !== it) { o.setAttribute('aria-expanded', 'false'); const d = list.querySelector(`.cmp2-detail[data-for="${o.dataset.code}"]`); if (d) d.hidden = true; }
        });
        it.setAttribute('aria-expanded', String(!open));
        const det = list.querySelector(`.cmp2-detail[data-for="${it.dataset.code}"]`);
        if (det) det.hidden = open;
      });
    });
  }

  // wiring
  controls.querySelector('#baseSel').addEventListener('change', (e) => {
    state.base = e.target.value; store.set('sl.cmp.base', state.base); draw();
  });
  controls.querySelector('#cmpSearch').addEventListener('input', (e) => { state.q = e.target.value; draw(); });
  controls.querySelectorAll('.cmp2-sortbtn').forEach(b => b.addEventListener('click', () => {
    state.sort = b.dataset.sort; store.set('sl.cmp.sort', state.sort);
    controls.querySelectorAll('.cmp2-sortbtn').forEach(x => x.classList.toggle('is-on', x === b));
    draw();
  }));
  controls.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    state.fam = c.dataset.fam;
    controls.querySelectorAll('.chip').forEach(x => x.classList.toggle('is-on', x === c));
    draw();
  }));

  draw();
  return screen;
}
