// Tab navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tab).classList.add('active');
  });
});

function showLoading(outputId) {
  const box = document.getElementById(outputId);
  box.style.display = 'block';
  box.innerHTML = `
    <div class="output-header">
      <h3>Generating...</h3>
    </div>
    <div class="loading-state">
      <div class="spinner"></div>
      <span>Claude is building your content...</span>
    </div>
  `;
}

function showResult(outputId, textId, title, content) {
  const box = document.getElementById(outputId);
  box.style.display = 'block';
  box.innerHTML = `
    <div class="output-header">
      <h3>${title}</h3>
      <button class="btn-copy" onclick="copyOutput('${textId}')">Copy</button>
    </div>
    <div class="output-text" id="${textId}"></div>
  `;
  document.getElementById(textId).textContent = content;
}

function showError(outputId, message) {
  const box = document.getElementById(outputId);
  box.style.display = 'block';
  box.innerHTML = `
    <div class="output-header">
      <h3>Error</h3>
    </div>
    <div class="output-text" style="color:#f87171;">${message}</div>
  `;
}

async function generateDailyPlan() {
  const btn = document.querySelector('#daily-plan .btn-primary');
  btn.disabled = true;
  showLoading('plan-output');

  try {
    const res = await fetch('/api/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointments: document.getElementById('appointments').value,
        leads: document.getElementById('leads').value,
        pending_deals: document.getElementById('pending-deals').value,
        personal_notes: document.getElementById('personal-notes').value,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    showResult('plan-output', 'plan-output-text', 'Your Game Plan for Today', data.plan);
  } catch (err) {
    showError('plan-output', err.message);
  } finally {
    btn.disabled = false;
  }
}

async function generateVAHandoff() {
  const tasks = document.getElementById('tasks').value.trim();
  if (!tasks) {
    alert('Please describe the tasks for Dan.');
    return;
  }

  const btn = document.querySelector('#va-handoff .btn-primary');
  btn.disabled = true;
  showLoading('handoff-output');

  try {
    const res = await fetch('/api/va-handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks,
        priority: document.getElementById('priority').value,
        deadline: document.getElementById('deadline').value,
        context: document.getElementById('context').value,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    showResult('handoff-output', 'handoff-output-text', "Handoff Brief for Dan", data.handoff);
  } catch (err) {
    showError('handoff-output', err.message);
  } finally {
    btn.disabled = false;
  }
}

async function generateAgentHowTo() {
  const topic = document.getElementById('topic').value.trim();
  if (!topic) {
    alert('Please enter a topic for the how-to guide.');
    return;
  }

  const btn = document.querySelector('#agent-howto .btn-primary');
  btn.disabled = true;
  showLoading('howto-output');

  try {
    const res = await fetch('/api/agent-howto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        agent_experience: document.getElementById('agent-experience').value,
        specific_questions: document.getElementById('specific-questions').value,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    showResult('howto-output', 'howto-output-text', 'Agent How-To Guide', data.guide);
  } catch (err) {
    showError('howto-output', err.message);
  } finally {
    btn.disabled = false;
  }
}

function setTopic(topic) {
  document.getElementById('topic').value = topic;
  document.getElementById('topic').focus();
}

function copyOutput(textId) {
  const el = document.getElementById(textId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    const btn = el.closest('.output-box').querySelector('.btn-copy');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ===== ACTIVITY MONITOR =====

let monitorPollInterval = null;

async function refreshMonitorStatus() {
  try {
    const res = await fetch('/api/monitor/status');
    const data = await res.json();
    const dot = document.getElementById('status-dot');
    const label = document.getElementById('status-label');
    const count = document.getElementById('activity-count');
    const btnStart = document.getElementById('btn-start-monitor');
    const btnStop = document.getElementById('btn-stop-monitor');
    if (!dot) return;

    if (data.running) {
      dot.className = 'status-indicator running';
      label.textContent = 'Recording...';
      btnStart.disabled = true;
      btnStop.disabled = false;
    } else {
      dot.className = 'status-indicator stopped';
      label.textContent = 'Not recording';
      btnStart.disabled = false;
      btnStop.disabled = true;
    }

    const n = data.unassigned_activity_count;
    count.textContent = n > 0 ? `${n} pending activit${n === 1 ? 'y' : 'ies'}` : '';
  } catch (e) {
    // silently ignore polling errors
  }
}

async function startMonitor() {
  const errBox = document.getElementById('monitor-error');
  errBox.style.display = 'none';
  try {
    const res = await fetch('/api/monitor/start', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      errBox.textContent = data.detail || 'Failed to start monitor.';
      errBox.style.display = 'block';
      return;
    }
    await refreshMonitorStatus();
  } catch (e) {
    errBox.textContent = e.message;
    errBox.style.display = 'block';
  }
}

async function stopMonitor() {
  await fetch('/api/monitor/stop', { method: 'POST' });
  await refreshMonitorStatus();
}

function togglePhoneSetup() {
  const body = document.getElementById('phone-setup-body');
  const icon = document.getElementById('phone-toggle-icon');
  const visible = body.style.display !== 'none';
  body.style.display = visible ? 'none' : 'block';
  icon.textContent = visible ? '▼' : '▲';
}

// Hook into tab nav to start/stop polling and load sessions
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === 'activity-monitor') {
      refreshMonitorStatus();
      monitorPollInterval = setInterval(refreshMonitorStatus, 3000);
    } else {
      clearInterval(monitorPollInterval);
      monitorPollInterval = null;
    }
    if (tab === 'sop-generator') {
      loadSessions();
    }
  });
});

