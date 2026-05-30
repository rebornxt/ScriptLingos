// store.js — localStorage with try/catch + in-memory fallback (preview-safe)
const mem = new Map();

export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      if (v !== null) return JSON.parse(v);
    } catch (e) { /* blocked storage */ }
    return mem.has(key) ? mem.get(key) : fallback;
  },
  set(key, value) {
    mem.set(key, value);
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { /* in-memory fallback already set */ }
  },
  remove(key) {
    mem.delete(key);
    try { localStorage.removeItem(key); } catch (e) {}
  }
};
