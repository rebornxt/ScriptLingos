// letter.js — letter detail: hero, forms, IPA, hear letter, memory trick, words
import { loadLanguage } from '../data.js';
import { h, esc, bindSpeak, PLAY_SVG, SMALL_PLAY } from '../ui.js';
import { renderTypeface } from '../fonts.js';
import { store } from '../store.js';

const FORM_ORDER = ['isolated', 'initial', 'medial', 'final'];
const REVEAL_KEY = 'sl.reveal'; // false = name/romanization/IPA hidden (default)
let enterDir = 0; // set by prev/next nav so the next render can animate in

const EYE = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .35 4.2.9M21.5 12S18 18.5 12 18.5c-1.6 0-3-.35-4.2-.9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M9.5 9.6a3 3 0 0 0 4.2 4.3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

export async function render({ code, letterId }) {
  const data = await loadLanguage(code);
  const meta = data._meta;
  const idx = data.letters.findIndex(l => l.id === letterId);
  const letter = data.letters[idx];
  if (!letter) {
    const e = h('<div class="screen"><div class="empty">Letter not found.</div></div>');
    return e;
  }

  const screen = h('<div class="screen detail"></div>');
  if (enterDir !== 0) {
    screen.classList.add(enterDir > 0 ? 'slide-from-right' : 'slide-from-left');
    enterDir = 0;
  }

  // typeface picker — at the very top so learners can fix the shape before reading
  const typeface = renderTypeface(meta.script, letter.char);
  if (typeface) screen.appendChild(typeface);

  let revealed = store.get(REVEAL_KEY, false) === true;

  // hero
  const hero = h(`
    <div class="hero ${revealed ? '' : 'is-concealed'}">
      <button class="hero__reveal" id="revealBtn" type="button" aria-pressed="${revealed}" title="Show or hide the answer">
        <span class="hero__reveal-ico">${revealed ? EYE : EYE_OFF}</span>
        <span class="hero__reveal-txt">${revealed ? 'Hide' : 'Show'}</span>
      </button>
      <div class="hero__char ${meta.script}">${esc(letter.char)}</div>
      <p class="hero__hint">Name &amp; sound hidden — tap <b>Show</b></p>
      <div class="hero__name">${esc(letter.name)}</div>
      <div class="hero__meta">
        <span class="meta-chip"><span>Romanization</span><b>${esc(letter.romanization)}</b></span>
        ${letter.ipa ? `<span class="meta-chip"><span>IPA</span><b>${esc(letter.ipa)}</b></span>` : ''}
      </div>
      <div style="margin-top:18px">
        <button class="speak" id="hearLetter">
          <span class="speak__ico">${PLAY_SVG}</span> Hear the letter
        </button>
      </div>
    </div>
  `);
  screen.appendChild(hero);
  bindSpeak(hero.querySelector('#hearLetter'), () => ({
    mp3: letter.letterAudio,
    text: letter.char,
    lang: data.code
  }));

  // show / hide name + romanization + IPA (hidden by default; preference persists)
  const revealBtn = hero.querySelector('#revealBtn');
  revealBtn.addEventListener('click', () => {
    revealed = !revealed;
    store.set(REVEAL_KEY, revealed);
    hero.classList.toggle('is-concealed', !revealed);
    revealBtn.setAttribute('aria-pressed', String(revealed));
    revealBtn.querySelector('.hero__reveal-ico').innerHTML = revealed ? EYE : EYE_OFF;
    revealBtn.querySelector('.hero__reveal-txt').textContent = revealed ? 'Hide' : 'Show';
  });

  // forms (optional)
  if (letter.forms) {
    const present = FORM_ORDER.filter(f => letter.forms[f]);
    const card = h(`
      <div class="card">
        <p class="card__label">Forms in a word</p>
        <div class="forms ${present.length <= 2 ? 'forms--2' : ''}"></div>
      </div>
    `);
    const wrap = card.querySelector('.forms');
    for (const f of present) {
      wrap.appendChild(h(`
        <div class="form-cell">
          <span class="form-cell__char ${meta.script}">${esc(letter.forms[f])}</span>
          <span class="form-cell__tag">${esc(f)}</span>
        </div>
      `));
    }
    screen.appendChild(card);
  }

  // memory trick
  if (letter.memoryTrick) {
    screen.appendChild(h(`
      <div class="card">
        <p class="card__label">Memory trick</p>
        <div class="trick">
          <span class="trick__ico" aria-hidden="true">💡</span>
          <p>${esc(letter.memoryTrick)}</p>
        </div>
      </div>
    `));
  }

  // words
  if (letter.words && letter.words.length) {
    const card = h(`
      <div class="card">
        <p class="card__label">Example words</p>
        <div class="words"></div>
      </div>
    `);
    const list = card.querySelector('.words');
    letter.words.forEach((w) => {
      const row = h(`
        <button class="word">
          <span class="word__emoji" aria-hidden="true">${esc(w.emoji || '🔤')}</span>
          <span class="word__body">
            <span class="word__text ${meta.script}">${esc(w.text)}</span>
            <span class="word__roman">${esc(w.roman || '')}</span>
            <span class="word__meaning">${esc(w.meaning || '')}</span>
          </span>
          <span class="word__play">${SMALL_PLAY}</span>
        </button>
      `);
      bindSpeak(row, () => ({ mp3: w.audio, text: w.text, lang: data.code }));
      list.appendChild(row);
    });
    screen.appendChild(card);
  }

  // prev / next
  const prev = data.letters[idx - 1];
  const next = data.letters[idx + 1];
  const nav = h('<div class="detail-nav"></div>');
  nav.appendChild(h(`
    <a class="btn btn--ghost" ${prev ? `href="#/lang/${encodeURIComponent(code)}/letter/${encodeURIComponent(prev.id)}"` : 'aria-disabled="true" disabled'}>
      ← ${prev ? esc(prev.name) : 'Start'}
    </a>`));
  nav.appendChild(h(`
    <a class="btn btn--ghost" ${next ? `href="#/lang/${encodeURIComponent(code)}/letter/${encodeURIComponent(next.id)}"` : 'aria-disabled="true" disabled'}>
      ${next ? esc(next.name) : 'End'} →
    </a>`));
  screen.appendChild(nav);

  screen.appendChild(h('<p class="detail-tip">Swipe, or use the ← → arrow keys, to move between letters.</p>'));

  // ---- navigate between letters: ← / → arrow keys + touch swipe ----
  const go = (delta) => {
    const target = data.letters[idx + delta];
    if (target) {
      enterDir = delta; // remember direction so the new screen slides in
      location.hash = '#/lang/' + encodeURIComponent(code) + '/letter/' + encodeURIComponent(target.id);
    }
  };

  function onKey(e) {
    if (!screen.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  }
  document.addEventListener('keydown', onKey);

  let sx = 0, sy = 0, st = 0;
  screen.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = Date.now();
  }, { passive: true });
  screen.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st < 600 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1); // swipe left → next, swipe right → previous
    }
  }, { passive: true });

  return screen;
}
