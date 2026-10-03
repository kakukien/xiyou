import { store } from '../core/store.js';
import { collab } from '../core/collab.js';
import { iconMarkup } from './components/icon.js';

export function mount(el) {
  const root = document.createElement('div');
  root.className = 'presence-bar';

  const status = document.createElement('span');
  status.className = 'presence-status';

  const statusDot = document.createElement('span');
  statusDot.className = 'presence-status-dot';
  const statusText = document.createElement('span');
  statusText.className = 'presence-status-text';

  status.append(statusDot, statusText);

  const roomInput = document.createElement('input');
  roomInput.className = 'field presence-room';
  roomInput.type = 'text';
  roomInput.title = '协作房间';
  roomInput.placeholder = '房间名';
  roomInput.value = new URLSearchParams(location.search).get('room') || window.__xiyouRoom || 'demo';

  const peersCount = document.createElement('span');
  peersCount.className = 'presence-count';

  const avatars = document.createElement('div');
  avatars.className = 'presence-avatars';
  avatars.setAttribute('aria-label', '在线协作者');

  const lockHint = document.createElement('div');
  lockHint.className = 'presence-lock-hint';

  const roleTag = document.createElement('span');
  roleTag.className = 'presence-role';

  const ownerTag = document.createElement('span');
  ownerTag.className = 'presence-owner';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-sm presence-save';
  saveBtn.textContent = '保存工程到房间';
  saveBtn.title = '房主：把当前本地场景覆盖写入协作房间';
  saveBtn.style.display = 'none';
  saveBtn.addEventListener('click', () => {
    if (collab.publishLocalScene()) {
      store.emit('log', { msg: '已将当前工程保存到协作房间', level: 'info' });
    }
  });

  const wrap = document.createElement('div');
  wrap.className = 'presence-wrap';
  statusText.addEventListener('click', () => {
    if (connectionState === 'connected') return;
    const url = new URL(location.href);
    url.searchParams.set('room', roomInput?.value?.trim() || new URLSearchParams(location.search).get('room') || 'demo');
    navigator.clipboard?.writeText(url.toString()).then(() => {
      statusText.innerHTML = `${iconMarkup('link', '链接')}<span>链接已复制</span>`;
      setTimeout(renderStatus, 1500);
    }).catch(() => window.prompt('复制协作链接', url.toString()));
  });

  wrap.append(status, peersCount, avatars, roomInput, roleTag, ownerTag, saveBtn, lockHint);
  root.append(wrap);
  el.append(root);

  let connectionState = 'disconnected';
  let peers = [];
  let selectedIds = [];
  let awaitingOwner = false;

  const user = getUser();
  const role = getRole();
  const params = new URLSearchParams(location.search);
  const ROLE_LABEL = { owner: '房主', editor: '编辑', previewer: '观看' };

  function currentRole(room) {
    const fromUrl = params.get('role');
    if (fromUrl === 'owner' || fromUrl === 'previewer' || fromUrl === 'editor') {
      if (room) localStorage.setItem(`xiyou.role.${room}`, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(`xiyou.role.${room || 'demo'}`) || 'editor';
  }
  const hasExplicitCollab = params.has('ws') || params.has('collab') || !['localhost', '127.0.0.1'].includes(location.hostname);
  const wsUrl = params.get('ws') ||
    (['localhost', '127.0.0.1'].includes(location.hostname)
      ? `ws://${location.hostname}:8022`
      : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/xiyou-yjs`);

  function getRole() {
    const requested = new URLSearchParams(location.search).get('role') || localStorage.getItem('xiyou.role') || 'editor'
    return ['manager', 'editor', 'previewer'].includes(requested) ? requested : 'editor'
  }

  function getUser() {
    const key = 'xiyou.user';
    let value = localStorage.getItem(key);
    if (!value) {
      value = `编辑-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      localStorage.setItem(key, value);
    }
    return value;
  }

  function normalisePeers(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.peers)) return value.peers;
    if (value && value.peers && typeof value.peers === 'object') {
      return Object.entries(value.peers).map(([id, peer]) => ({
        id,
        ...(peer || {})
      }));
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).map(([id, peer]) => ({
        id,
        ...(peer || {})
      }));
    }
    return [];
  }

  function peerName(peer) {
    return peer.name || peer.user?.name || peer.username || '匿名用户';
  }

  function peerColor(peer) {
    return peer.color || peer.user?.color || 'var(--accent,#4e9eff)';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function renderStatus() {
    const colors = {
      connected: 'var(--success,#55c878)',
      connecting: 'var(--warning,#e6a23c)',
      disconnected: 'var(--text-muted,#737b87)'
    };
    statusDot.style.background = colors[connectionState] || colors.disconnected;
    statusText.textContent = connectionState === 'connected'
      ? (awaitingOwner ? '等待房主同步' : '已连接')
      : connectionState === 'connecting'
        ? '连接中'
        : '邀请协作 →';
    statusText.style.cursor = connectionState === 'connected' ? '' : 'pointer';
    statusText.style.color = connectionState === 'connected' ? '' : 'var(--accent,#e8842c)';

    peersCount.textContent = connectionState === 'connected'
      ? `${peers.length + 1} 人在线`
      : '';

    const role = collab.role || 'editor';
    roleTag.textContent = connectionState === 'connected' ? `· ${ROLE_LABEL[role] || role}` : '';
    const info = collab.roomInfo?.();
    ownerTag.textContent = connectionState === 'connected' && info?.owner?.name
      ? `房主:${info.owner.name}`
      : '';
    ownerTag.title = info?.owner?.at ? `认领于 ${info.owner.at}` : '';
    saveBtn.style.display = connectionState === 'connected' && collab.isOwner ? '' : 'none';

    avatars.replaceChildren();
    const visiblePeers = peers.slice(0, 4);
    visiblePeers.forEach(peer => {
      const avatar = document.createElement('span');
      avatar.className = 'presence-avatar';
      avatar.textContent = peerName(peer).charAt(0) || '?';
      avatar.title = peerName(peer);
      avatar.style.background = peerColor(peer);
      avatars.append(avatar);
    });
    const hiddenPeers = peers.slice(4);
    if (hiddenPeers.length) {
      const more = document.createElement('span');
      more.className = 'presence-more';
      more.textContent = `+${hiddenPeers.length}`;
      more.title = `还有 ${hiddenPeers.length} 位协作者`;
      const popover = document.createElement('span');
      popover.className = 'presence-more-popover';
      popover.innerHTML = `<strong>其他协作者</strong>${hiddenPeers.map(peer => `<span>${escapeHtml(peerName(peer))}</span>`).join('')}`;
      more.append(popover);
      avatars.append(more);
    }

    renderLock();
  }

  function lockedIds(peer) {
    const values = [
      peer.lockedBy,
      peer.locked,
      peer.lockedObject,
      peer.lockedObjectId
    ];

    const ids = [];
    values.forEach(value => {
      if (typeof value === 'string') ids.push(value);
      else if (Array.isArray(value)) ids.push(...value);
      else if (value && typeof value === 'object') {
        Object.keys(value).forEach(key => {
          if (value[key]) ids.push(key);
        });
      }
    });

    if (Array.isArray(peer.selection)) ids.push(...peer.selection);
    if (peer.selection && typeof peer.selection === 'string') ids.push(peer.selection);
    return ids;
  }

  function renderLock() {
    const selected = selectedIds[0];
    const owner = selected && peers.find(peer => lockedIds(peer).includes(selected));
    if (owner) {
      lockHint.textContent = `${peerName(owner)} 正在编辑此对象`;
      lockHint.style.display = 'block';
    } else {
      lockHint.textContent = '';
      lockHint.style.display = 'none';
    }
  }

  function connect() {
    const room = roomInput.value.trim() || 'demo';
    roomInput.value = room;
    connectionState = 'connecting';
    renderStatus();

    const keyParam = new URLSearchParams(location.search).get('key')
      || localStorage.getItem(`xiyou.key.${room}`)
      || '';
    const role = currentRole(room);
    try {
      Promise.resolve(
        collab.connect({ url: wsUrl, room, user: { name: user, key: keyParam, role } })
      ).catch(error => {
        connectionState = 'disconnected';
        renderStatus();
        store.emit('log', {
          msg: `协作连接失败：${error.message || error}`,
          level: 'error'
        });
      });
    } catch (error) {
      connectionState = 'disconnected';
      renderStatus();
      store.emit('log', {
        msg: `协作连接失败：${error.message || error}`,
        level: 'error'
      });
    }
  }

  // expose for main.js auto-connect
  root._connect = connect;
  root._hasExplicitCollab = hasExplicitCollab;

  roomInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      connect();
      roomInput.blur();
    }
  });

  store.on('collab-peers', value => {
    peers = normalisePeers(value);
    renderStatus();
  });

  store.on('collab-awaiting', () => {
    awaitingOwner = true;
    renderStatus();
  });

  store.on('collab-seeded', () => {
    awaitingOwner = false;
    renderStatus();
  });

  store.on('collab-status', value => {
    if (typeof value === 'string') {
      connectionState = value === 'connected' || value === 'connecting'
        ? value
        : 'disconnected';
    } else if (value && typeof value === 'object') {
      if (value.connecting) connectionState = 'connecting';
      else if (value.connected) connectionState = 'connected';
      else if (value.connected === false) connectionState = 'disconnected';
      if (value.peers) peers = normalisePeers(value.peers);
    }
    renderStatus();
  });

  store.on('selection', selection => {
    selectedIds = Array.isArray(selection)
      ? selection
      : selection instanceof Set
        ? [...selection]
        : store.selected();
    renderLock();
  });

  renderStatus();
  return root;
}