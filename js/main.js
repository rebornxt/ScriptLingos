// main.js — hash router, theme toggle, per-script accent, transitions
import { getGroupAccent } from './data.js';
import { setAccent } from './ui.js';
import { applyAll as applyFonts } from './fonts.js';
import { stopCurrent } from './audio.js';
import * as home from './views/home.js';
import * as grid from './views/grid.js';
import * as letter from './views/letter.js';
import * as compare from './views/compare.js';
import * as quiz from './views/quiz.js';
import { store } from './store.js';

const app = document.getElementById('app');
const appRoot = document.getElementById('app-root');
const backBtn = document.getElementById('backBtn');
const themeBtn = document.getElementById('themeBtn');
const tabs = Array.from(document.querySelectorAll('.tab'));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let navToken = 0;

function parse() {
  const raw = (location.hash || '#/').replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean); // ['lang','ar-SA','letter','ar-beh']
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'compare') return { name: 'compare' };
  if (parts[0] === 'quiz') return { name: 'quiz' };
  if (parts[0] === 'lang') {
    const code = decodeURIComponent(parts[1] || '');
    if (parts[2] === 'letter') return { name: 'letter', code, letterId: decodeURIComponent(parts[3] || '') };
    return { name: 'grid', code };
  }
  return { name: 'home' };
}

const MODULES = { home, grid, letter, compare, quiz };

async function navigate() {
  const token = ++navToken;
  stopCurrent();
  const route = parse();
  const mod = MODULES[route.name];

  // build off-DOM (only async step) — guarded against being superseded
  let el;
  try {
    el = await mod.render(route);
  } catch (err) {
    console.error(err);
    el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = '<div class="empty">Couldn\'t load this screen.<br><a href="#/" style="color:var(--accent);font-weight:800">Back to start</a></div>';
  }
  if (token !== navToken) return; // a newer navigation started — discard this one

  // accent — applied together with the content it belongs to
  if (route.name === 'grid' || route.name === 'letter') {
    let accent = 'group-euro';
    try { accent = await getGroupAccent(route.code); } catch (e) {}
    if (token !== navToken) return;
    setAccent(appRoot, accent);
  } else {
    setAccent(appRoot, '');
  }

  // chrome
  backBtn.hidden = route.name === 'home';
  setActiveTab(route);

  app.replaceChildren(el);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function setActiveTab(route) {
  const map = { home: 'home', grid: 'home', letter: 'home', compare: 'compare', quiz: 'quiz' };
  const active = map[route.name];
  tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === active));
}

backBtn.addEventListener('click', () => {
  const r = parse();
  // From a letter, "back" always returns to all letters of that language.
  if (r.name === 'letter' && r.code) {
    location.hash = '#/lang/' + encodeURIComponent(r.code);
    return;
  }
  if (history.length > 1) history.back();
  else location.hash = '#/';
});

themeBtn.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  store.set('sl.theme', next);
});

window.addEventListener('hashchange', navigate);
applyFonts();
navigate();
