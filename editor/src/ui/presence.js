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

  const lockHint = document.createElement('div');
  lockHint.className = 'presence-lock-hint';
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

  wrap.append(status, peersCount, avatars, roomInput, lockHint);
  root.append(wrap);
  el.append(root);

  let connectionState = 'disconnected';
  let peers = [];
  let selectedIds = [];

  const user = getUser();
  const params = new URLSearchParams(location.search);
  const hasExplicitCollab = params.has('ws') || params.has('collab') || location.hostname === 'agentpay.xx.kg';
  const wsUrl = params.get('ws') ||
    (location.hostname === 'agentpay.xx.kg'
      ? 'wss://agentpay.xx.kg/xiyou-yjs'
      : `ws://${location.hostname}:8022`);

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

  function renderStatus() {
    const colors = {
      connected: 'var(--success,#55c878)',
      connecting: 'var(--warning,#e6a23c)',
      disconnected: 'var(--text-muted,#737b87)'
    };
    statusDot.style.background = colors[connectionState] || colors.disconnected;
    statusText.textContent = connectionState === 'connected'
      ? '已连接'
      : connectionState === 'connecting'
        ? '连接中'
        : '邀请协作 →';
    statusText.style.cursor = connectionState === 'connected' ? '' : 'pointer';
    statusText.style.color = connectionState === 'connected' ? '' : 'var(--accent,#e8842c)';

    peersCount.textContent = connectionState === 'connected'
      ? `${peers.length} 人在线`
      : '';

    avatars.replaceChildren();
    peers.forEach(peer => {
      const avatar = document.createElement('span');
      avatar.className = 'presence-avatar';
      avatar.textContent = peerName(peer).charAt(0) || '?';
      avatar.title = peerName(peer);
      avatar.style.background = peerColor(peer);
      avatars.append(avatar);
    });

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
    try {
      Promise.resolve(
        collab.connect({ url: wsUrl, room, user: { name: user, key: keyParam } })
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