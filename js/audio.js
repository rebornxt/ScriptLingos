// audio.js — play an MP3 if present; otherwise fall back to speechSynthesis.
// MP3 always takes priority. Every button stays demonstrable in preview.

let currentAudio = null;

function stopCurrent() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch (e) {}
    currentAudio = null;
  }
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
}

// Try to load + play an MP3. Resolves true if it actually played, false if missing/failed.
function tryMp3(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(false);
    const a = new Audio();
    let settled = false;
    const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };

    a.addEventListener('error', () => done(false), { once: true });
    a.addEventListener('playing', () => done(true), { once: true });
    a.addEventListener('ended', () => { if (currentAudio === a) currentAudio = null; });

    // If it can't even start within a beat, treat as missing.
    const t = setTimeout(() => done(false), 1200);
    a.addEventListener('playing', () => clearTimeout(t), { once: true });
    a.addEventListener('error', () => clearTimeout(t), { once: true });

    a.src = src;
    currentAudio = a;
    const p = a.play();
    if (p && p.catch) p.catch(() => done(false));
  });
}

// speechSynthesis fallback
function speak(text, langCode) {
  if (!('speechSynthesis' in window) || !text) return false;
  try {
    const u = new SpeechSynthesisUtterance(text);
    if (langCode) u.lang = langCode;
    u.rate = 0.82;
    u.pitch = 1;
    // Prefer a voice that matches the language if available.
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length && langCode) {
      const base = langCode.toLowerCase().split('-')[0];
      const match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(base));
      if (match) u.voice = match;
    }
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

/**
 * Play a pronunciation.
 * @param {object} opts { mp3, text, lang }
 * @returns {Promise<'mp3'|'tts'|'none'>}
 */
export async function play({ mp3, text, lang }) {
  stopCurrent();
  const ok = await tryMp3(mp3);
  if (ok) return 'mp3';
  return speak(text, lang) ? 'tts' : 'none';
}

export { stopCurrent };

// warm up voices list (some browsers populate async)
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
