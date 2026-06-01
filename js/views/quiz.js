// quiz.js — single-language quiz with three directions:
//   • sound : hear a letter → pick the character that makes that sound  (default)
//   • glyph : see the glyph → pick the matching sound (romanization)     (reverse recall)
//   • ipa   : see the glyph → pick the matching /IPA/ transcription
// Arabic covers every positional form. Missed items persist per language *and mode*,
// and come first next time. Best score is kept per language and mode.
import { getReadyLanguages, loadQuizItems } from '../data.js';
import { store } from '../store.js';
import { play } from '../audio.js';
import { setAccent, h, esc, shuffle, PLAY_SVG } from '../ui.js';

const N = 10;

// Three quiz directions. `distinct` returns the value that must differ between the
// on-screen options; `prompt`/`option` shape what the learner sees.
const MODES = {
  sound: { id: 'sound', label: 'Sound', sub: '→ glyph', full: 'Hear → Glyph' },
  glyph: { id: 'glyph', label: 'Glyph', sub: '→ sound', full: 'Glyph → Sound' },
  ipa:   { id: 'ipa',   label: 'Glyph', sub: '→ IPA',   full: 'Glyph → IPA' }
};
const MODE_KEY = 'sl.quiz.mode';
const getMode = () => (MODES[store.get(MODE_KEY, 'sound')] ? store.get(MODE_KEY, 'sound') : 'sound');

// Keys are namespaced by mode. 'sound' keeps the original keys so existing
// progress carries over; other modes get a mode-prefixed key.
const missedKey = (code, mode) => mode === 'sound' ? 'sl.quiz.missed.' + code : 'sl.quiz.missed.' + mode + '.' + code;
const bestKey   = (code, mode) => mode === 'sound' ? 'sl.quiz.best.' + code   : 'sl.quiz.best.' + mode + '.' + code;
const appRoot = () => document.getElementById('app-root');

const distinctVal = (mode) => (item) =>
  mode === 'glyph' ? item.romanization :
  mode === 'ipa'   ? item.ipa :
  item.char;

function buildSession(pool, missedUids, n, optionCount, distinct) {
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
    // distractors: a different underlying letter AND a distinct on-screen value
    const pickedLetters = new Set([target.letterId]);
    const pickedVals = new Set([distinct(target)]);
    const distractors = [];
    for (const cand of shuffle(pool)) {
      if (distractors.length >= optionCount - 1) break;
      if (pickedLetters.has(cand.letterId)) continue;
      const v = distinct(cand);
      if (v == null || pickedVals.has(v)) continue;
      pickedLetters.add(cand.letterId); pickedVals.add(v);
      distractors.push(cand);
    }
    return { target, options: shuffle([target, ...distractors]) };
  });
}

