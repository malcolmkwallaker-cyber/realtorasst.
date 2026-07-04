// ================================================================
// FUB LEAD SYSTEM — Follow Up Boss Lead Organization & Handoff
// ================================================================
// All lead data lives in localStorage (key: 'fub_leads').
// AI analysis uses /api/fub/analyze-lead (Claude on the backend).
// Everything is draft-only — nothing sends automatically.
//
// FUTURE INTEGRATIONS (search for these tags to wire them up):
//   INTEGRATE:FUB     — Follow Up Boss REST API
//   INTEGRATE:GMAIL   — Gmail API / send draft
//   INTEGRATE:GCAL    — Google Calendar event creation
//   INTEGRATE:SMS     — Twilio / OpenPhone text sending
//   INTEGRATE:ZAPIER  — Zapier webhook triggers
//   INTEGRATE:DOCUSIGN — DocuSign / Dotloop / AuthentiSign
// ================================================================

const FUB_KEY      = 'fub_leads';
const FUB_SETTINGS = 'fub_settings';

const STATUSES = [
  'New', 'Attempting Contact', 'Connected', 'Needs Buyer Agent',
  'Assigned to Buyer Agent', 'Intro Sent', 'Buyer Agent Contacted',
  'Appointment Set', 'Active Client', 'Nurture', 'Dead Lead', 'Closed'
];

const STATUS_COLOR = {
  'New':                    '#4f7cff',
  'Attempting Contact':     '#f59e0b',
  'Connected':              '#34d399',
  'Needs Buyer Agent':      '#f97316',
  'Assigned to Buyer Agent':'#a78bfa',
  'Intro Sent':             '#a78bfa',
  'Buyer Agent Contacted':  '#34d399',
  'Appointment Set':        '#10b981',
  'Active Client':          '#10b981',
  'Nurture':                '#6b7280',
  'Dead Lead':              '#ef4444',
  'Closed':                 '#10b981',
};

const MOTIV_COLOR = { hot:'#ef4444', warm:'#f59e0b', cool:'#3b82f6', unknown:'#6b7280' };
const RISK_COLOR  = { high:'#ef4444', medium:'#f59e0b', low:'#34d399' };

// ── State ────────────────────────────────────────────────────────
let fubCurrentView  = 'dashboard';
let fubDetailId     = null;
let fubEditId       = null;
let fubCurrentMsgTab = 'warm-intro';
let fubSearch       = '';
let fubFilterStatus = 'all';
let fubFilterType   = 'all';
let fubFilterOwner  = 'all';

// Clipboard cache (avoids encoding issues with inline onclick strings)
window._fubClip = {};

