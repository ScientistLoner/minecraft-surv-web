const API = '/api';
const $ = (id) => document.getElementById(id);

let token = localStorage.getItem('mc_token') || null;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  return fetch(API + path, { ...opts, headers }).then(async (res) => {
    if (res.status === 401) {
      logout();
      throw new Error('Сессия истекла, войдите снова');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText);
    }
    if (res.status === 204) return null;
    return res.json();
  });
}

// Отдельный запрос для логина: 401 здесь = неверный логин/пароль, а не "истёкшая сессия"
function apiLogin(payload) {
  return fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Ошибка входа');
    }
    return res.json();
  });
}

// ---------- Вход / выход ----------

function showLogin() {
  $('loginView').style.display = 'flex';
  $('dashboardView').style.display = 'none';
}

function showDashboard() {
  $('loginView').style.display = 'none';
  $('dashboardView').style.display = 'block';
  $('adminUser').textContent = localStorage.getItem('mc_user') || '';
}

function logout() {
  token = null;
  localStorage.removeItem('mc_token');
  localStorage.removeItem('mc_user');
  showLogin();
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Вход...';
  $('loginError').textContent = '';
  try {
    const data = await apiLogin({
      username: $('loginUsername').value.trim(),
      password: $('loginPassword').value
    });
    token = data.token;
    localStorage.setItem('mc_token', data.token);
    localStorage.setItem('mc_user', data.user.username);
    showDashboard();
    loadAll();
  } catch (err) {
    $('loginError').textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
});

$('logoutBtn').addEventListener('click', logout);

// ---------- Табы ----------

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    $('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ---------- Новости ----------

function openNewsForm(news) {
  $('newsId').value = news ? news.id : '';
  $('newsTitle').value = news ? news.title : '';
  $('newsAuthor').value = news ? news.author : 'Admin';
  $('newsContent').value = news ? news.content : '';
  $('newsForm').style.display = 'flex';
  $('newsTitle').focus();
}

function closeNewsForm() {
  $('newsForm').style.display = 'none';
  $('newsId').value = '';
}

async function loadNews() {
  const list = $('newsList');
  list.innerHTML = '<li class="loading">Загрузка...</li>';
  try {
    const news = await api('/news');
    if (!news.length) {
      list.innerHTML = '<li class="empty">Новостей пока нет</li>';
      return;
    }
    list.innerHTML = news.map((n) => `
      <li class="admin-item">
        <div class="item-main">
          <strong>${esc(n.title)}</strong>
          <span class="item-meta">@${esc(n.author)} · ${new Date(n.published_at).toLocaleString('ru-RU')}</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost" onclick="editNews(${n.id})">Изменить</button>
          <button class="btn btn-danger" onclick="deleteNews(${n.id})">Удалить</button>
        </div>
      </li>
    `).join('');
  } catch (err) {
    list.innerHTML = `<li class="error-msg">${esc(err.message)}</li>`;
  }
}

window.editNews = async (id) => {
  const n = await api('/news/' + id);
  openNewsForm(n);
};

window.deleteNews = async (id) => {
  if (!confirm('Удалить новость?')) return;
  await api('/news/' + id, { method: 'DELETE' });
  toast('Удалено');
  loadNews();
};

$('newNewsBtn').addEventListener('click', () => {
  closeNewsForm();
  openNewsForm(null);
});

$('newsCancelBtn').addEventListener('click', closeNewsForm);

$('newsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('newsId').value;
  const payload = {
    title: $('newsTitle').value.trim(),
    author: $('newsAuthor').value.trim() || 'Admin',
    content: $('newsContent').value.trim()
  };
  if (id) {
    await api('/news/' + id, { method: 'PUT', body: JSON.stringify(payload) });
    toast('Новость обновлена');
  } else {
    await api('/news', { method: 'POST', body: JSON.stringify(payload) });
    toast('Новость опубликована');
  }
  closeNewsForm();
  loadNews();
});

// ---------- Правила ----------

function openRuleForm(rule) {
  $('ruleId').value = rule ? rule.id : '';
  $('ruleTitle').value = rule ? rule.title : '';
  $('ruleDesc').value = rule ? rule.description : '';
  $('ruleOrder').value = rule ? rule.sort_order : 1;
  $('ruleForm').style.display = 'flex';
}

function closeRuleForm() {
  $('ruleForm').style.display = 'none';
  $('ruleId').value = '';
}

