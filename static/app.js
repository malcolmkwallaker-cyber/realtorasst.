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
