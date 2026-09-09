const serverAddress = document.getElementById('serverAddress')
  ? document.getElementById('serverAddress').textContent
  : '';

async function fetchAPI(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function copyAddress() {
  navigator.clipboard.writeText(serverAddress)
    .then(() => showToast('Адрес скопирован!'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = serverAddress;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Адрес скопирован!');
    });
}

function rankClass(i) {
  if (i === 0) return 'rank-badge rank-1';
  if (i === 1) return 'rank-badge rank-2';
  if (i === 2) return 'rank-badge rank-3';
  return 'rank-badge rank-other';
}

const METRIC_ORDER = ['hours', 'kills', 'blocks', 'deaths'];

function formatNumber(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('ru-RU');
}

function formatHours(h) {
  const value = Number(h) || 0;
  const hrs = Math.floor(value);
  const mins = Math.round((value - hrs) * 60);
  const hh = mins === 60 ? hrs + 1 : hrs;
  return `${hh} ч ${mins % 60} мин`;
}

const METRICS = {
  hours: { label: 'Часы', key: 'hours_played', fmt: formatHours },
  kills: { label: 'Мобов убито', key: 'mobs_killed', fmt: formatNumber },
  blocks: { label: 'Блоков сломано', key: 'blocks_broken', fmt: formatNumber },
  deaths: { label: 'Смертей', key: 'deaths', fmt: formatNumber }
};

function renderTopHeader(sort, cols) {
  const head = document.getElementById('topHead');
  head.innerHTML = `
    <tr>
      <th>#</th>
      <th>Ник</th>
      ${cols.map((c) => `<th class="${c === sort ? 'th-value' : ''}">${METRICS[c].label}</th>`).join('')}
    </tr>
  `;
}

async function loadTopPlayers(sort = 'hours') {
  const tbody = document.getElementById('topPlayersBody');
  const cols = [sort, ...METRIC_ORDER.filter((m) => m !== sort)].slice(0, 3);
  renderTopHeader(sort, cols);
  tbody.innerHTML = '<tr><td colspan="5" class="loading">Загрузка...</td></tr>';
  try {
    const players = await fetchAPI('/api/players/top?limit=10&sort=' + sort);
    if (!players.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">Нет данных — игроки ещё не зарегистрированы</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    players.forEach((p, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="${rankClass(i)}">${i + 1}</span></td>
        <td class="player-name">${p.username}</td>
        ${cols.map((c) => `<td class="${c === sort ? 'top-value' : ''}">${METRICS[c].fmt(p[METRICS[c].key])}</td>`).join('')}
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="error-msg">Ошибка загрузки топа</td></tr>';
  }
}

async function loadServerStats() {
  try {
    const stats = await fetchAPI('/api/players/statistics');
    document.getElementById('totalPlayers').textContent = stats.total_players ?? '—';
    document.getElementById('totalHours').textContent = stats.total_hours ?? '—';
  } catch (err) {
    // оставляем placeholder
  }
}

function renderRelTime(iso) {
  if (!iso) return '—';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 5) return 'Обновлено: только что';
  if (diff < 60) return `Обновлено: ${diff} сек назад`;
  return `Обновлено: ${Math.floor(diff / 60)} мин назад`;
}

async function loadStatusLive() {
  try {
    const status = await fetchAPI('/api/status?players=1');
    const badge = document.getElementById('statusBadge');
    const isOnline = !!status.online;

    badge.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
    badge.className = 'status-badge ' + (isOnline ? 'online' : 'offline');

    document.getElementById('onlineCount').textContent = status.players_online || 0;
    document.getElementById('maxCount').textContent = status.max_players || 0;
    document.getElementById('statusVersion').textContent = status.version || '—';
    document.getElementById('statusPing').textContent = status.latency ? status.latency + ' ms' : '—';
    document.getElementById('statusUpdated').textContent = renderRelTime(status.checked_at);

    const playerBar = document.getElementById('playerBar');
    if (playerBar && status.max_players > 0) {
      const pct = Math.min(100, ((status.players_online || 0) / status.max_players) * 100);
      playerBar.style.width = pct + '%';
    }

    const onlineBox = document.getElementById('playersOnline');
    const playerList = document.getElementById('playerList');
    if (onlineBox) onlineBox.style.display = isOnline ? 'block' : 'none';
    if (playerList) {
      const list = status.playerList || [];
      playerList.textContent = list.length
        ? list.map(p => p.name || p.username || '?').join(', ')
        : 'никого нет';
    }
  } catch (err) {
    // API недоступен — оставляем серверный рендер
  }
}

async function openNews(id) {
  const overlay = document.getElementById('newsModal');
  const content = document.getElementById('newsModalContent');
  try {
    const n = await fetchAPI(`/api/news/${id}`);
    content.innerHTML = `
      <h2 class="modal-title">${n.title}</h2>
      <div class="modal-meta">
        ${new Date(n.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })} · @${n.author}
      </div>
      <div class="modal-content">${n.content.replace(/\n/g, '<br>')}</div>
    `;
    overlay.classList.add('active');
  } catch (err) {
    showToast('Не удалось загрузить новость');
  }
}

function closeNews(event) {
  const overlay = document.getElementById('newsModal');
  if (event && event.target !== overlay) return;
  overlay.classList.remove('active');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('newsModal').classList.remove('active');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadTopPlayers('hours');
  loadServerStats();
  loadStatusLive();

  const tabs = document.querySelectorAll('.top-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('active')) return;
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      loadTopPlayers(tab.dataset.sort);
    });
  });

  // Актуальный статус каждые 5 секунд
  setInterval(loadStatusLive, 5000);
});