// ===== SOP GENERATOR =====

async function loadSessions() {
  const sel = document.getElementById('session-select');
  sel.innerHTML = '<option value="">Loading...</option>';
  try {
    const res = await fetch('/api/sessions');
    const data = await res.json();
    const sessions = data.sessions;
    if (!sessions.length) {
      sel.innerHTML = '<option value="">No sessions yet — start the monitor first</option>';
      return;
    }
    sel.innerHTML = '<option value="">— Select a session —</option>';
    sessions.forEach(s => {
      const date = (s.started_at || '').replace('T', ' ').slice(0, 16);
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${date}  |  ${s.label || 'Session'}${s.has_sop ? ' ✓' : ''}`;
      sel.appendChild(opt);
    });
  } catch (e) {
    sel.innerHTML = '<option value="">Error loading sessions</option>';
  }
}

async function onSessionChange() {
  const sessionId = document.getElementById('session-select').value;
  const preview = document.getElementById('session-preview');
  const btn = document.getElementById('btn-generate-sop');
  const sopBox = document.getElementById('sop-output');

  if (!sessionId) {
    preview.style.display = 'none';
    btn.disabled = true;
    sopBox.style.display = 'none';
    return;
  }

  btn.disabled = false;
  sopBox.style.display = 'none';

  try {
    const res = await fetch(`/api/sessions/${sessionId}/activities`);
    if (!res.ok) { preview.style.display = 'none'; return; }
    const data = await res.json();
    renderSessionPreview(data.activities);
    preview.style.display = 'block';
  } catch (e) {
    preview.style.display = 'none';
  }
}

function renderSessionPreview(activities) {
  const label = document.getElementById('session-preview-label');
  const list = document.getElementById('session-activity-list');
  label.textContent = `${activities.length} activit${activities.length === 1 ? 'y' : 'ies'} recorded`;
  const rows = activities.slice(0, 25).map(a => {
    const mins = Math.floor(a.duration_sec / 60);
    const secs = a.duration_sec % 60;
    const dur = mins ? `${mins}m ${secs}s` : `${secs}s`;
    const srcTag = a.source !== 'desktop' ? `<span class="activity-src">${escapeHtml(a.source)}</span>` : '';
    return `<div class="activity-row">
      ${srcTag}<span class="activity-app">${escapeHtml(a.app_name)}</span>
      <span class="activity-title">${escapeHtml((a.window_title || '').slice(0, 70))}${(a.window_title || '').length > 70 ? '…' : ''}</span>
      <span class="activity-dur">${dur}</span>
    </div>`;
  }).join('');
  const more = activities.length > 25
    ? `<div class="activity-more">+${activities.length - 25} more</div>` : '';
  list.innerHTML = rows + more;
}

async function generateSOP() {
  const sessionId = document.getElementById('session-select').value;
  if (!sessionId) return;
  const btn = document.getElementById('btn-generate-sop');
  btn.disabled = true;
  showLoading('sop-output');

  try {
    const res = await fetch('/api/sessions/generate-sop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: parseInt(sessionId) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'SOP generation failed');
    showResult('sop-output', 'sop-output-text', 'Generated SOP', data.sop);
    loadSessions(); // refresh dropdown to show ✓ indicator
  } catch (e) {
    showError('sop-output', e.message);
  } finally {
    btn.disabled = false;
  }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
