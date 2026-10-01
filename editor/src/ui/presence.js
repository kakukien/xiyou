import { store } from '../core/store.js';
import { collab } from '../core/collab.js';

export function mount(el) {
  const root = document.createElement('div');
  root.className = 'presence-bar';
  root.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:8px',
    'height:100%',
    'margin-left:auto',
    'font-size:12px',
    'color:var(--fg-dim,#6b7686)',
    'white-space:nowrap'
  ].join(';');

  const status = document.createElement('span');
  status.className = 'presence-status';
  status.style.cssText = 'display:flex;align-items:center;gap:5px';

  const statusDot = document.createElement('span');
  statusDot.className = 'presence-status-dot';
  statusDot.style.cssText = [
    'width:8px',
    'height:8px',
    'border-radius:50%',
    'display:inline-block',
    'background:var(--text-muted,#737b87)'
  ].join(';');

  const statusText = document.createElement('span');
  statusText.className = 'presence-status-text';

  status.append(statusDot, statusText);

  const roomInput = document.createElement('input');
  roomInput.className = 'field presence-room';
  roomInput.type = 'text';
  roomInput.title = '协作房间';
  roomInput.placeholder = '房间名';
  roomInput.style.cssText = 'width:82px;height:24px;padding:2px 6px';
  roomInput.value = new URLSearchParams(location.search).get('room') || 'demo';

  const peersCount = document.createElement('span');
  peersCount.className = 'presence-count';

  const avatars = document.createElement('div');
  avatars.className = 'presence-avatars';
  avatars.style.cssText = 'display:flex;align-items:center;gap:3px';

  const lockHint = document.createElement('div');
  lockHint.className = 'presence-lock-hint';
  lockHint.style.cssText = [
    'position:absolute',
    'right:8px',
    'top:calc(100% + 2px)',
    'padding:3px 7px',
    'border:1px solid var(--line2,#c4cad6)',
    'border-radius:3px',
    'background:var(--bg1,#faf9f6)',
    'color:var(--fg-dim,#6b7686)',
    'font-size:11px',
    'display:none',
    'z-index:20'
  ].join(';');

  const wrap = document.createElement('div');
  wrap.className = 'presence-wrap';
  wrap.style.cssText = 'position:relative;display:flex;align-items:center;gap:8px';
  wrap.append(status, peersCount, avatars, roomInput, lockHint);
  root.append(wrap);
  el.append(root);

  let connectionState = 'disconnected';
  let peers = [];
  let selectedIds = [];

  const user = getUser();
  const wsUrl = new URLSearchParams(location.search).get('ws') ||
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
        : '单机';

    peersCount.textContent = connectionState === 'connected'
      ? `${peers.length} 人在线`
      : '';

    avatars.replaceChildren();
    peers.forEach(peer => {
      const avatar = document.createElement('span');
      avatar.className = 'presence-avatar';
      avatar.textContent = peerName(peer).charAt(0) || '?';
      avatar.title = peerName(peer);
      avatar.style.cssText = [
        'width:26px',
        'height:26px',
        'border-radius:50%',
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'background:' + peerColor(peer),
        'color:var(--text-bright,#fff)',
        'font-size:12px',
        'font-weight:600',
        'box-sizing:border-box'
      ].join(';');
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