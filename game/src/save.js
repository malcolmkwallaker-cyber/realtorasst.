// ============================================================
// save.js - localStorage save/load + leaderboard
// ============================================================
'use strict';

G.Save = {
  KEY: 'realtorRivals.save.v1',
  LB_KEY: 'realtorRivals.leaderboard.v1',

  hasSave() {
    try { return !!localStorage.getItem(this.KEY); } catch (e) { return false; }
  },

  save(state) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({ v: 1, ts: Date.now(), state }));
      return true;
    } catch (e) { return false; }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data.state || null;
    } catch (e) { return null; }
  },

  clear() {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  },

  // ---- Leaderboard ----
  getLeaderboard() {
    try {
      const raw = localStorage.getItem(this.LB_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  addLeaderboardEntry(entry) {
    const lb = this.getLeaderboard();
    lb.push(entry);
    lb.sort((a, b) => b.score - a.score);
    const top = lb.slice(0, 10);
    try { localStorage.setItem(this.LB_KEY, JSON.stringify(top)); } catch (e) {}
    return top;
  },
};
