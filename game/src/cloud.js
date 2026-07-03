// ============================================================
// cloud.js - optional cloud accounts + save (Supabase)
//
// Frictionless, email-only "accounts": a player signs in with
// name + email (+ optional phone). Their save is stored in the
// cloud so progress follows them across devices, and every player
// becomes a lead row you can see/export in your Supabase dashboard.
//
// SETUP (5 min) - see game/cloud/README for full steps:
//   1. Create a free project at supabase.com
//   2. Run game/cloud/schema.sql in the Supabase SQL editor
//   3. Paste your Project URL + anon (public) key below
// Until you do, the game runs exactly as before (local save only).
// ============================================================
'use strict';

G.Cloud = {
  // ---- PASTE YOUR SUPABASE PROJECT VALUES HERE ----
  URL: '',        // e.g. 'https://abcdefgh.supabase.co'
  ANON_KEY: '',   // the "anon public" key (safe to embed; NOT the service_role key)
  // -------------------------------------------------

  IDKEY: 'realtorRivals.identity.v1',
  identity: null,   // { name, email, phone, consent }
  _busy: false,

  enabled() { return !!(this.URL && this.ANON_KEY); },

  loadIdentity() {
    if (this.identity) return this.identity;
    try { this.identity = JSON.parse(localStorage.getItem(this.IDKEY)) || null; } catch (e) { this.identity = null; }
    return this.identity;
  },
  signedIn() { return !!this.loadIdentity(); },
  email() { const id = this.loadIdentity(); return id ? id.email : null; },

  saveIdentity(id) {
    this.identity = id;
    try { localStorage.setItem(this.IDKEY, JSON.stringify(id)); } catch (e) {}
  },
  signOut() {
    this.identity = null;
    try { localStorage.removeItem(this.IDKEY); } catch (e) {}
  },

  // ---- Supabase RPC (raw fetch, no dependency) ----
  async _rpc(fn, body) {
    if (!this.enabled()) return { ok: false, skipped: true };
    try {
      const res = await fetch(this.URL.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: {
          'apikey': this.ANON_KEY,
          'Authorization': 'Bearer ' + this.ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok, data };
    } catch (e) {
      return { ok: false, error: e && e.message };
    }
  },

  // Build the stats snapshot the agent sees (lead-scoring signal)
  _snapshot(state) {
    const st = (state && state.stats) || {};
    let score = 0;
    try { score = G.State.s === state ? G.State.seasonScore() : 0; } catch (e) {}
    return {
      homes_sold: st.homesSold || 0,
      followers: st.followers || 0,
      score: score || 0,
      seasons_played: (this.loadIdentity() && this.loadIdentity().seasons) || 0,
    };
  },

  // Fire-and-forget push of the current save + contact + stats
  push(state) {
    const id = this.loadIdentity();
    if (!this.enabled() || !id || !id.email) return;
    const payload = Object.assign({
      name: id.name || '',
      phone: id.phone || '',
      consent: !!id.consent,
      save: state || null,
    }, this._snapshot(state));
    // non-blocking; never let cloud errors affect gameplay
    this._rpc('rr_upsert', { p_email: id.email, p_payload: payload }).catch(() => {});
  },

  // Pull the cloud save for the signed-in email (returns state or null)
  async pull() {
    const id = this.loadIdentity();
    if (!this.enabled() || !id || !id.email) return null;
    const r = await this._rpc('rr_load', { p_email: id.email });
    return (r && r.ok && r.data) ? r.data : null;
  },

  // ---- Sign-in form (HTML overlay for a real, mobile-friendly keyboard) ----
  showSignIn(onDone) {
    if (document.getElementById('rr-signin')) return;
    const id = this.loadIdentity() || {};
    const wrap = document.createElement('div');
    wrap.id = 'rr-signin';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(26,28,44,.85);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:monospace;';
    wrap.innerHTML =
      '<div style="background:#29366f;border:2px solid #ffcd75;border-radius:8px;padding:20px;width:min(340px,90vw);color:#f4f4f4;">' +
      '<div style="color:#ffcd75;font-weight:bold;font-size:16px;margin-bottom:4px;">SAVE YOUR PROGRESS</div>' +
      '<div style="color:#94b0c2;font-size:11px;margin-bottom:14px;">Save your season and climb the leaderboard from any device.</div>' +
      '<input id="rr-name"  placeholder="Name"            value="' + (id.name || '') + '"  style="width:100%;box-sizing:border-box;margin:5px 0;padding:9px;border-radius:5px;border:1px solid #566c86;background:#1a1c2c;color:#fff;font-family:monospace;">' +
      '<input id="rr-email" placeholder="Email"  type="email" value="' + (id.email || '') + '" style="width:100%;box-sizing:border-box;margin:5px 0;padding:9px;border-radius:5px;border:1px solid #566c86;background:#1a1c2c;color:#fff;font-family:monospace;">' +
      '<input id="rr-phone" placeholder="Phone (optional)" type="tel" value="' + (id.phone || '') + '" style="width:100%;box-sizing:border-box;margin:5px 0;padding:9px;border-radius:5px;border:1px solid #566c86;background:#1a1c2c;color:#fff;font-family:monospace;">' +
      '<label style="display:flex;gap:7px;align-items:flex-start;font-size:10px;color:#94b0c2;margin:9px 0;line-height:1.35;">' +
      '<input id="rr-consent" type="checkbox" ' + (id.consent ? 'checked' : '') + ' style="margin-top:2px;">' +
      '<span>OK to contact me about real estate. I can opt out anytime.</span></label>' +
      '<div id="rr-err" style="color:#ef7d57;font-size:10px;min-height:12px;margin-bottom:4px;"></div>' +
      '<div style="display:flex;gap:8px;">' +
      '<button id="rr-save"  style="flex:1;padding:10px;border:0;border-radius:5px;background:#38b764;color:#fff;font-weight:bold;font-family:monospace;cursor:pointer;">SAVE</button>' +
      '<button id="rr-skip"  style="flex:1;padding:10px;border:1px solid #566c86;border-radius:5px;background:#333c57;color:#94b0c2;font-family:monospace;cursor:pointer;">SKIP</button>' +
      '</div></div>';
    document.body.appendChild(wrap);

    const close = (result) => { wrap.remove(); if (onDone) onDone(result); };
    const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

    document.getElementById('rr-skip').onclick = () => close(null);
    document.getElementById('rr-save').onclick = () => {
      const name = document.getElementById('rr-name').value.trim();
      const email = document.getElementById('rr-email').value.trim().toLowerCase();
      const phone = document.getElementById('rr-phone').value.trim();
      const consent = document.getElementById('rr-consent').checked;
      if (!email || !emailOk(email)) { document.getElementById('rr-err').textContent = 'Enter a valid email.'; return; }
      const identity = { name, email, phone, consent, seasons: (this.loadIdentity() && this.loadIdentity().seasons) || 0 };
      this.saveIdentity(identity);
      // push whatever save exists now (or an empty marker so the lead is captured immediately)
      try { this.push(G.State && G.State.s ? G.State.s : { stats: {} }); } catch (e) {}
      close(identity);
    };
  },
};