export async function render() {
  const langs = await getReadyLanguages();
  const screen = h('<div class="screen quiz"></div>');
  let mode = getMode();

  function showPicker() {
    setAccent(appRoot(), '');
    const m = MODES[mode];
    screen.innerHTML = `
      <header>
        <p class="eyebrow" style="text-align:center">Test yourself</p>
        <h1 class="page-title" style="text-align:center">Alphabet quiz</h1>
        <p class="page-sub" style="margin:0 auto;text-align:center">Choose a direction, then a language — ${N} questions, then a score. Missed letters come back first next time.</p>
      </header>

      <p class="quiz-pick-label">Quiz direction</p>
      <div class="quiz-modes" role="tablist" aria-label="Quiz direction">
        ${Object.values(MODES).map(o => `
          <button class="qmode ${o.id === mode ? 'is-on' : ''}" role="tab" aria-selected="${o.id === mode}" data-mode="${o.id}">
            <span class="qmode__label">${esc(o.label)}</span>
            <span class="qmode__sub">${esc(o.sub)}</span>
          </button>`).join('')}
      </div>

      <p class="quiz-pick-label">${mode === 'sound' ? 'Pick a language — hear it, choose the glyph' : mode === 'glyph' ? 'Pick a language — see the glyph, choose its sound' : 'Pick a language — see the glyph, choose its IPA'}</p>
      <div class="quiz-pick"></div>`;

    screen.querySelectorAll('.qmode').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.mode === mode) return;
        mode = btn.dataset.mode;
        store.set(MODE_KEY, mode);
        showPicker();
      });
    });

    const grid = screen.querySelector('.quiz-pick');
    for (const lang of langs) {
      const best = store.get(bestKey(lang.code, mode), null);
      const carried = store.get(missedKey(lang.code, mode), []).length;
      const card = h(`
        <button class="quiz-pick__card ${lang.accent}">
          <span class="quiz-pick__glyph ${lang.script}">${esc(lang.glyph)}</span>
          <span class="quiz-pick__body">
            <span class="quiz-pick__native ${lang.script}">${esc(lang.native)}</span>
            <span class="quiz-pick__name">${esc(lang.language)}${lang.draft ? ' <span class="draft-dot">Draft</span>' : ''}</span>
          </span>
          <span class="quiz-pick__meta">
            ${best != null ? `<span class="quiz-pick__best">Best ${best}%</span>` : ''}
            ${carried ? `<span class="quiz-pick__carry" title="${carried} to review">↺ ${carried}</span>` : ''}
          </span>
        </button>`);
      card.addEventListener('click', () => startSession(lang, mode));
      grid.appendChild(card);
    }
  }

  async function startSession(lang, mode) {
    setAccent(appRoot(), lang.accent);
    screen.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    const data = await loadQuizItems(lang.code);

    // Build the pool. IPA mode only includes letters that carry an IPA value.
    let pool = data.items;
    if (mode === 'ipa') pool = pool.filter(it => it.ipa && String(it.ipa).trim());

    const distinct = distinctVal(mode);
    const distinctCount = new Set(pool.map(distinct).filter(v => v != null)).size;

    if (pool.length < 2 || distinctCount < 2) {
      screen.innerHTML = `
        <div class="empty">
          <p style="font-weight:800;color:var(--ink);margin-bottom:6px">IPA quiz isn't ready for ${esc(data.language)} yet.</p>
          <p>This language doesn't have enough IPA data to quiz. Try the other directions, or another language.</p>
          <div style="margin-top:18px"><button class="btn btn--ghost" id="backPick">Choose again</button></div>
        </div>`;
      screen.querySelector('#backPick').addEventListener('click', () => showPicker());
      return;
    }

    const optionCount = Math.min(4, distinctCount);
    const missedUids = store.get(missedKey(lang.code, mode), []);
    const best = store.get(bestKey(lang.code, mode), null);
    const session = buildSession(pool, missedUids, N, optionCount, distinct);
    const missedSet = new Set(missedUids);
    let i = 0, score = 0, locked = false;

    const formLabel = (item) => item.formName
      ? `${esc(data.language)} · <b>${esc(item.formName)}</b> form`
      : `${esc(data.language)} letter`;

    function renderQuestion() {
      locked = false;
      const q = session[i];
      const pct = Math.round((i / N) * 100);

      // ----- prompt differs per mode -----
      let promptHtml;
      if (mode === 'sound') {
        promptHtml = `
          <div class="quiz-prompt">
            <p>Which character makes this sound?</p>
            <button class="speak is-playing" id="replay"><span class="speak__ico">${PLAY_SVG}</span> Play sound again</button>
            <p class="quiz-prompt__hint">${formLabel(q.target)}</p>
          </div>`;
      } else {
        const ask = mode === 'glyph' ? 'Which sound does this letter make?' : 'Which IPA matches this letter?';
        promptHtml = `
          <div class="quiz-prompt">
            <p>${ask}</p>
            <div class="quiz-glyph ${data.script}">${esc(q.target.char)}</div>
            <p class="quiz-prompt__hint">${formLabel(q.target)}</p>
          </div>`;
      }

      // ----- options differ per mode -----
      const optHtml = q.options.map(o => {
        if (mode === 'sound') {
          return `<button class="qopt ${data.script}" data-uid="${esc(o.uid)}" aria-label="${esc(o.name)}">${esc(o.char)}</button>`;
        }
        if (mode === 'glyph') {
          // a tappable "listen" button (hear freely) + the romanization; the
          // button body is the answer — listening and choosing are separate.
          return `<button class="qopt qopt--sound" data-uid="${esc(o.uid)}">
            <span class="qopt__play" role="button" tabindex="0" aria-label="Hear this sound" data-play="${esc(o.uid)}">${PLAY_SVG}</span>
            <span class="qopt__rom">${esc(o.romanization)}</span>
          </button>`;
        }
        return `<button class="qopt qopt--text qopt--ipa" data-uid="${esc(o.uid)}">${esc(o.ipa)}</button>`;
      }).join('');

      screen.innerHTML = `
        <div class="quiz-bar">
          <span class="quiz-count">${i + 1} / ${N}</span>
          <span class="quiz-prog"><span class="quiz-prog__fill" style="width:${pct}%"></span></span>
          <span class="quiz-score-mini">${score} ✓</span>
        </div>
        ${promptHtml}
        <div class="quiz-options" data-n="${optionCount}">${optHtml}</div>
        <div class="quiz-feedback" id="fb"></div>`;

      // sound mode: play the target sound (and a replay button)
      if (mode === 'sound') {
        const replay = screen.querySelector('#replay');
        const playTarget = async () => {
          replay.classList.add('is-playing');
          try { await play({ mp3: q.target.letterAudio, text: q.target.sound, lang: data.code }); } catch (e) {}
          setTimeout(() => replay.classList.remove('is-playing'), 850);
        };
        replay.addEventListener('click', playTarget);
        playTarget();
      }

      // glyph mode: each option carries a "listen" button you can tap freely
      // (hear the candidate sound) without committing to it as your answer.
      if (mode === 'glyph') {
        screen.querySelectorAll('.qopt__play').forEach(p => {
          const hear = (e) => {
            e.stopPropagation();
            if (locked) return;
            const o = q.options.find(x => x.uid === p.dataset.play);
            if (!o) return;
            p.classList.add('is-playing');
            try { play({ mp3: o.letterAudio, text: o.sound, lang: data.code }); } catch (err) {}
            setTimeout(() => p.classList.remove('is-playing'), 850);
          };
          p.addEventListener('click', hear);
          p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') hear(e); });
        });
      }

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
          // reinforce by playing the letter's sound after a glyph/ipa answer
          if (mode !== 'sound') {
            try { play({ mp3: q.target.letterAudio, text: q.target.sound, lang: data.code }); } catch (e) {}
          }
          const formTxt = q.target.formName ? ' · ' + q.target.formName : '';
          if (correct) {
            score++;
            missedSet.delete(q.target.uid);
            fb.textContent = 'Correct — ' + q.target.name + formTxt;
            fb.className = 'quiz-feedback ok';
          } else {
            missedSet.add(q.target.uid);
            const detail = mode === 'ipa'
              ? q.target.char + ' = ' + q.target.name + formTxt + ' ' + (q.target.ipa || '')
              : q.target.char + ' = ' + q.target.name + formTxt + ' (' + q.target.romanization + ')';
            fb.textContent = detail;
            fb.className = 'quiz-feedback no';
          }
          setTimeout(() => { i++; (i >= N) ? finish() : renderQuestion(); }, correct ? 850 : 1550);
        });
      });
    }

    function finish() {
      const pct = Math.round((score / N) * 100);
      const newBest = best == null || pct > best;
      store.set(missedKey(lang.code, mode), Array.from(missedSet));
      if (newBest) store.set(bestKey(lang.code, mode), pct);

      const wrong = session.map(q => q.target)
        .filter(t => missedSet.has(t.uid))
        .filter((t, idx, arr) => arr.findIndex(x => x.uid === t.uid) === idx);

      const msg = pct === 100 ? 'Flawless! 🎉' : pct >= 70 ? 'Nicely done.' : pct >= 40 ? 'Getting there.' : 'Keep practising.';
      const C = 2 * Math.PI * 64;
      screen.innerHTML = `
        <div class="result">
          <p class="eyebrow" style="text-align:center">${esc(data.language)} · ${esc(MODES[mode].full)}</p>
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
              <span class="review-item__info"><b>${esc(t.name)}${t.formName ? ' · ' + esc(t.formName) : ''}</b><span>${esc(data.language)} · ${esc(mode === 'ipa' && t.ipa ? t.ipa : t.romanization)}</span></span>
              <span class="review-item__x">missed</span>
            </div>`).join('')}</div>` : ''}
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
            <button class="btn btn--block" id="again">Play ${esc(data.language)} again</button>
            <button class="btn btn--ghost btn--block" id="pickAnother">Choose another</button>
          </div>
        </div>`;
      requestAnimationFrame(() => {
        const ring = screen.querySelector('#ringFill');
        if (ring) { ring.style.transition = 'stroke-dashoffset 1s cubic-bezier(.22,.61,.36,1)'; ring.style.strokeDashoffset = C * (1 - pct / 100); }
      });
      screen.querySelector('#again').addEventListener('click', () => startSession(lang, mode));
      screen.querySelector('#pickAnother').addEventListener('click', () => showPicker());
    }

    renderQuestion();
  }

  showPicker();
  return screen;
}