async function loadRules() {
  const list = $('rulesList');
  list.innerHTML = '<li class="loading">Загрузка...</li>';
  try {
    const rules = await api('/rules');
    if (!rules.length) {
      list.innerHTML = '<li class="empty">Правил пока нет</li>';
      return;
    }
    list.innerHTML = rules.map((r) => `
      <li class="admin-item">
        <div class="item-main">
          <strong>${esc(r.sort_order)}. ${esc(r.title)}</strong>
          <span class="item-desc">${esc(r.description)}</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost" onclick="editRule(${r.id})">Изменить</button>
          <button class="btn btn-danger" onclick="deleteRule(${r.id})">Удалить</button>
        </div>
      </li>
    `).join('');
  } catch (err) {
    list.innerHTML = `<li class="error-msg">${esc(err.message)}</li>`;
  }
}

window.editRule = async (id) => {
  const r = await api('/rules/' + id);
  openRuleForm(r);
};

window.deleteRule = async (id) => {
  if (!confirm('Удалить правило?')) return;
  await api('/rules/' + id, { method: 'DELETE' });
  toast('Удалено');
  loadRules();
};

$('newRuleBtn').addEventListener('click', () => openRuleForm(null));
$('ruleCancelBtn').addEventListener('click', closeRuleForm);

$('ruleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('ruleId').value;
  const payload = {
    title: $('ruleTitle').value.trim(),
    description: $('ruleDesc').value.trim(),
    sort_order: parseInt($('ruleOrder').value, 10) || 0
  };
  if (id) {
    await api('/rules/' + id, { method: 'PUT', body: JSON.stringify(payload) });
    toast('Правило обновлено');
  } else {
    await api('/rules', { method: 'POST', body: JSON.stringify(payload) });
    toast('Правило добавлено');
  }
  closeRuleForm();
  loadRules();
});

// ---------- Игроки ----------

async function loadPlayers() {
  const list = $('playersList');
  list.innerHTML = '<li class="loading">Загрузка...</li>';
  try {
    const players = await api('/players');
    if (!players.length) {
      list.innerHTML = '<li class="empty">Игроки появятся после заходов на сервер</li>';
      return;
    }
    list.innerHTML = players.map((p) => {
      const st = p.Statistics && p.Statistics[0] || {};
      return `
      <li class="admin-item">
        <div class="item-main">
          <strong>${esc(p.username)}</strong>
          <span class="item-meta">${(p.hours_played || 0).toFixed(1)} ч · мобы ${st.mobs_killed || 0} · смерти ${st.deaths || 0}${p.is_banned ? ' · <span class="banned">ЗАБАНЕН</span>' : ''}</span>
        </div>
        <div class="item-actions">
          <button class="btn ${p.is_banned ? 'btn-primary' : 'btn-warn'}" onclick="toggleBan(${p.id}, ${p.is_banned ? 0 : 1})">${p.is_banned ? 'Разбанить' : 'Забанить'}</button>
          <button class="btn btn-danger" onclick="deletePlayer(${p.id})">Удалить</button>
        </div>
      </li>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<li class="error-msg">${esc(err.message)}</li>`;
  }
}

window.toggleBan = async (id, willBan) => {
  const all = await api('/players');
  const player = all.find((x) => x.id === id);
  if (!player) return;
  await api('/players/' + encodeURIComponent(player.username), {
    method: 'PUT',
    body: JSON.stringify({ is_banned: !!willBan })
  });
  toast(willBan ? 'Игрок забанен' : 'Игрок разбанен');
  loadPlayers();
};

window.deletePlayer = async (id) => {
  if (!confirm('Удалить игрока?')) return;
  await api('/players/' + id, { method: 'DELETE' });
  toast('Игрок удалён');
  loadPlayers();
};

// ---------- Сообщения ----------

async function loadMessages() {
  const list = $('messagesList');
  list.innerHTML = '<li class="loading">Загрузка...</li>';
  try {
    const messages = await api('/contact');
    if (!messages.length) {
      list.innerHTML = '<li class="empty">Сообщений пока нет</li>';
      return;
    }
    list.innerHTML = messages.map((m) => `
      <li class="admin-item">
        <div class="item-main">
          <strong>${esc(m.name)} <a class="mail" href="mailto:${esc(m.email)}">${esc(m.email)}</a></strong>
          <span class="item-meta">${new Date(m.created_at).toLocaleString('ru-RU')}</span>
          <p class="item-text">${esc(m.message)}</p>
        </div>
        <div class="item-actions">
          <button class="btn btn-danger" onclick="deleteMessage(${m.id})">Удалить</button>
        </div>
      </li>
    `).join('');
  } catch (err) {
    list.innerHTML = `<li class="error-msg">${esc(err.message)}</li>`;
  }
}

window.deleteMessage = async (id) => {
  if (!confirm('Удалить сообщение?')) return;
  await api('/contact/' + id, { method: 'DELETE' });
  toast('Сообщение удалено');
  loadMessages();
};

// ---------- Инициализация ----------

function loadAll() {
  loadNews();
  loadRules();
  loadPlayers();
  loadMessages();
}

if (token) {
  showDashboard();
  loadAll();
} else {
  showLogin();
}