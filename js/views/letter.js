// letter.js — letter detail: hero, forms, IPA, hear letter, memory trick, words
import { loadLanguage } from '../data.js';
import { h, esc, bindSpeak, PLAY_SVG, SMALL_PLAY } from '../ui.js';

const FORM_ORDER = ['isolated', 'initial', 'medial', 'final'];

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

  // hero
  const hero = h(`
    <div class="hero">
      <div class="hero__char ${meta.script}">${esc(letter.char)}</div>
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
        <div class="card__head-row">
          <p class="card__label">Example words</p>
          <button class="speak" id="hearFirstWord" style="min-height:42px;padding:9px 16px 9px 12px;font-size:14px">
            <span class="speak__ico" style="width:26px;height:26px">${PLAY_SVG}</span> Hear word
          </button>
        </div>
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
    // "Hear word" plays the first example
    const first = letter.words[0];
    bindSpeak(card.querySelector('#hearFirstWord'), () => ({ mp3: first.audio, text: first.text, lang: data.code }));
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

  return screen;
}