// ── Storage ──────────────────────────────────────────────────────
function fubGetLeads() {
  try {
    const raw = localStorage.getItem(FUB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function fubSaveLeads(leads) {
  localStorage.setItem(FUB_KEY, JSON.stringify(leads));
}
function fubAllLeads() {
  let leads = fubGetLeads();
  if (!leads) { leads = fubSampleLeads(); fubSaveLeads(leads); }
  return leads;
}
function fubGetLead(id) { return fubAllLeads().find(l => l.id === id); }
function fubUpsertLead(lead) {
  const all = fubAllLeads();
  const i = all.findIndex(l => l.id === lead.id);
  lead.updatedAt = new Date().toISOString();
  if (i >= 0) all[i] = lead; else { lead.createdAt = lead.createdAt || new Date().toISOString(); all.unshift(lead); }
  fubSaveLeads(all);
}
function fubDeleteLead(id) { fubSaveLeads(fubAllLeads().filter(l => l.id !== id)); }
function fubMakeId() { return 'lead_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function fubGetSettings() {
  try {
    const raw = localStorage.getItem(FUB_SETTINGS);
    return raw ? JSON.parse(raw) : { buyerAgentName: 'Alex Johnson', malcolmName: 'Malcolm' };
  } catch { return { buyerAgentName: 'Alex Johnson', malcolmName: 'Malcolm' }; }
}
function fubSetSettings(s) { localStorage.setItem(FUB_SETTINGS, JSON.stringify(s)); }

// ── Sample Data ──────────────────────────────────────────────────
function fubSampleLeads() {
  const now = new Date();
  const ago = n => { const d = new Date(now); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; };
  const ts  = n => { const d = new Date(now); d.setDate(d.getDate()-n); return d.toISOString(); };
  return [
    { id:'lead_001', name:'Sarah Mitchell',       phone:'(616) 555-0142', email:'sarah.mitchell@email.com',
      source:'Zillow', leadType:'buyer', priceRange:'$250,000–$320,000', desiredArea:'Holland, Zeeland',
      timeline:'1–3 months', motivationLevel:'hot', preapprovalStatus:'approved',
      lastContacted:ago(1), assignedAgent:null, buyerAgentName:'',
      leadStatus:'Connected', nextStep:'Schedule showings on Elm St', followUpDueDate:ago(0),
      notes:'First time buyer, very excited. Pre-approved at $320k. Needs 3BR/2BA. Move before school starts in August.',
      riskLevel:'medium', createdAt:ts(3), updatedAt:ts(1), aiAnalysis:null },

    { id:'lead_002', name:'Mike & Donna Torres',  phone:'(616) 555-0287', email:'mike.torres@gmail.com',
      source:'Referral – Tom B.', leadType:'seller', priceRange:'$480,000–$520,000', desiredArea:'Grand Haven',
      timeline:'3–6 months', motivationLevel:'warm', preapprovalStatus:'unknown',
      lastContacted:ago(2), assignedAgent:'malcolm', buyerAgentName:'',
      leadStatus:'Connected', nextStep:'Schedule listing presentation — prep CMA first', followUpDueDate:ago(1),
      notes:'Wants to sell Grand Haven home. Referred by Tom B. Need CMA before meeting. High-value relationship.',
      riskLevel:'medium', createdAt:ts(5), updatedAt:ts(2), aiAnalysis:null },

    { id:'lead_003', name:'Jordan Lee',            phone:'(616) 555-0391', email:'jlee@outlook.com',
      source:'Open House', leadType:'buyer', priceRange:'$175,000–$220,000', desiredArea:'Muskegon, Norton Shores',
      timeline:'ASAP', motivationLevel:'hot', preapprovalStatus:'in_progress',
      lastContacted:ago(1), assignedAgent:'buyer_agent', buyerAgentName:'Alex Johnson',
      leadStatus:'Assigned to Buyer Agent', nextStep:'Buyer agent reaches out today', followUpDueDate:ago(0),
      notes:'Came to open house on Maple. Very motivated. Pre-approval in progress. Lease ends soon.',
      riskLevel:'high', createdAt:ts(1), updatedAt:ts(1), aiAnalysis:null },

    { id:'lead_004', name:'Patricia Nguyen',       phone:'(616) 555-0448', email:'p.nguyen@gmail.com',
      source:'Realtor.com', leadType:'buyer', priceRange:'$350,000–$425,000', desiredArea:'Spring Lake, Grand Haven',
      timeline:'3–6 months', motivationLevel:'warm', preapprovalStatus:'not_started',
      lastContacted:ago(4), assignedAgent:null, buyerAgentName:'',
      leadStatus:'Attempting Contact', nextStep:'Call during business hours — 2 texts no response', followUpDueDate:ago(0),
      notes:'Filled out form on Realtor.com. Two texts sent, no response. Try a call.',
      riskLevel:'medium', createdAt:ts(6), updatedAt:ts(4), aiAnalysis:null },

    { id:'lead_005', name:'Dave Kowalski',         phone:'(616) 555-0512', email:'dave.k.invest@gmail.com',
      source:'Instagram DM', leadType:'investor', priceRange:'$100,000–$200,000', desiredArea:'Muskegon',
      timeline:'1–3 months', motivationLevel:'warm', preapprovalStatus:'cash',
      lastContacted:ago(3), assignedAgent:'malcolm', buyerAgentName:'',
      leadStatus:'Connected', nextStep:'Send list of distressed properties under market', followUpDueDate:ago(2),
      notes:'Cash buyer. Wants to flip. Has bought 3 homes before. Long-term relationship potential.',
      riskLevel:'low', createdAt:ts(10), updatedAt:ts(3), aiAnalysis:null },

    { id:'lead_006', name:'Amy & Kevin Clark',     phone:'(616) 555-0634', email:'amyclark82@yahoo.com',
      source:'Zillow', leadType:'lake_buyer', priceRange:'$650,000–$900,000', desiredArea:'Gun Lake, Lake Michigan Shore',
      timeline:'6+ months', motivationLevel:'cool', preapprovalStatus:'unknown',
      lastContacted:ago(7), assignedAgent:'malcolm', buyerAgentName:'',
      leadStatus:'Nurture', nextStep:'Monthly check-in, send lake property updates', followUpDueDate:ago(0),
      notes:'High budget lake home. No rush. Waiting on interest rates. Great long-term nurture lead.',
      riskLevel:'low', createdAt:ts(30), updatedAt:ts(7), aiAnalysis:null },

    { id:'lead_007', name:'Tyler Watson',          phone:'(616) 555-0788', email:'twatson.home@gmail.com',
      source:'Facebook Ad', leadType:'buyer', priceRange:'$200,000–$260,000', desiredArea:'Holland',
      timeline:'ASAP', motivationLevel:'hot', preapprovalStatus:'approved',
      lastContacted:null, assignedAgent:null, buyerAgentName:'',
      leadStatus:'New', nextStep:'First contact — call immediately', followUpDueDate:ago(0),
      notes:'', riskLevel:'high', createdAt:ts(0), updatedAt:ts(0), aiAnalysis:null },

    { id:'lead_008', name:'Rachel Summers',        phone:'(616) 555-0892', email:'rsummers@email.com',
      source:'Past Client Referral', leadType:'seller', priceRange:'$310,000–$340,000', desiredArea:'Jenison',
      timeline:'1–3 months', motivationLevel:'hot', preapprovalStatus:'unknown',
      lastContacted:ago(0), assignedAgent:'malcolm', buyerAgentName:'',
      leadStatus:'Appointment Set', nextStep:'Listing appt Thursday 4pm — prep CMA', followUpDueDate:ago(-3),
      notes:'Referred by Johnson family from last year. Listing appt Thursday. Prep Jenison CMA.',
      riskLevel:'low', createdAt:ts(2), updatedAt:new Date().toISOString(), aiAnalysis:null },
  ];
}

// ── Scoring & Assignment ─────────────────────────────────────────
function fubScore(lead) {
  let s = 0;
  s += ({hot:30, warm:20, cool:5, unknown:0}[lead.motivationLevel] || 0);
  const t = (lead.timeline||'').toLowerCase();
  s += t.includes('asap')||t.includes('now') ? 25 : t.includes('1') ? 15 : t.includes('3') ? 10 : 5;
  s += ({approved:20, cash:20, in_progress:10, not_started:0, unknown:5}[lead.preapprovalStatus] || 0);
  const src = (lead.source||'').toLowerCase();
  if (src.includes('referral')||src.includes('past client')) s += 10;
  return Math.min(s, 100);
}

function fubAssignRec(lead) {
  const t   = lead.leadType;
  const src = (lead.source||'').toLowerCase();
  if (t === 'seller')    return { owner:'malcolm',     reason:'Listing lead — Malcolm handles all listings personally.' };
  if (t === 'lake_buyer') return { owner:'malcolm',    reason:'High-end lake buyer — Malcolm personal relationship.' };
  if (t === 'investor')  return { owner:'malcolm',     reason:'Investor — high long-term value, Malcolm handles.' };
  if (src.includes('past client')||src.includes('referral partner')||src.includes('agent attraction'))
                         return { owner:'malcolm',     reason:'Referral or high-value source — Malcolm keeps this one.' };
  if (t === 'buyer')     return { owner:'buyer_agent', reason:'Buyer lead — great fit for the buyer agent.' };
  return                        { owner:'malcolm',     reason:'Unknown type — flagged for Malcolm to review.' };
}

function fubRisk(lead) {
  if (['Dead Lead','Closed'].includes(lead.leadStatus)) return 'low';
  const now   = new Date(); now.setHours(0,0,0,0);
  const last  = lead.lastContacted ? new Date(lead.lastContacted) : null;
  const due   = lead.followUpDueDate ? new Date(lead.followUpDueDate+'T00:00:00') : null;
  const days  = last ? Math.floor((now-last)/86400000) : 999;
  const overdue = due ? Math.floor((now-due)/86400000) : 0;
  if (lead.motivationLevel==='hot'&&days>=2) return 'high';
  if (days>=3||overdue>=2) return 'high';
  if (days>=1||overdue>=1) return 'medium';
  return 'low';
}

// ── Message Templates ────────────────────────────────────────────
function msgWarmIntro(lead, agent) {
  return `Hey ${lead.name}! I wanted to introduce you to ${agent} from my team. They're awesome and will help make sure you're taken care of quickly. I'll still be around and keeping an eye on everything, but they'll be your best point of contact for showings and next steps.`;
}
function msgAgentBrief(lead, agent) {
  return `Hey ${agent}, I'm sending you ${lead.name}. Here's what I know so far:\n\nSource: ${lead.source||'Unknown'}\nLooking for: ${lead.desiredArea||'Unknown'}\nPrice range: ${lead.priceRange||'Unknown'}\nTimeline: ${lead.timeline||'Unknown'}\nPreapproval: ${(lead.preapprovalStatus||'unknown').replace('_',' ')}\nNotes: ${lead.notes||'None'}\n\nPlease reach out ASAP and update the notes once you connect.`;
}
function msgFollowClient(lead, agent) {
  return `Hey ${lead.name}, just checking in quick. Did ${agent} get ahold of you and help with what you needed?`;
}
function msgFollowAgent(lead, agent) {
  return `Hey ${agent}, were you able to connect with ${lead.name}? Just want to make sure they're taken care of.`;
}

// ── Badge helpers ────────────────────────────────────────────────
function statusBadge(s) {
  const c = STATUS_COLOR[s]||'#6b7280';
  return `<span class="status-badge" style="background:${c}22;color:${c};border-color:${c}44">${s}</span>`;
}
function motivBadge(m) {
  const c = MOTIV_COLOR[m]||'#6b7280';
  const e = {hot:'🔥',warm:'☀️',cool:'❄️',unknown:'?'}[m]||'';
  return `<span class="motivation-badge" style="color:${c}">${e} ${m}</span>`;
}
function riskBadge(r) {
  const c = RISK_COLOR[r]||'#6b7280';
  return `<span class="risk-badge" style="background:${c}22;color:${c};border-color:${c}44">${r} risk</span>`;
}
function scoreBar(n) {
  const c = n>=60?'#34d399':n>=35?'#f59e0b':'#6b7280';
  return `<div class="score-bar-wrap"><div class="score-bar" style="width:${n}%;background:${c}"></div><span class="score-num" style="color:${c}">${n}</span></div>`;
}
function fmtDate(d) {
  if (!d) return '—';
  const diff = Math.floor((new Date()-new Date(d))/86400000);
  if (diff===0) return 'Today'; if (diff===1) return 'Yesterday'; if (diff<7) return diff+'d ago';
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function fmtDue(d) {
  if (!d) return '—';
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = Math.floor((new Date(d+'T00:00:00')-now)/86400000);
  if (diff<-1) return `<span style="color:#ef4444">${Math.abs(diff)}d overdue</span>`;
  if (diff===-1) return `<span style="color:#ef4444">Yesterday</span>`;
  if (diff===0)  return `<span style="color:#f59e0b">Today</span>`;
  if (diff===1)  return `<span style="color:#34d399">Tomorrow</span>`;
  return `<span>${diff}d</span>`;
}

// ── Dashboard ────────────────────────────────────────────────────
function fubRenderDashboard() {
  const leads = fubAllLeads();
  const now = new Date(); now.setHours(0,0,0,0);
  const active = leads.filter(l=>!['Dead Lead','Closed','Nurture'].includes(l.leadStatus)).length;
  const newL   = leads.filter(l=>l.leadStatus==='New').length;
  const hot    = leads.filter(l=>l.motivationLevel==='hot').length;
  const needsAssign = leads.filter(l=>{
    const r=fubAssignRec(l); return r.owner==='buyer_agent'&&l.assignedAgent!=='buyer_agent'&&!['Dead Lead','Closed'].includes(l.leadStatus);
  }).length;
  const dueToday = leads.filter(l=>{
    if(!l.followUpDueDate||['Dead Lead','Closed'].includes(l.leadStatus)) return false;
    return new Date(l.followUpDueDate+'T00:00:00')<=now;
  }).length;

  document.getElementById('fub-stats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${leads.length}</div><div class="stat-label">Total Leads</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#4f7cff">${active}</div><div class="stat-label">Active</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#f59e0b">${newL}</div><div class="stat-label">New</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#ef4444">${hot}</div><div class="stat-label">Hot Leads</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#a78bfa">${needsAssign}</div><div class="stat-label">Needs Assignment</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#f59e0b">${dueToday}</div><div class="stat-label">Follow-Ups Due</div></div>
  `;

  const sections = [
    { title:'🔴 New Leads — Contact Immediately',
      leads: leads.filter(l=>l.leadStatus==='New'), empty:'No new leads right now.' },
    { title:'🟠 Needs Buyer Agent Assignment',
      leads: leads.filter(l=>{const r=fubAssignRec(l);return r.owner==='buyer_agent'&&l.assignedAgent!=='buyer_agent'&&!['Dead Lead','Closed'].includes(l.leadStatus);}),
      empty:'All buyer leads are assigned.' },
    { title:'⚠️ Assigned But Not Yet Contacted',
      leads: leads.filter(l=>l.assignedAgent==='buyer_agent'&&['Assigned to Buyer Agent','Needs Buyer Agent'].includes(l.leadStatus)),
      empty:'Buyer agent is on top of it.' },
    { title:'⏰ Follow-Ups Due Today or Overdue',
      leads: leads.filter(l=>{if(!l.followUpDueDate||['Dead Lead','Closed','New'].includes(l.leadStatus))return false;return new Date(l.followUpDueDate+'T00:00:00')<=now;}),
      empty:'No follow-ups due. Nice work!' },
    { title:'🔥 Hot Leads — Malcolm\'s Personal Attention',
      leads: leads.filter(l=>l.motivationLevel==='hot'&&l.assignedAgent==='malcolm'&&!['Dead Lead','Closed','Active Client'].includes(l.leadStatus)),
      empty:'No urgent leads for Malcolm right now.' },
    { title:'🕐 No Update in 48 Hours',
      leads: leads.filter(l=>{if(['Dead Lead','Closed','Nurture'].includes(l.leadStatus))return false;return (now-new Date(l.updatedAt))>2*86400000;}),
      empty:'Everything is up to date!' },
  ];

  document.getElementById('fub-priority').innerHTML = sections.map(sec=>`
    <div class="priority-section-item">
      <div class="priority-section-title ${sec.leads.length?'has-items':''}">
        ${sec.title} ${sec.leads.length?`<span class="priority-count">${sec.leads.length}</span>`:''}
      </div>
      ${sec.leads.length
        ? `<div class="priority-leads">${sec.leads.map(l=>`
            <div class="priority-lead-card" onclick="fubOpenDetail('${l.id}')">
              <div class="plc-main">
                <div class="plc-name">${l.name}</div>
                <div class="plc-meta">${l.leadType.replace('_',' ')} &middot; ${l.source} &middot; ${l.desiredArea||'—'}</div>
              </div>
              <div class="plc-right">${statusBadge(l.leadStatus)} ${riskBadge(fubRisk(l))}</div>
            </div>`).join('')}</div>`
        : `<div class="priority-empty">${sec.empty}</div>`}
    </div>`).join('');
}

// ── Leads Table ──────────────────────────────────────────────────
function fubRenderLeads() {
  let leads = fubAllLeads();
  if (fubSearch) {
    const q = fubSearch.toLowerCase();
    leads = leads.filter(l=>[l.name,l.email,l.phone,l.source,l.desiredArea,l.notes].some(f=>(f||'').toLowerCase().includes(q)));
  }
  if (fubFilterStatus!=='all') leads = leads.filter(l=>l.leadStatus===fubFilterStatus);
  if (fubFilterType!=='all')   leads = leads.filter(l=>l.leadType===fubFilterType);
  if (fubFilterOwner!=='all')  leads = leads.filter(l=>(l.assignedAgent||'unassigned')===fubFilterOwner);

  const el = document.getElementById('fub-leads-list');
  if (!leads.length) { el.innerHTML='<div class="leads-empty">No leads match your filters.</div>'; return; }

  el.innerHTML=`<div class="leads-table-wrap"><table class="leads-table">
    <thead><tr>
      <th>Name</th><th>Type</th><th>Status</th><th>Motivation</th>
      <th>Score</th><th>Owner</th><th>Follow-Up</th><th>Last Contact</th><th></th>
    </tr></thead>
    <tbody>${leads.map(l=>{
      const risk=fubRisk(l); const rc=RISK_COLOR[risk];
      const owner = l.assignedAgent==='buyer_agent'
        ? `<span style="color:#a78bfa">${l.buyerAgentName||'Buyer Agent'}</span>`
        : l.assignedAgent==='malcolm'
        ? `<span style="color:#4f7cff">Malcolm</span>`
        : `<span style="color:#6b7280">Unassigned</span>`;
      return `<tr class="lead-row" onclick="fubOpenDetail('${l.id}')" style="border-left:3px solid ${rc}">
        <td><div class="lead-name-cell"><strong>${l.name}</strong><small>${l.phone||l.email||''}</small></div></td>
        <td><span class="type-badge type-${l.leadType}">${l.leadType.replace('_',' ')}</span></td>
        <td>${statusBadge(l.leadStatus)}</td>
        <td>${motivBadge(l.motivationLevel)}</td>
        <td>${scoreBar(fubScore(l))}</td>
        <td>${owner}</td>
        <td>${fmtDue(l.followUpDueDate)}</td>
        <td>${fmtDate(l.lastContacted)}</td>
        <td>
          <button class="btn-icon-sm" onclick="event.stopPropagation();fubOpenEdit('${l.id}')" title="Edit">&#9998;</button>
          <button class="btn-icon-sm" onclick="event.stopPropagation();fubConfirmDelete('${l.id}')" title="Delete">&#x1F5D1;</button>
        </td>
      </tr>`;}).join('')}
    </tbody></table></div>`;
}

// ── Detail Panel ─────────────────────────────────────────────────
function fubOpenDetail(id) {
  fubDetailId = id;
  const lead = fubGetLead(id);
  if (!lead) return;
  const settings  = fubGetSettings();
  const agentName = lead.buyerAgentName || settings.buyerAgentName || 'your buyer agent';
  const rec  = fubAssignRec(lead);
  const risk = fubRisk(lead);
  const score = fubScore(lead);

  // Populate clipboard cache
  window._fubClip['wi']  = msgWarmIntro(lead,agentName);
  window._fubClip['ab']  = msgAgentBrief(lead,agentName);
  window._fubClip['fc']  = msgFollowClient(lead,agentName);
  window._fubClip['fa']  = msgFollowAgent(lead,agentName);
  fubCurrentMsgTab = 'warm-intro';

  const panel = document.getElementById('fub-detail-panel');
  panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-title-row">
        <div>
          <h2>${lead.name}</h2>
          <div class="detail-meta">${[lead.phone,lead.email].filter(Boolean).join(' &middot; ')}</div>
        </div>
        <div class="detail-actions">
          <button class="btn-outline btn-sm" onclick="fubOpenEdit('${lead.id}')">Edit</button>
          <button class="detail-close" onclick="fubCloseDetail()">&#x2715;</button>
        </div>
      </div>
      <div class="detail-badges">
        ${statusBadge(lead.leadStatus)}
        ${motivBadge(lead.motivationLevel)}
        ${riskBadge(risk)}
        <span class="score-chip">Score: ${score}/100</span>
      </div>
    </div>

    <div class="detail-body">

      <div class="detail-section">
        <div class="detail-info-grid">
          <div class="info-item"><span class="info-label">Source</span><span>${lead.source||'—'}</span></div>
          <div class="info-item"><span class="info-label">Type</span><span class="type-badge type-${lead.leadType}">${lead.leadType.replace('_',' ')}</span></div>
          <div class="info-item"><span class="info-label">Price Range</span><span>${lead.priceRange||'—'}</span></div>
          <div class="info-item"><span class="info-label">Area</span><span>${lead.desiredArea||'—'}</span></div>
          <div class="info-item"><span class="info-label">Timeline</span><span>${lead.timeline||'—'}</span></div>
          <div class="info-item"><span class="info-label">Preapproval</span><span>${(lead.preapprovalStatus||'—').replace('_',' ')}</span></div>
          <div class="info-item"><span class="info-label">Last Contact</span><span>${fmtDate(lead.lastContacted)}</span></div>
          <div class="info-item"><span class="info-label">Follow-Up Due</span>${fmtDue(lead.followUpDueDate)}</div>
          <div class="info-item full-span"><span class="info-label">Next Step</span><span>${lead.nextStep||'—'}</span></div>
          ${lead.notes?`<div class="info-item full-span"><span class="info-label">Notes</span><span>${lead.notes}</span></div>`:''}
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Assignment Recommendation</div>
        <div class="assignment-rec ${rec.owner}">
          <div class="rec-owner">${rec.owner==='buyer_agent'?'&#8594; Buyer Agent':'&#8594; Malcolm (Personal)'}</div>
          <div class="rec-reason">${rec.reason}</div>
          ${rec.owner==='buyer_agent'&&lead.assignedAgent!=='buyer_agent'
            ?`<button class="btn-primary btn-sm btn-assign" onclick="fubAssignToBuyer('${lead.id}')">Assign to Buyer Agent</button>`
            :rec.owner==='malcolm'&&lead.assignedAgent!=='malcolm'
            ?`<button class="btn-outline btn-sm" onclick="fubAssignToMalcolm('${lead.id}')">Assign to Malcolm</button>`:''}
        </div>
      </div>

      <div class="detail-section">
        <div class="section-label">Message Templates <span style="color:var(--text-dim);font-size:10px;font-weight:400;margin-left:6px;text-transform:none;letter-spacing:0">(drafts only — copy &amp; paste into FUB)</span></div>
        <div class="message-tabs">
          <button class="msg-tab active" onclick="fubMsgTab(this,'warm-intro')">Warm Intro &#8594; Client</button>
          <button class="msg-tab" onclick="fubMsgTab(this,'agent-brief')">Brief &#8594; Agent</button>
          <button class="msg-tab" onclick="fubMsgTab(this,'followup-client')">Check-In &#8594; Client</button>
          <button class="msg-tab" onclick="fubMsgTab(this,'followup-agent')">Check-In &#8594; Agent</button>
        </div>
        <div class="msg-content-wrap">
          <div id="msg-warm-intro"     class="msg-content active">${window._fubClip['wi']}</div>
          <div id="msg-agent-brief"    class="msg-content">${window._fubClip['ab']}</div>
          <div id="msg-followup-client" class="msg-content">${window._fubClip['fc']}</div>
          <div id="msg-followup-agent" class="msg-content">${window._fubClip['fa']}</div>
        </div>
        <button class="btn-copy-msg" id="copy-msg-btn" onclick="fubCopyCurrentMsg()">Copy Message</button>
      </div>

      <div class="detail-section">
        <div class="section-label-row">
          <div class="section-label" style="margin-bottom:0">AI Analysis</div>
          <button class="btn-outline btn-sm" id="ai-btn" onclick="fubRunAI('${lead.id}')">
            ${lead.aiAnalysis?'Re-Analyze with AI':'Analyze with AI'}
          </button>
        </div>
        <div id="ai-result" style="margin-top:12px">
          ${lead.aiAnalysis ? fubRenderAI(lead.aiAnalysis) : `<div class="ai-empty">Click "Analyze with AI" to get a lead summary, best next step, ownership recommendation, and AI-crafted messages tailored to this lead.</div>`}
        </div>
      </div>

    </div>
  `;

  document.getElementById('fub-detail-panel').classList.add('open');
  document.getElementById('fub-detail-overlay').classList.add('open');
}

function fubCloseDetail() {
  fubDetailId = null;
  document.getElementById('fub-detail-panel').classList.remove('open');
  document.getElementById('fub-detail-overlay').classList.remove('open');
}

function fubRenderAI(ai) {
  if (!ai) return '';
  window._fubClip['ai-client'] = ai.suggestedClientMessage||'';
  window._fubClip['ai-agent']  = ai.suggestedAgentMessage||'';
  window._fubClip['ai-notes']  = ai.fubNotes||'';
  return `<div class="ai-results">
    <div class="ai-block"><div class="ai-block-label">Summary</div><div class="ai-block-text">${ai.summary||''}</div></div>
    <div class="ai-block"><div class="ai-block-label">Best Next Step</div><div class="ai-block-text">${ai.bestNextStep||''}</div></div>
    <div class="ai-block"><div class="ai-block-label">Ownership</div><div class="ai-block-text">${ai.ownership==='buyer_agent'?'Buyer Agent':'Malcolm'} — ${ai.ownershipReason||''}</div></div>
    ${ai.suggestedClientMessage?`<div class="ai-block">
      <div class="ai-block-label-row"><span class="ai-block-label">AI Client Message</span><button class="btn-copy-sm" onclick="fubCopyClip('ai-client',this)">Copy</button></div>
      <div class="ai-block-text ai-message">${ai.suggestedClientMessage}</div></div>`:''}
    ${ai.suggestedAgentMessage?`<div class="ai-block">
      <div class="ai-block-label-row"><span class="ai-block-label">AI Agent Message</span><button class="btn-copy-sm" onclick="fubCopyClip('ai-agent',this)">Copy</button></div>
      <div class="ai-block-text ai-message">${ai.suggestedAgentMessage}</div></div>`:''}
    <div class="ai-block"><div class="ai-block-label">Risk</div><div class="ai-block-text">${riskBadge(ai.riskLevel||'low')} — ${ai.riskReason||''}</div></div>
    ${ai.fubNotes?`<div class="ai-block">
      <div class="ai-block-label-row"><span class="ai-block-label">Notes for Follow Up Boss</span><button class="btn-copy-sm" onclick="fubCopyClip('ai-notes',this)">Copy</button></div>
      <div class="ai-block-text">${ai.fubNotes}</div></div>`:''}
  </div>`;
}

function fubMsgTab(btn, tabId) {
  document.querySelectorAll('#fub-detail-panel .msg-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#fub-detail-panel .msg-content').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById('msg-'+tabId);
  if (el) el.classList.add('active');
  fubCurrentMsgTab = tabId;
}

function fubCopyCurrentMsg() {
  const tabMap = {'warm-intro':'wi','agent-brief':'ab','followup-client':'fc','followup-agent':'fa'};
  const text = window._fubClip[tabMap[fubCurrentMsgTab]] || '';
  const btn  = document.getElementById('copy-msg-btn');
  navigator.clipboard.writeText(text).then(()=>{
    btn.textContent='Copied!'; btn.style.color='#34d399';
    setTimeout(()=>{ btn.textContent='Copy Message'; btn.style.color=''; }, 2000);
  });
}

function fubCopyClip(key, btn) {
  const text = window._fubClip[key]||'';
  navigator.clipboard.writeText(text).then(()=>{
    const orig = btn.textContent;
    btn.textContent='Copied!'; btn.style.color='#34d399';
    setTimeout(()=>{ btn.textContent=orig; btn.style.color=''; }, 2000);
  });
}

// ── Assignment actions ───────────────────────────────────────────
function fubAssignToBuyer(id) {
  const lead = fubGetLead(id); if(!lead) return;
  const name = fubGetSettings().buyerAgentName||'Alex Johnson';
  lead.assignedAgent  = 'buyer_agent';
  lead.buyerAgentName = lead.buyerAgentName||name;
  lead.leadStatus     = 'Needs Buyer Agent';
  fubUpsertLead(lead);
  fubRefresh();
  fubOpenDetail(id);
}
function fubAssignToMalcolm(id) {
  const lead = fubGetLead(id); if(!lead) return;
  lead.assignedAgent = 'malcolm';
  fubUpsertLead(lead);
  fubRefresh();
  fubOpenDetail(id);
}

// ── AI Analysis ──────────────────────────────────────────────────
async function fubRunAI(id) {
  const lead = fubGetLead(id); if(!lead) return;
  const btn    = document.getElementById('ai-btn');
  const result = document.getElementById('ai-result');
  if(btn)    { btn.disabled=true; btn.textContent='Analyzing...'; }
  if(result) result.innerHTML='<div class="loading-state"><div class="spinner"></div><span>Claude is reading this lead...</span></div>';
  try {
    const res = await fetch('/api/fub/analyze-lead',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({lead})
    });
    if(!res.ok) throw new Error((await res.json()).detail||'Request failed');
    const ai = await res.json();
    // Calculate follow-up date from AI's suggestion
    if(ai.followUpDaysOut) {
      const d = new Date(); d.setDate(d.getDate()+(ai.followUpDaysOut||1));
      lead.followUpDueDate = d.toISOString().split('T')[0];
    }
    if(ai.riskLevel) lead.riskLevel = ai.riskLevel;
    lead.aiAnalysis = ai;
    fubUpsertLead(lead);
    if(result) result.innerHTML = fubRenderAI(ai);
  } catch(err) {
    if(result) result.innerHTML=`<div style="color:#f87171;padding:12px">Analysis failed: ${err.message}</div>`;
  } finally {
    if(btn) { btn.disabled=false; btn.textContent='Re-Analyze with AI'; }
  }
}

// ── Add / Edit Modal ─────────────────────────────────────────────
function fubOpenAdd()  { fubEditId=null;  fubRenderModal(null); document.getElementById('fub-modal-overlay').style.display='flex'; }
function fubOpenEdit(id) { fubEditId=id; fubRenderModal(fubGetLead(id)); document.getElementById('fub-modal-overlay').style.display='flex'; }
function fubCloseModal() { document.getElementById('fub-modal-overlay').style.display='none'; fubEditId=null; }

function fubRenderModal(lead) {
  const e = lead||{};
  const v = (k,d='')=>e[k]!=null?e[k]:d;
  const opt = (arr,cur) => arr.map(o=>`<option value="${o}" ${v(cur)===o?'selected':''}>${o.replace('_',' ')}</option>`).join('');
  const statOpt = STATUSES.map(s=>`<option value="${s}" ${v('leadStatus')===s?'selected':''}>${s}</option>`).join('');

  document.getElementById('fub-modal').innerHTML=`
    <div class="modal-header">
      <h3>${lead?'Edit Lead':'Add New Lead'}</h3>
      <button class="modal-close" onclick="fubCloseModal()">&#x2715;</button>
    </div>
    <div class="modal-body">
      <div class="modal-grid">
        <div class="form-group full-width"><label>Lead Name *</label>
          <input id="f-name" type="text" value="${v('name')}" placeholder="Full name" /></div>
        <div class="form-group"><label>Phone</label>
          <input id="f-phone" type="text" value="${v('phone')}" placeholder="(616) 555-0000" /></div>
        <div class="form-group"><label>Email</label>
          <input id="f-email" type="text" value="${v('email')}" placeholder="email@example.com" /></div>
        <div class="form-group"><label>Source</label>
          <input id="f-source" type="text" value="${v('source')}" placeholder="Zillow, Referral, Open House..." /></div>
        <div class="form-group"><label>Lead Type</label>
          <select id="f-type">${opt(['buyer','seller','investor','lake_buyer','unknown'],'leadType')}</select></div>
        <div class="form-group"><label>Motivation Level</label>
          <select id="f-motiv">${opt(['hot','warm','cool','unknown'],'motivationLevel')}</select></div>
        <div class="form-group"><label>Price Range</label>
          <input id="f-price" type="text" value="${v('priceRange')}" placeholder="$200,000–$300,000" /></div>
        <div class="form-group"><label>Desired Area</label>
          <input id="f-area" type="text" value="${v('desiredArea')}" placeholder="Holland, Grand Haven..." /></div>
        <div class="form-group"><label>Timeline</label>
          <input id="f-timeline" type="text" value="${v('timeline')}" placeholder="ASAP, 1–3 months, 6+..." /></div>
        <div class="form-group"><label>Preapproval</label>
          <select id="f-preapproval">${opt(['approved','in_progress','not_started','cash','unknown'],'preapprovalStatus')}</select></div>
        <div class="form-group"><label>Lead Status</label>
          <select id="f-status">${statOpt}</select></div>
        <div class="form-group"><label>Assigned Agent</label>
          <select id="f-agent">
            <option value="" ${!v('assignedAgent')?'selected':''}>Unassigned</option>
            <option value="malcolm" ${v('assignedAgent')==='malcolm'?'selected':''}>Malcolm</option>
            <option value="buyer_agent" ${v('assignedAgent')==='buyer_agent'?'selected':''}>Buyer Agent</option>
          </select></div>
        <div class="form-group"><label>Buyer Agent Name</label>
          <input id="f-agent-name" type="text" value="${v('buyerAgentName')}" placeholder="e.g. Alex Johnson" /></div>
        <div class="form-group"><label>Last Contacted</label>
          <input id="f-last" type="date" value="${v('lastContacted')}" /></div>
        <div class="form-group"><label>Follow-Up Due</label>
          <input id="f-due" type="date" value="${v('followUpDueDate')}" /></div>
        <div class="form-group full-width"><label>Next Step</label>
          <input id="f-next" type="text" value="${v('nextStep')}" placeholder="What needs to happen next?" /></div>
        <div class="form-group full-width"><label>Notes</label>
          <textarea id="f-notes" rows="4" placeholder="Anything important about this lead...">${v('notes')}</textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-outline" onclick="fubCloseModal()">Cancel</button>
      <button class="btn-primary" onclick="fubSaveLead_()">
        ${lead?'Save Changes':'Add Lead'}
      </button>
    </div>`;
}

function fubSaveLead_() {
  const name = (document.getElementById('f-name').value||'').trim();
  if(!name) { alert('Lead name is required.'); return; }
  const lead = fubEditId ? {...fubGetLead(fubEditId)} : { id:fubMakeId(), createdAt:new Date().toISOString(), aiAnalysis:null };
  lead.name             = name;
  lead.phone            = document.getElementById('f-phone').value.trim();
  lead.email            = document.getElementById('f-email').value.trim();
  lead.source           = document.getElementById('f-source').value.trim();
  lead.leadType         = document.getElementById('f-type').value;
  lead.motivationLevel  = document.getElementById('f-motiv').value;
  lead.priceRange       = document.getElementById('f-price').value.trim();
  lead.desiredArea      = document.getElementById('f-area').value.trim();
  lead.timeline         = document.getElementById('f-timeline').value.trim();
  lead.preapprovalStatus= document.getElementById('f-preapproval').value;
  lead.leadStatus       = document.getElementById('f-status').value;
  lead.assignedAgent    = document.getElementById('f-agent').value||null;
  lead.buyerAgentName   = document.getElementById('f-agent-name').value.trim();
  lead.lastContacted    = document.getElementById('f-last').value||null;
  lead.followUpDueDate  = document.getElementById('f-due').value||null;
  lead.nextStep         = document.getElementById('f-next').value.trim();
  lead.notes            = document.getElementById('f-notes').value.trim();
  lead.riskLevel        = fubRisk(lead);
  fubUpsertLead(lead);
  fubCloseModal();
  fubRefresh();
  fubOpenDetail(lead.id);
}

function fubConfirmDelete(id) {
  const lead = fubGetLead(id); if(!lead) return;
  if(!confirm(`Delete "${lead.name}"? This cannot be undone.`)) return;
  fubDeleteLead(id);
  if(fubDetailId===id) fubCloseDetail();
  fubRefresh();
}

// ── Settings ─────────────────────────────────────────────────────
function fubOpenSettings() {
  const s = fubGetSettings();
  document.getElementById('s-malcolm-name').value = s.malcolmName||'Malcolm';
  document.getElementById('s-agent-name').value   = s.buyerAgentName||'Alex Johnson';
  document.getElementById('fub-settings-overlay').style.display='flex';
}
function fubCloseSettings() { document.getElementById('fub-settings-overlay').style.display='none'; }
function fubSaveSettings_() {
  fubSetSettings({
    malcolmName:    document.getElementById('s-malcolm-name').value.trim()||'Malcolm',
    buyerAgentName: document.getElementById('s-agent-name').value.trim()||'Alex Johnson',
  });
  fubCloseSettings();
}
function fubResetData() {
  if(!confirm('This will delete ALL leads and reload the 8 sample leads. Continue?')) return;
  localStorage.removeItem(FUB_KEY);
  fubCloseSettings();
  fubRefresh();
  if(fubDetailId) fubCloseDetail();
}

// ── View switching ────────────────────────────────────────────────
function fubSwitchView(view) {
  fubCurrentView = view;
  document.querySelectorAll('.fub-nav').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.fub-view').forEach(v=>v.classList.remove('active'));
  document.querySelector(`.fub-nav[data-view="${view}"]`).classList.add('active');
  document.getElementById('fub-'+view).classList.add('active');
  fubRefresh();
}
function fubRefresh() {
  fubRenderDashboard();
  fubRenderLeads();
}

// ── Populate status filter ────────────────────────────────────────
function fubInitStatusFilter() {
  const sel = document.getElementById('fub-filter-status');
  if(!sel) return;
  STATUSES.forEach(s=>{
    const o = document.createElement('option');
    o.value=s; o.textContent=s;
    sel.appendChild(o);
  });
}

// ── Init ──────────────────────────────────────────────────────────
function initFUB() {
  fubInitStatusFilter();

  document.querySelectorAll('.fub-nav').forEach(btn=>{
    btn.addEventListener('click',()=>fubSwitchView(btn.dataset.view));
  });

  const search = document.getElementById('fub-search');
  if(search) search.addEventListener('input',e=>{ fubSearch=e.target.value; fubRenderLeads(); });

  ['fub-filter-status','fub-filter-type','fub-filter-owner'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('change',e=>{
      if(id==='fub-filter-status') fubFilterStatus=e.target.value;
      if(id==='fub-filter-type')   fubFilterType=e.target.value;
      if(id==='fub-filter-owner')  fubFilterOwner=e.target.value;
      fubRenderLeads();
    });
  });

  fubRefresh();
}

// Wire up FUB tab click
document.querySelector('[data-tab="fub-leads"]').addEventListener('click',()=>{
  if(!document.getElementById('fub-leads').dataset.initialized) {
    document.getElementById('fub-leads').dataset.initialized = '1';
    initFUB();
  } else {
    fubRefresh();
  }
});
