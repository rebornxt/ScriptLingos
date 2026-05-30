// data.js — registry + per-language data loading (fetch-based, drop-in JSON ready)

const cache = new Map();
let registry = null;

export async function loadRegistry() {
  if (registry) return registry;
  const res = await fetch('data/languages.json');
  if (!res.ok) throw new Error('Failed to load language registry');
  registry = await res.json();
  return registry;
}

export async function loadLanguage(code) {
  if (cache.has(code)) return cache.get(code);
  const reg = await loadRegistry();
  const entry = reg.languages.find(l => l.code === code);
  if (!entry || !entry.file) throw new Error('No data file for ' + code);
  const res = await fetch(entry.file);
  if (!res.ok) throw new Error('Failed to load ' + entry.file);
  const data = await res.json();
  // merge registry meta (group/script/accent) onto the language data
  data._meta = entry;
  cache.set(code, data);
  return data;
}

export async function getEntry(code) {
  const reg = await loadRegistry();
  return reg.languages.find(l => l.code === code) || null;
}

export async function getGroupAccent(code) {
  const reg = await loadRegistry();
  const entry = reg.languages.find(l => l.code === code);
  if (!entry) return 'group-euro';
  const g = reg.groups.find(g => g.id === entry.group);
  return g ? g.accent : 'group-euro';
}

// Ready languages (have data files) — for the quiz language picker
export async function getReadyLanguages() {
  const reg = await loadRegistry();
  return reg.languages
    .filter(l => l.status === 'ready' && l.file)
    .map(l => ({ ...l, accent: (reg.groups.find(g => g.id === l.group) || {}).accent || 'group-euro' }));
}

const FORM_ORDER = ['isolated', 'initial', 'medial', 'final'];

// Quiz items for ONE language. If a letter has forms, every form becomes its own
// item (so the Arabic quiz covers isolated / initial / medial / final). The sound
// played is always the letter's base character; the displayed glyph is the form.
export async function loadQuizItems(code) {
  const reg = await loadRegistry();
  const entry = reg.languages.find(l => l.code === code);
  const data = await loadLanguage(code);
  const accent = (reg.groups.find(g => g.id === entry.group) || {}).accent || 'group-euro';

  const items = [];
  for (const letter of data.letters) {
    if (letter.forms) {
      const present = FORM_ORDER.filter(f => letter.forms[f]);
      for (const f of present) {
        items.push({
          uid: letter.id + '-' + f,
          letterId: letter.id,
          char: letter.forms[f],      // displayed glyph (this form)
          sound: letter.char,         // base character used for audio
          name: letter.name,
          formName: f,
          romanization: letter.romanization,
          letterAudio: letter.letterAudio
        });
      }
    } else {
      items.push({
        uid: letter.id,
        letterId: letter.id,
        char: letter.char,
        sound: letter.char,
        name: letter.name,
        formName: null,
        romanization: letter.romanization,
        letterAudio: letter.letterAudio
      });
    }
  }

  return {
    code: data.code,
    language: data.language,
    direction: data.direction || 'ltr',
    script: entry.script,
    accent,
    letterCount: data.letters.length,
    items
  };
}

export async function loadCompare() {
  const res = await fetch('data/compare.json');
  if (!res.ok) throw new Error('Failed to load comparison data');
  return res.json();
}
