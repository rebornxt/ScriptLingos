// compare.js — sortable / filterable alphabet comparison with similarity %
import { loadCompare } from '../data.js';
import { h, esc } from '../ui.js';

function intersect(a, b) { const s = new Set(b); return a.filter(x => s.has(x)); }

function buildNote(lang, base, shared, unique) {
  if (lang.code === base.code) return 'This is your reference language.';
  const sameFam = lang.familyId === base.familyId;
  const sameDir = lang.direction === base.direction;
  const dirTxt = lang.direction === 'rtl' ? 'right-to-left' : 'left-to-right';
  let lead;
  if (sameFam) lead = `Same ${base.family} script as ${base.name}`;
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
    return {
      ...lang,
      shared,
      unique,
      sim,
      note: buildNote(lang, base, shared, unique),
      isBase: lang.code === base.code
    };
  });
}

const COLS = [
  { key: 'name',      label: 'Language',  num: false },
  { key: 'family',    label: 'Script',    num: false },
  { key: 'direction', label: 'Direction', num: false },
  { key: 'letters',   label: 'Letters',   num: true  },
  { key: 'shared',    label: 'Shared',    num: true  },
  { key: 'unique',    label: 'Unique',    num: true  },
  { key: 'sim',       label: 'Similarity',num: true  },
  { key: 'note',      label: 'In plain English', num: false }
];

export async function render() {
  const data = await loadCompare();
  const langs = data.languages;

  const state = {
    base: data.defaultBase || langs[0].code,
    sortKey: 'sim',
    sortDir: -1,
    fam: 'all'
  };

  const screen = h('<div class="screen"></div>');
  screen.appendChild(h(`
    <header>
      <p class="eyebrow">Side by side</p>
      <h1 class="page-title">Compare the alphabets</h1>
      <p class="page-sub">Pick a language you know — see how the others' scripts, directions and sounds line up against it. Tap any column to sort.</p>
    </header>
  `));

  // controls
  const fams = ['all', ...Array.from(new Set(langs.map(l => l.familyId)))];
  const famLabel = (id) => id === 'all' ? 'All scripts' : (langs.find(l => l.familyId === id).family);

  const controls = h(`
    <div class="cmp-controls">
      <div class="cmp-base">
        <label for="baseSel">Compare against</label>
        <select id="baseSel">
          ${langs.map(l => `<option value="${l.code}" ${l.code === state.base ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
        </select>
      </div>
      <div class="cmp-filters">
        ${fams.map(f => `<button class="chip ${f === state.fam ? 'is-on' : ''}" data-fam="${f}">${esc(famLabel(f))}</button>`).join('')}
      </div>
    </div>
  `);
  screen.appendChild(controls);

  const wrap = h('<div class="cmp-table-wrap"></div>');
  screen.appendChild(wrap);

  function draw() {
    let rows = rowData(langs, state.base);
    if (state.fam !== 'all') rows = rows.filter(r => r.familyId === state.fam || r.isBase);

    const base = rows.find(r => r.isBase);
    let rest = rows.filter(r => !r.isBase);
    const col = COLS.find(c => c.key === state.sortKey);
    rest.sort((a, b) => {
      let av = a[state.sortKey], bv = b[state.sortKey];
      if (col.num) return (av - bv) * state.sortDir;
      return String(av).localeCompare(String(bv)) * state.sortDir;
    });
    const ordered = base ? [base, ...rest] : rest;

    const arrow = (k) => state.sortKey === k ? (state.sortDir === 1 ? '▲' : '▼') : '↕';

    wrap.innerHTML = `
      <table class="cmp">
        <thead><tr>
          ${COLS.map(c => `<th data-key="${c.key}" class="${state.sortKey === c.key ? 'sorted' : ''}">${esc(c.label)}<span class="arr">${arrow(c.key)}</span></th>`).join('')}
        </tr></thead>
        <tbody>
          ${ordered.map(r => `
            <tr class="${r.isBase ? 'cmp-base-row' : ''}">
              <td><div class="cmp-lang"><span class="cmp-lang__glyph ${r.script}">${esc(r.glyph)}</span><span class="cmp-lang__name">${esc(r.name)}</span></div></td>
              <td><span class="cmp-fam">${esc(r.family)}</span></td>
              <td class="cmp-dir">${r.direction === 'rtl' ? 'RTL ←' : 'LTR →'}</td>
              <td style="font-variant-numeric:tabular-nums">${r.letters}</td>
              <td style="font-variant-numeric:tabular-nums">${r.shared}</td>
              <td style="font-variant-numeric:tabular-nums">${r.unique}</td>
              <td><div class="cmp-sim"><span class="cmp-sim__bar"><span class="cmp-sim__fill" style="width:${r.sim}%"></span></span><span class="cmp-sim__pct">${r.sim}</span></div></td>
              <td><span class="cmp-note">${esc(r.note)}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    wrap.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const k = th.dataset.key;
        if (state.sortKey === k) state.sortDir *= -1;
        else { state.sortKey = k; state.sortDir = COLS.find(c => c.key === k).num ? -1 : 1; }
        draw();
      });
    });
  }

  controls.querySelector('#baseSel').addEventListener('change', (e) => { state.base = e.target.value; draw(); });
  controls.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    state.fam = c.dataset.fam;
    controls.querySelectorAll('.chip').forEach(x => x.classList.toggle('is-on', x === c));
    draw();
  }));

  draw();
  return screen;
}
