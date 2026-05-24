// ── Password gate ─────────────────────────────────────────────────────────────
// Stores the team password in sessionStorage so the user only types it once
// per browser session. The server checks X-App-Password on every request.
// If no APP_PASSWORD is set on the server, every request passes through fine.

function getPassword() {
  return sessionStorage.getItem('appPassword') || '';
}

function apiHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const pw = getPassword();
  if (pw) h['X-App-Password'] = pw;
  return h;
}

async function checkPassword(pw) {
  const res = await fetch('/health', { headers: { 'X-App-Password': pw } });
  return res.ok;
}

async function showPasswordModal() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.id = 'pw-modal';
    modal.innerHTML = `
      <div class="pw-backdrop">
        <div class="pw-box">
          <div class="pw-logo">🏡</div>
          <h2>RealAssist</h2>
          <p>Enter your team password to continue.</p>
          <input type="password" id="pw-input" placeholder="Password" autocomplete="current-password" />
          <button id="pw-submit" class="btn-primary">Continue</button>
          <p class="pw-error" id="pw-error" style="display:none;">Incorrect password — try again.</p>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const input = document.getElementById('pw-input');
    const btn   = document.getElementById('pw-submit');
    const err   = document.getElementById('pw-error');

    async function attempt() {
      const pw = input.value.trim();
      btn.disabled = true;
      btn.textContent = 'Checking…';
      const ok = await checkPassword(pw);
      if (ok) {
        sessionStorage.setItem('appPassword', pw);
        modal.remove();
        resolve();
      } else {
        err.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Continue';
        input.select();
      }
    }

    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
    input.focus();
  });
}

// On load: probe /health — if 401, show password modal before anything else
(async function init() {
  const probe = await fetch('/health');
  if (probe.status === 401) {
    await showPasswordModal();
  }
})();


// ── Tab navigation ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tab).classList.add('active');
  });
});

// ── UI helpers ────────────────────────────────────────────────────────────────
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

// ── API calls ─────────────────────────────────────────────────────────────────
async function generateDailyPlan() {
  const btn = document.querySelector('#daily-plan .btn-primary');
  btn.disabled = true;
  showLoading('plan-output');

  try {
    const res = await fetch('/api/daily-plan', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        appointments:   document.getElementById('appointments').value,
        leads:          document.getElementById('leads').value,
        pending_deals:  document.getElementById('pending-deals').value,
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
  if (!tasks) { alert('Please describe the tasks for Dan.'); return; }

  const btn = document.querySelector('#va-handoff .btn-primary');
  btn.disabled = true;
  showLoading('handoff-output');

  try {
    const res = await fetch('/api/va-handoff', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        tasks,
        priority: document.getElementById('priority').value,
        deadline: document.getElementById('deadline').value,
        context:  document.getElementById('context').value,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    showResult('handoff-output', 'handoff-output-text', 'Handoff Brief for Dan', data.handoff);
  } catch (err) {
    showError('handoff-output', err.message);
  } finally {
    btn.disabled = false;
  }
}

async function generateAgentHowTo() {
  const topic = document.getElementById('topic').value.trim();
  if (!topic) { alert('Please enter a topic for the how-to guide.'); return; }

  const btn = document.querySelector('#agent-howto .btn-primary');
  btn.disabled = true;
  showLoading('howto-output');

  try {
    const res = await fetch('/api/agent-howto', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        topic,
        agent_experience:   document.getElementById('agent-experience').value,
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
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  });
}
