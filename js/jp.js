// jp.js — reconstruct the Japanese kana layout (Hiragana/Katakana toggle,
// category sections, five-per-row gojūon) from the FLAT letter list, entirely
// in code. The data/ja-JP.json file is never edited — every field that grid.js
// and letter.js expect (data.layout, data.jp, letter.kana, letter.cat) is
// derived here from each letter's id / char / romanization.

// Dakuten (゛) and handakuten (゜) syllables all begin with one of these sounds;
// no basic gojūon syllable does, so the initial letter of the romanization is a
// reliable, data-free way to separate them from the 46 core kana.
const VOICED_INITIALS = new Set(['g', 'z', 'j', 'd', 'b', 'p']);

function classify(letter) {
  const id = letter.id || '';
  const kana = id.startsWith('ja-kata') ? 'katakana'
            : id.startsWith('ja-hira') ? 'hiragana'
            : null;
  if (!kana) return null;

  // Yōon are written with a small や/ゆ/よ, so the glyph is two code points
  // (e.g. きゃ). The names also carry the word "Yōon" — either signal works.
  const glyphLen = Array.from(letter.char || '').length;
  const isYoon = glyphLen >= 2 || /Y[oō]on/i.test(letter.name || '');

  const initial = (letter.romanization || '').toLowerCase().charAt(0);

  let cat;
  if (isYoon) cat = 'yoon';
  else if (VOICED_INITIALS.has(initial)) cat = 'dakuten';
  else cat = 'gojuon';

  return { kana, cat };
}

export function isJapanese(data) {
  if (!data || !Array.isArray(data.letters)) return false;
  if (data.code === 'ja-JP') return true;
  return data.letters.some(l => (l.id || '').startsWith('ja-hira') || (l.id || '').startsWith('ja-kata'));
}

// Mutates `data` in place: tags every letter with kana/cat and attaches the
// `layout` + `jp` config grid.js reads. Safe to call on any language — it only
// acts on Japanese data and is idempotent.
export function applyJapaneseLayout(data) {
  if (!isJapanese(data)) return data;
  if (data.layout === 'jp' && data.jp) return data; // already done (cached)

  let tagged = 0;
  for (const letter of data.letters) {
    const c = classify(letter);
    if (c) { letter.kana = c.kana; letter.cat = c.cat; tagged++; }
  }
  if (!tagged) return data;

  data.layout = 'jp';
  data.jp = {
    tabs: [
      { id: 'hiragana', native: 'ひらがな', label: 'Hiragana', cats: ['gojuon', 'dakuten', 'yoon'] },
      { id: 'katakana', native: 'カタカナ', label: 'Katakana', cats: ['gojuon', 'dakuten', 'yoon'] }
    ],
    cats: {
      gojuon:  { label: 'Gojūon — basic syllables', blurb: 'The 46 core sounds. Five vowels lead each row, then every consonant group — read five across, just like the textbook chart.' },
      dakuten: { label: 'Dakuten & Handakuten', blurb: 'Voiced and semi-voiced sounds: the same shapes marked with two dots ゛(dakuten) or a small circle ゜(handakuten).' },
      yoon:    { label: 'Yōon — glides', blurb: 'Contracted sounds, written by joining a small ゃ・ゅ・ょ to an i-row kana.' }
    }
  };
  return data;
}
