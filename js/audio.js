// audio.js — live pronunciation through your Cloudflare Worker (Azure TTS).
// Drop-in replacement: same play() / stopCurrent() the rest of the app already uses.
// • A single Latin or Cyrillic letter is spoken by its NAME ("B" → "bee").
// • Letters in other scripts (Arabic, Hebrew, Hindi, Korean, Burmese, Khmer)
//   are spoken by the native voice as the character itself.
// • Words are spoken normally.
// Each clip is cached by the browser, so re-tapping is instant and free.

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  PASTE YOUR CLOUDFLARE WORKER URL between the quotes (keep the slash):     ║
const WORKER_URL = "https://tts.omwhatsup.workers.dev/";
// ╚══════════════════════════════════════════════════════════════════════════╝

// Latin- and Cyrillic-script languages: a single letter should be read by name.
const LETTER_NAME_LOCALES = new Set([
  "fr-FR", "de-DE", "it-IT", "pt-BR", "id-ID", "sw-KE", "ru-RU",
]);

function isConfigured() {
  return WORKER_URL && WORKER_URL.indexOf("YOUR-WORKER") === -1;
}

let currentAudio = null;

function stopCurrent() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch (e) {}
    currentAudio = null;
  }
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
}

// Decide WHAT to say and whether to spell it as a letter name.
// Exposed for testing; also future-proof for an optional `say` override field.
export function resolveSpeech(opts) {
  const o = opts || {};
  if (o.say && String(o.say).trim()) {
    return { speakText: String(o.say).trim(), asChars: false };
  }
  const text = String(o.text == null ? "" : o.text).trim();
  const isSingle = Array.from(text).length === 1;   // counts real characters
  const asChars = isSingle && LETTER_NAME_LOCALES.has(o.lang);
  return { speakText: text, asChars };
}

export function buildUrl(speakText, lang, asChars) {
  const p = new URLSearchParams();
  p.set("text", speakText);
  if (lang) p.set("locale", lang);
  if (asChars) p.set("as", "chars");
  return WORKER_URL + "?" + p.toString();
}

function playUrl(url) {
  return new Promise((resolve) => {
    const a = new Audio();
    let settled = false;
    const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };
    const clear = () => clearTimeout(timer);
    const timer = setTimeout(() => done(false), 8000); // network hang safety net

    a.addEventListener("playing", () => { clear(); done(true); }, { once: true });
    a.addEventListener("error", () => { clear(); done(false); }, { once: true });
    a.addEventListener("ended", () => { if (currentAudio === a) currentAudio = null; });

    a.src = url;
    currentAudio = a;
    const pr = a.play();
    if (pr && pr.catch) pr.catch(() => { clear(); done(false); });
  });
}

// Fallback so buttons still make sound before the Worker URL is set, or if offline.
function speak(text, lang) {
  if (!("speechSynthesis" in window) || !text) return false;
  try {
    const u = new SpeechSynthesisUtterance(text);
    if (lang) u.lang = lang;
    u.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length && lang) {
      const base = lang.toLowerCase().split("-")[0];
      const match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(base));
      if (match) u.voice = match;
    }
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

/**
 * Play a pronunciation. Same shape the app already calls:
 *   play({ text, lang })           // words and letters
 *   play({ text, lang, say })      // optional exact-pronunciation override
 * Returns 'worker' | 'tts' | 'none'.
 */
export async function play(opts) {
  stopCurrent();
  const lang = (opts && opts.lang) || "";
  const { speakText, asChars } = resolveSpeech(opts);
  if (!speakText) return "none";

  if (isConfigured()) {
    const ok = await playUrl(buildUrl(speakText, lang, asChars));
    if (ok) return "worker";
  }
  return speak(speakText, lang) ? "tts" : "none";
}

export { stopCurrent };

// Warm up the fallback voice list (some browsers populate it asynchronously).
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
