// quiz.js — single-language sound quiz. Pick a language, hear a letter, choose the
// character. Arabic covers every form. Missed items persist per language and come first.
import { getReadyLanguages, loadQuizItems } from '../data.js';
import { store } from '../store.js';
import { play } from '../audio.js';
import { setAccent, h, esc, shuffle, PLAY_SVG } from '../ui.js';

const N = 10;
const missedKey = (code) => 'sl.quiz.missed.' + code;
const bestKey = (code) => 'sl.quiz.best.' + code;
const appRoot = () => document.getElementById('app-root');

function buildSession(pool, missedUids, n, optionCount) {
  const missedSet = new Set(missedUids);
  const missed = shuffle(pool.filter(p => missedSet.has(p.uid)));
  const fresh = shuffle(pool.filter(p => !missedSet.has(p.uid)));
  let seq = [...missed, ...fresh];
  if (seq.length < n) {
    const cyc = shuffle(pool);
    let i = 0;
    while (seq.length < n) {
      const cand = cyc[i % cyc.length]; i++;
      if (seq.length && seq[seq.length - 1].uid === cand.uid) continue;
      seq.push(cand);
    }
  }
  seq = seq.slice(0, n);

  return seq.map(target => {
    // distractors: different underlying letter, distinct display glyphs
    const pickedLetters = new Set([target.letterId]);
    const pickedChars = new Set([target.char]);
    const distractors = [];
    for (const cand of shuffle(pool)) {
      if (distractors.length >= optionCount - 1) break;
      if (pickedLetters.has(cand.letterId) || pickedChars.has(cand.char)) continue;
      pickedLetters.add(cand.letterId); pickedChars.add(cand.char);
      distractors.push(cand);
    }
    return { target, options: shuffle([target, ...distractors]) };
  });
}

