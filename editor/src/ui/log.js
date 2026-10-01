import { store } from '../core/store.js'

export function log(msg, level = 'info') {
  store.emit('log', { msg, level, t: Date.now() })
  if (level === 'err') console.error(msg)
  else console.log(msg)
}
