// audio.js — live pronunciation through your Cloudflare Worker (Azure TTS).
// Drop-in replacement: same play() / stopCurrent() the rest of the app already uses.
// • Single Latin/Cyrillic letters are spoken by name ("B" → "bee").
// • Arabic, Hebrew, Korean, Burmese, Greek, Georgian, and Farsi letters are spoken by
//   their NATIVE NAME (e.g. ص → "صَاد", β → "βήτα", ბ → "ბანი") via LETTER_NAMES below.
// • Names cover BOTH the lesson screen and the quiz automatically.
// • Lao, Bengali, Tamil, and Urdu names are pending — paste them into LETTER_NAMES when
//   ready (until then those letters read by their bare sound).
// • Words are spoken normally. Each clip is cached by the browser (instant re-taps).

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Your Cloudflare Worker URL (already filled in). Change only if it moves.  ║
const WORKER_URL = "https://tts.omwhatsup.workers.dev/";
// ╚══════════════════════════════════════════════════════════════════════════╝

// Latin- and Cyrillic-script languages: a single letter is read by its name.
const LETTER_NAME_LOCALES = new Set([
  "fr-FR", "de-DE", "it-IT", "pt-BR", "id-ID", "sw-KE", "ru-RU",
  // newly drafted Latin & Cyrillic languages
  "tr-TR", "nl-NL", "sv-SE", "nb-NO", "da-DK", "is-IS", "pl-PL", "cs-CZ",
  "sk-SK", "hr-HR", "lt-LT", "lv-LV", "ro-RO", "fi-FI", "hu-HU",
  "tl-PH", "ms-MY", "uk-UA", "bg-BG", "sr-RS",
]);