export async function render() {
  const langs = await getReadyLanguages();
  const screen = h('<div class="screen quiz"></div>');

  function showPicker() {
    setAccent(appRoot(), '');
    screen.innerHTML = `
      <header>
        <p class="eyebrow" style="text-align:center">Listen & choose</p>
        <h1 class="page-title" style="text-align:center">Sound quiz</h1>
        <p class="page-sub" style="margin:0 auto;text-align:center">Pick one language. You'll hear a letter and tap the character that makes that sound — ${N} questions, then a score.</p>
      </header>
      <p class="quiz-pick-label">Choose a language to quiz</p>
      <div class="quiz-pick"></div>`;
    const grid = screen.querySelector('.quiz-pick');
    for (const lang of langs) {
      const best = store.get(bestKey(lang.code), null);
      const carried = store.get(missedKey(lang.code), []).length;
      const card = h(`
        <button class="quiz-pick__card ${lang.accent}">
          <span class="quiz-pick__glyph ${lang.script}">${esc(lang.glyph)}</span>
          <span class="quiz-pick__body">
            <span class="quiz-pick__native ${lang.script}">${esc(lang.native)}</span>
            <span class="quiz-pick__name">${esc(lang.language)}</span>
          </span>
          <span class="quiz-pick__meta">
            ${best != null ? `<span class="quiz-pick__best">Best ${best}%</span>` : ''}
            ${carried ? `<span class="quiz-pick__carry" title="${carried} to review">↺ ${carried}</span>` : ''}
          </span>
        </button>`);
      card.addEventListener('click', () => startSession(lang));
      grid.appendChild(card);
    }
  }

  async function startSession(lang) {
    setAccent(appRoot(), lang.accent);
    screen.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    const data = await loadQuizItems(lang.code);
    const pool = data.items;
    const distinctLetters = new Set(pool.map(p => p.letterId)).size;
    const optionCount = Math.min(4, distinctLetters);

    const missedUids = store.get(missedKey(lang.code), []);
    const best = store.get(bestKey(lang.code), null);
    const session = buildSession(pool, missedUids, N, optionCount);
    const missedSet = new Set(missedUids);
    let i = 0, score = 0, locked = false;

    const formLabel = (item) => item.formName
      ? `${data.language} · <b>${esc(item.formName)}</b> form`
      : `${esc(data.language)} letter`;

    function renderQuestion() {
      locked = false;
      const q = session[i];
      const pct = Math.round((i / N) * 100);
      screen.innerHTML = `
        <div class="quiz-bar">
          <span class="quiz-count">${i + 1} / ${N}</span>
          <span class="quiz-prog"><span class="quiz-prog__fill" style="width:${pct}%"></span></span>
          <span class="quiz-score-mini">${score} ✓</span>
        </div>
        <div class="quiz-prompt">
          <p>Which character makes this sound?</p>
          <button class="speak is-playing" id="replay"><span class="speak__ico">${PLAY_SVG}</span> Play sound again</button>
          <p class="quiz-prompt__hint">${formLabel(q.target)}</p>
        </div>
        <div class="quiz-options" data-n="${optionCount}">
          ${q.options.map(o => `<button class="qopt ${data.script}" data-uid="${esc(o.uid)}">${esc(o.char)}</button>`).join('')}
        </div>
        <div class="quiz-feedback" id="fb"></div>`;

      const replay = screen.querySelector('#replay');
      const playTarget = async () => {
        replay.classList.add('is-playing');
        try { await play({ mp3: q.target.letterAudio, text: q.target.sound, lang: data.code }); } catch (e) {}
        setTimeout(() => replay.classList.remove('is-playing'), 850);
      };
      replay.addEventListener('click', playTarget);
      playTarget();

      screen.querySelectorAll('.qopt').forEach(btn => {
        btn.addEventListener('click', () => {
          if (locked) return;
          locked = true;
          const correct = btn.dataset.uid === q.target.uid;
          const fb = screen.querySelector('#fb');
          screen.querySelectorAll('.qopt').forEach(b => {
            b.setAttribute('disabled', '');
            if (b.dataset.uid === q.target.uid) b.classList.add('is-correct');
            else if (b === btn) b.classList.add('is-wrong');
            else b.classList.add('is-dim');
          });
          const formTxt = q.target.formName ? ' · ' + q.target.formName : '';
          if (correct) {
            score++;
            missedSet.delete(q.target.uid);
            fb.textContent = 'Correct — ' + q.target.name + formTxt;
            fb.className = 'quiz-feedback ok';
          } else {
            missedSet.add(q.target.uid);
            fb.textContent = q.target.char + ' = ' + q.target.name + formTxt + ' (' + q.target.romanization + ')';
            fb.className = 'quiz-feedback no';
          }
          setTimeout(() => { i++; (i >= N) ? finish() : renderQuestion(); }, correct ? 850 : 1550);
        });
      });
    }

    function finish() {
      const pct = Math.round((score / N) * 100);
      const newBest = best == null || pct > best;
      store.set(missedKey(lang.code), Array.from(missedSet));
      if (newBest) store.set(bestKey(lang.code), pct);

      const wrong = session.map(q => q.target)
        .filter(t => missedSet.has(t.uid))
        .filter((t, idx, arr) => arr.findIndex(x => x.uid === t.uid) === idx);

      const msg = pct === 100 ? 'Flawless! 🎉' : pct >= 70 ? 'Nicely done.' : pct >= 40 ? 'Getting there.' : 'Keep practising.';
      const C = 2 * Math.PI * 64;
      screen.innerHTML = `
        <div class="result">
          <p class="eyebrow" style="text-align:center">${esc(data.language)} · complete</p>
          <div class="result__ring">
            <svg width="150" height="150" viewBox="0 0 150 150">
              <circle cx="75" cy="75" r="64" fill="none" stroke="var(--surface-2)" stroke-width="13"/>
              <circle cx="75" cy="75" r="64" fill="none" stroke="var(--accent)" stroke-width="13" stroke-linecap="round"
                stroke-dasharray="${C}" stroke-dashoffset="${C}" id="ringFill"/>
            </svg>
            <div class="result__pct"><b>${pct}%</b><span>${score} / ${N}</span></div>
          </div>
          <p class="result__msg">${msg}${newBest && pct > 0 ? ' &nbsp;·&nbsp; New best!' : ''}</p>
          <p class="result__sub">${wrong.length ? `We'll start with ${wrong.length === 1 ? 'this' : 'these'} next time.` : 'No misses to carry over.'}</p>
          ${wrong.length ? `<div class="result-review">${wrong.map(t => `
            <div class="review-item">
              <span class="review-item__char ${data.script}">${esc(t.char)}</span>
              <span class="review-item__info"><b>${esc(t.name)}${t.formName ? ' · ' + esc(t.formName) : ''}</b><span>${esc(data.language)} · ${esc(t.romanization)}</span></span>
              <span class="review-item__x">missed</span>
            </div>`).join('')}</div>` : ''}
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
            <button class="btn btn--block" id="again">Play ${esc(data.language)} again</button>
            <button class="btn btn--ghost btn--block" id="pickAnother">Choose another language</button>
          </div>
        </div>`;
      requestAnimationFrame(() => {
        const ring = screen.querySelector('#ringFill');
        if (ring) { ring.style.transition = 'stroke-dashoffset 1s cubic-bezier(.22,.61,.36,1)'; ring.style.strokeDashoffset = C * (1 - pct / 100); }
      });
      screen.querySelector('#again').addEventListener('click', () => startSession(lang));
      screen.querySelector('#pickAnother').addEventListener('click', () => showPicker());
    }

    renderQuestion();
  }

  showPicker();
  return screen;
}