// Native-script NAME (or sound) for each character, so the voice says the letter's name
// rather than only its raw sound. KEY = the glyph exactly as it appears in your data;
// VALUE = how it should be spoken, written in its own script. To fix/add any letter,
// just edit/add a line here. Entries can be any length (single letters, digraphs, marks).
const LETTER_NAMES = {
  "ar-SA": {
    "ا": "أَلِف", "ب": "بَاء", "ت": "تَاء", "ث": "ثَاء", "ج": "جِيم",
    "ح": "حَاء", "خ": "خَاء", "د": "دَال", "ذ": "ذَال", "ر": "رَاء",
    "ز": "زَاي", "س": "سِين", "ش": "شِين", "ص": "صَاد", "ض": "ضَاد",
    "ط": "طَاء", "ظ": "ظَاء", "ع": "عَيْن", "غ": "غَيْن", "ف": "فَاء",
    "ق": "قَاف", "ك": "كَاف", "ل": "لَام", "م": "مِيم", "ن": "نُون",
    "ه": "هَاء", "و": "وَاو", "ي": "يَاء", "ء": "هَمْزَة",
  },
  "he-IL": {
    "א": "אָלֶף", "ב": "בֵּית", "ג": "גִּימֶל", "ד": "דָּלֶת", "ה": "הֵא",
    "ו": "וָו", "ז": "זַיִן", "ח": "חֵית", "ט": "טֵית", "י": "יוֹד",
    "כ": "כַּף", "ל": "לָמֶד", "מ": "מֵם", "נ": "נוּן", "ס": "סָמֶךְ",
    "ע": "עַיִן", "פ": "פֵּא", "צ": "צָדִי", "ק": "קוֹף", "ר": "רֵישׁ",
    "ש": "שִׁין", "ת": "תָּו",
    // final forms speak the same name as their base letter
    "ך": "כַּף", "ם": "מֵם", "ן": "נוּן", "ף": "פֵּא", "ץ": "צָדִי",
  },
  "ko-KR": {
    "ㄱ": "기역", "ㄴ": "니은", "ㄷ": "디귿", "ㄹ": "리을", "ㅁ": "미음",
    "ㅂ": "비읍", "ㅅ": "시옷", "ㅇ": "이응", "ㅈ": "지읒", "ㅊ": "치읓",
    "ㅋ": "키읔", "ㅌ": "티읕", "ㅍ": "피읖", "ㅎ": "히읗",
    "ㄲ": "쌍기역", "ㄸ": "쌍디귿", "ㅃ": "쌍비읍", "ㅆ": "쌍시옷", "ㅉ": "쌍지읒",
    "ㅏ": "아", "ㅑ": "야", "ㅓ": "어", "ㅕ": "여", "ㅗ": "오",
    "ㅛ": "요", "ㅜ": "우", "ㅠ": "유", "ㅡ": "으", "ㅣ": "이",
    "ㅐ": "애", "ㅒ": "얘", "ㅔ": "에", "ㅖ": "예", "ㅘ": "와",
    "ㅙ": "왜", "ㅚ": "외", "ㅝ": "워", "ㅞ": "웨", "ㅟ": "위", "ㅢ": "의",
  },
  "my-MM": {
    "က": "ကကြီး", "ခ": "ခခွေး", "ဂ": "ဂငယ်", "ဃ": "ဃကြီး",
    "စ": "စလုံး", "ဆ": "ဆလိမ်", "ဇ": "ဇကွဲ", "ဏ": "ဏကြီး",
    "တ": "တဝမ်းပူ", "ထ": "ထဆင်ထူး", "န": "နငယ်", "ပ": "ပစောက်",
    "ဖ": "ဖဦးထုပ်", "ဘ": "ဘကုန်း", "ယ": "ယပက်လက်", "ရ": "ရကောက်",
    "ဠ": "ဠကြီး",
  },
  // ── Greek: 24 letters (upper + lower), plus final sigma ──
  "el-GR": {
    "Α": "άλφα", "α": "άλφα", "Β": "βήτα", "β": "βήτα",
    "Γ": "γάμα", "γ": "γάμα", "Δ": "δέλτα", "δ": "δέλτα",
    "Ε": "έψιλον", "ε": "έψιλον", "Ζ": "ζήτα", "ζ": "ζήτα",
    "Η": "ήτα", "η": "ήτα", "Θ": "θήτα", "θ": "θήτα",
    "Ι": "γιώτα", "ι": "γιώτα", "Κ": "κάπα", "κ": "κάπα",
    "Λ": "λάμδα", "λ": "λάμδα", "Μ": "μι", "μ": "μι",
    "Ν": "νι", "ν": "νι", "Ξ": "ξι", "ξ": "ξι",
    "Ο": "όμικρον", "ο": "όμικρον", "Π": "πι", "π": "πι",
    "Ρ": "ρο", "ρ": "ρο", "Σ": "σίγμα", "σ": "σίγμα", "ς": "σίγμα",
    "Τ": "ταυ", "τ": "ταυ", "Υ": "ύψιλον", "υ": "ύψιλον",
    "Φ": "φι", "φ": "φι", "Χ": "χι", "χ": "χι",
    "Ψ": "ψι", "ψ": "ψι", "Ω": "ωμέγα", "ω": "ωμέγα",
  },
  // ── Georgian: 33 Mkhedruli letters (unicase) ──
  "ka-GE": {
    "ა": "ანი", "ბ": "ბანი", "გ": "განი", "დ": "დონი", "ე": "ენი",
    "ვ": "ვინი", "ზ": "ზენი", "თ": "თანი", "ი": "ინი", "კ": "კანი",
    "ლ": "ლასი", "მ": "მანი", "ნ": "ნარი", "ო": "ონი", "პ": "პარი",
    "ჟ": "ჟანი", "რ": "რაე", "ს": "სანი", "ტ": "ტარი", "უ": "უნი",
    "ფ": "ფარი", "ქ": "ქანი", "ღ": "ღანი", "ყ": "ყარი", "შ": "შინი",
    "ჩ": "ჩინი", "ც": "ცანი", "ძ": "ძილი", "წ": "წილი", "ჭ": "ჭარი",
    "ხ": "ხანი", "ჯ": "ჯანი", "ჰ": "ჰაე",
  },
  // ── Farsi/Persian: Arabic letters (Persian names) + پ چ ژ گ ──
  // (Persian kaf ک = U+06A9, yeh ی = U+06CC; Arabic ك/ي added as aliases just in case.)
  "fa-IR": {
    "ا": "اَلِف", "ب": "بِ", "پ": "پِ", "ت": "تِ", "ث": "ثِ",
    "ج": "جیم", "چ": "چِ", "ح": "حِ", "خ": "خِ", "د": "دال",
    "ذ": "ذال", "ر": "رِ", "ز": "زِ", "ژ": "ژِ", "س": "سین",
    "ش": "شین", "ص": "صاد", "ض": "ضاد", "ط": "طا", "ظ": "ظا",
    "ع": "عین", "غ": "غین", "ف": "فِ", "ق": "قاف",
    "ک": "کاف", "ك": "کاف", "گ": "گاف", "ل": "لام", "م": "میم",
    "ن": "نون", "و": "واو", "ه": "هِ", "ی": "یِ", "ي": "یِ",
  },
};

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
// Exposed for testing; also honors an optional `say` override field on a letter.
export function resolveSpeech(opts) {
  const o = opts || {};
  if (o.say && String(o.say).trim()) {
    return { speakText: String(o.say).trim(), asChars: false };
  }
  const text = String(o.text == null ? "" : o.text).trim();

  // Native-script name for this character (any length: letters, digraphs, marks).
  const map = LETTER_NAMES[o.lang];
  if (map && map[text]) return { speakText: map[text], asChars: false };

  // Single Latin/Cyrillic letter with no entry → let the voice spell its letter name.
  const isSingle = Array.from(text).length === 1;
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
    const timer = setTimeout(() => done(false), 8000); // network hang safety net
    const clear = () => clearTimeout(timer);

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
