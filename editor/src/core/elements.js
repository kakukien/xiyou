import { ELEMENT_CATALOG, ELEMENT_CATEGORIES } from './element-catalog.js'
import { store } from './store.js'
import { CONDITIONS } from './schema.js'
import { viewport } from './viewport.js'
import { log } from '../ui/log.js'

const catalogById = new Map(ELEMENT_CATALOG.map(item => [item.id, item]))
const categoryById = new Map(ELEMENT_CATEGORIES.map(item => [item.id, item]))
const conditionIds = new Set(CONDITIONS.map(item => item.id))

const PALETTE = {
  furniture: '#9b6b43',
  environment: '#668363',
  volume: '#52a7c7',
  game: '#d27b35',
  toy: '#5c83c4',
  fx: '#e8b93b',
  interactive: '#8a6bc2',
  helper: '#64748b'
}

const FX = {
  mote: 'fx:mote',
  spark: 'fx:spark',
  smoke: 'fx:smoke',
  glow: 'fx:glow_orb',
  ring: 'fx:ring_glow'
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function n(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

function vec(value, fallback) {
  return Array.isArray(value) && value.length === 3 ? value.map(n) : fallback.slice()
}

function p(shape, s = [1, 1, 1], position = [0, 0, 0], color, extra = {}) {
  return {
    shape,
    p: position,
    r: extra.r || [0, 0, 0],
    s,
    ...(color ? { color } : {}),
    ...extra
  }
}

function points(count = 90, spread = [1, 1, 1], color = '#ffe28a', extra = {}) {
  return {
    shape: 'points',
    count,
    spread,
    size: extra.size || 0.05,
    speed: extra.speed || 0.25,
    drift: extra.drift || 0.12,
    material: {
      color,
      alpha: extra.alpha || FX.mote,
      opacity: extra.opacity ?? 0.82,
      blend: extra.blend || 'additive'
    }
  }
}

function glowPlane(color = '#ffd36a', size = [1, 1, 1], alpha = FX.glow, rotation = [-90, 0, 0]) {
  return p('plane', size, [0, 0.03, 0], color, {
    r: rotation,
    flat: true,
    alpha,
    blend: 'additive',
    opacity: 0.72
  })
}

function genericParts(item) {
  const color = PALETTE[item.categoryId] || '#aab4c0'
  const preset = item.render?.preset || ''
  const lower = preset.toLowerCase()

  if (item.render?.kind === 'helper') {
    return [
      p('box', [0.9, 0.04, 0.9], [0, 0.02, 0], '#64748b', { opacity: 0.28 }),
      p('torus', [0.72, 0.72, 0.72], [0, 0.05, 0], '#94a3b8', { r: [90, 0, 0], flat: true, opacity: 0.8 })
    ]
  }
  if (item.render?.kind === 'effect' || item.interactionProfiles?.includes('particle_emitter')) {
    return [points(110, [1.4, 1.2, 1.4], color), glowPlane(color, [1.2, 1.2, 1])]
  }
  if (item.categoryId === 'toy' || item.categoryId === 'game') {
    return [
      p('box', [0.9, 0.35, 1.1], [0, 0.25, 0], color),
      p('sphere', [0.3, 0.3, 0.3], [0, 0.62, -0.15], '#e9eef3', { metalness: 0.4 })
    ]
  }
  if (item.categoryId === 'environment') {
    return [
      p('cylinder', [0.55, 1.3, 0.55], [0, 0.65, 0], color),
      p('cone', [1.15, 0.8, 1.15], [0, 1.65, 0], '#4e7653')
    ]
  }
  if (item.categoryId === 'volume') {
    return [p('box', [1.6, 0.08, 1.6], [0, 0.04, 0], color, { opacity: 0.6, blend: 'additive' })]
  }
  return [p('box', [1, 1, 1], [0, 0.5, 0], color)]
}

const RECIPES = {
  box: () => [p('box', [0.8, 0.8, 0.8], [0, 0.4, 0], '#b98254'), p('torus', [0.58, 0.58, 0.58], [0, 0.4, 0], '#5d3e2b', { r: [90, 0, 0], flat: true, opacity: 0.8 })],
  crate: () => [p('box', [0.9, 0.9, 0.9], [0, 0.45, 0], '#9a6139'), p('box', [0.96, 0.08, 0.08], [0, 0.45, 0.44], '#5c3927'), p('box', [0.08, 0.96, 0.08], [0.44, 0.45, 0], '#5c3927')],
  table: () => [p('box', [1.25, 0.1, 1.1], [0, 1.05, 0], '#9b6b43'), ...[[-0.48, 0.52, -0.4], [0.48, 0.52, -0.4], [-0.48, 0.52, 0.4], [0.48, 0.52, 0.4]].map(position => p('box', [0.1, 1, 0.1], position, '#68452f'))],
  chair: () => [p('box', [0.75, 0.1, 0.72], [0, 0.62, 0], '#946342'), p('box', [0.72, 0.82, 0.1], [0, 1.02, -0.3], '#805235'), ...[[-0.27, 0.3, -0.25], [0.27, 0.3, -0.25], [-0.27, 0.3, 0.25], [0.27, 0.3, 0.25]].map(position => p('box', [0.09, 0.6, 0.09], position, '#68452f'))],
  stool: () => [p('cylinder', [0.64, 0.12, 0.64], [0, 0.68, 0], '#946342'), ...[-0.3, 0.3].map(x => p('box', [0.1, 0.65, 0.1], [x, 0.32, 0], '#68452f'))],
  bench: () => [p('box', [1.6, 0.12, 0.55], [0, 0.65, 0], '#946342'), ...[-0.58, 0.58].flatMap(x => [p('box', [0.11, 0.65, 0.11], [x, 0.32, -0.16], '#68452f'), p('box', [0.11, 0.65, 0.11], [x, 0.32, 0.16], '#68452f')])],
  cabinet: () => [p('box', [0.95, 1.6, 0.45], [0, 0.8, 0], '#76523b'), p('box', [0.86, 0.06, 0.36], [0, 0.84, 0.25], '#b98254'), p('sphere', [0.06, 0.06, 0.06], [0, 0.84, 0.47], '#e8b93b', { metalness: 0.7 })],
  shelf: () => [p('box', [1.2, 0.08, 0.42], [0, 0.28, 0], '#68452f'), p('box', [1.2, 0.08, 0.42], [0, 0.82, 0], '#68452f'), p('box', [1.2, 0.08, 0.42], [0, 1.36, 0], '#68452f'), ...[-0.52, 0.52].map(x => p('box', [0.08, 1.4, 0.08], [x, 0.8, 0], '#68452f'))],
  barrel: () => [p('cylinder', [0.7, 0.95, 0.7], [0, 0.48, 0], '#8e5d3e'), p('torus', [0.69, 0.69, 0.69], [0, 0.28, 0], '#4d382d', { r: [90, 0, 0], flat: true }), p('torus', [0.69, 0.69, 0.69], [0, 0.68, 0], '#4d382d', { r: [90, 0, 0], flat: true })],
  lamp: () => [p('cylinder', [0.12, 0.6, 0.12], [0, 0.3, 0], '#7b8792'), p('cone', [0.5, 0.35, 0.5], [0, 0.72, 0], '#e8b93b', { emissive: '#b77a16', emissive_intensity: 0.6 }), p('sphere', [0.15, 0.15, 0.15], [0, 0.63, 0], '#fff3b0', { emissive: '#ffb03a', emissive_intensity: 1 })],
  rug: () => [p('box', [1.8, 0.03, 1.4], [0, 0.015, 0], '#a66855', { opacity: 0.8 }), p('box', [1.6, 0.035, 1.2], [0, 0.035, 0], '#d8a26b', { opacity: 0.75 })],
  screen: () => [p('box', [1.5, 0.88, 0.08], [0, 0.66, 0], '#273746'), p('plane', [1.35, 0.75, 1], [0, 0.66, -0.05], '#65d6f2', { alpha: 'demo:holo', blend: 'additive', opacity: 0.82 })],
  house: () => [p('box', [2.3, 1.5, 1.8], [0, 0.75, 0], '#c59c73'), p('cone', [2.7, 1.2, 2.2], [0, 2.1, 0], '#7d4f42'), p('box', [0.42, 0.75, 0.08], [0, 0.38, -0.93], '#5c4032')],
  cabin: () => [p('box', [1.9, 1.45, 1.6], [0, 0.72, 0], '#9f774f'), p('cone', [2.35, 1.1, 1.95], [0, 1.95, 0], '#54453e'), p('box', [0.4, 0.7, 0.08], [0, 0.35, -0.83], '#4e3b31')],
  wall: () => [p('box', [2.4, 1.8, 0.16], [0, 0.9, 0], '#9aa4a8')],
  fence: () => [p('box', [1.8, 0.12, 0.12], [0, 0.85, 0], '#8a6549'), ...[-0.7, 0, 0.7].map(x => p('box', [0.12, 1, 0.12], [x, 0.45, 0], '#79563f'))],
  gate: () => [p('box', [1.8, 2.1, 0.16], [0, 1.05, 0], '#66504a'), p('torus', [0.45, 0.45, 0.45], [0, 1.2, -0.1], '#e8b93b', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  bridge: () => [p('box', [2.2, 0.22, 3.2], [0, 0.12, 0], '#8b6d55'), ...[-0.85, 0.85].map(x => p('box', [0.12, 0.6, 3.2], [x, 0.42, 0], '#6b5140'))],
  stairs: () => [0, 1, 2, 3].map(i => p('box', [1.6, 0.22, 0.5], [0, 0.11 + i * 0.22, 0.75 - i * 0.5], '#7d8586')),
  tree: () => [p('cylinder', [0.34, 1.8, 0.34], [0, 0.9, 0], '#694936'), p('icosa', [1.1, 1.15, 1.1], [0, 2, 0], '#4f8056'), p('icosa', [0.8, 0.9, 0.8], [0.55, 1.65, 0], '#628e58')],
  shrub: () => [p('icosa', [1.1, 0.75, 1.1], [0, 0.38, 0], '#5f8b55'), p('icosa', [0.65, 0.55, 0.65], [0.45, 0.55, 0.1], '#729d5c')],
  flower: () => [...[-0.25, 0, 0.25].map(x => p('cylinder', [0.04, 0.45, 0.04], [x, 0.22, 0], '#5d8753')), ...[-0.25, 0, 0.25].map(x => p('sphere', [0.18, 0.18, 0.18], [x, 0.5, 0], '#e38e92'))],
  rock: () => [p('icosa', [1.1, 0.75, 0.9], [0, 0.38, 0], '#7b858c', { roughness: 0.95 })],
  boulder: () => [p('icosa', [1.8, 1.35, 1.55], [0, 0.68, 0], '#68747a', { roughness: 0.98 })],
  signpost: () => [p('cylinder', [0.08, 1.6, 0.08], [0, 0.8, 0], '#68452f'), p('box', [0.9, 0.5, 0.08], [0, 1.45, 0], '#d8a26b')],
  lamp_post: () => [p('cylinder', [0.09, 2, 0.09], [0, 1, 0], '#536170'), p('sphere', [0.18, 0.18, 0.18], [0, 2.03, 0], '#fff0ab', { emissive: '#ffb03a', emissive_intensity: 1 })],
  well: () => [p('cylinder', [1.2, 0.7, 1.2], [0, 0.35, 0], '#7b858c'), p('torus', [0.95, 0.95, 0.95], [0, 0.72, 0], '#9aa4a8', { r: [90, 0, 0] })],
  water_surface: () => [p('plane', [2, 2, 1], [0, 0.02, 0], '#4aa8c4', { r: [-90, 0, 0], shader: { kind: 'ripple', color1: '#37b9df', color2: '#d2f7ff', speed: 0.7, intensity: 0.9 } })],
  stream: () => [p('box', [3.2, 0.05, 0.8], [0, 0.025, 0], '#4aa8c4', { opacity: 0.75, blend: 'additive' }), points(32, [3, 0.2, 0.7], '#d2f7ff', { size: 0.025, speed: 0.45 })],
  pool: () => [p('cylinder', [2.5, 0.18, 2.5], [0, 0.09, 0], '#4aa8c4', { opacity: 0.65, blend: 'additive' }), p('torus', [2.1, 2.1, 2.1], [0, 0.2, 0], '#b8efff', { r: [90, 0, 0], flat: true, opacity: 0.65 })],
  ice_patch: () => [p('box', [2, 0.06, 2], [0, 0.03, 0], '#a8e4f4', { opacity: 0.72, blend: 'additive' }), p('torus', [0.7, 0.7, 0.7], [0, 0.08, 0], '#e8fbff', { r: [90, 0, 0], flat: true })],
  ice_wall: () => [p('box', [1.5, 1.6, 0.18], [0, 0.8, 0], '#9be0f1', { opacity: 0.68, blend: 'additive' })],
  stone_block: () => [p('box', [0.85, 0.75, 0.85], [0, 0.38, 0], '#777f86', { r: [4, 18, 8], roughness: 0.98 })],
  sand_patch: () => [p('plane', [2.5, 2.5, 1], [0, 0.01, 0], '#c9a56f', { r: [-90, 0, 0], opacity: 0.8 })],
  mud_patch: () => [p('plane', [2.5, 2.5, 1], [0, 0.01, 0], '#665548', { r: [-90, 0, 0], opacity: 0.8 })],
  lava_flow: () => [p('box', [2.5, 0.08, 0.8], [0, 0.04, 0], '#e2582f', { shader: { kind: 'flame', color1: '#ffb03a', color2: '#e23e25', speed: 1.2, intensity: 1.4 } })],
  fog_volume: () => [points(180, [3, 1.8, 3], '#b9c7d7', { alpha: FX.smoke, size: 0.09, speed: 0.08, opacity: 0.28 })],
  wind_volume: () => [points(80, [2, 1.5, 2], '#c6e7ed', { alpha: FX.mote, size: 0.035, speed: 0.65, drift: 0.5, opacity: 0.5 })],
  force_field: () => [p('sphere', [1.8, 1.8, 1.8], [0, 0.9, 0], '#6e9af3', { opacity: 0.12, blend: 'additive' }), p('torus', [1.4, 1.4, 1.4], [0, 0.9, 0], '#82c6ff', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  cloud_volume: () => [points(90, [2, 0.9, 1.5], '#f5f8ff', { alpha: FX.cloud, size: 0.22, speed: 0.04, opacity: 0.42 })],
  snow_field: () => [p('plane', [2.5, 2.5, 1], [0, 0.01, 0], '#effaff', { r: [-90, 0, 0], opacity: 0.8 })],
  grass_patch: () => [p('box', [2, 0.18, 2], [0, 0.09, 0], '#61935c'), points(50, [1.8, 0.35, 1.8], '#9bcf68', { alpha: FX.mote, size: 0.03, speed: 0.12 })],
  ripple_surface: () => [p('ring', [1.7, 1.7, 1.7], [0, 0.02, 0], '#6dddf4', { r: [-90, 0, 0], flat: true, blend: 'additive', alpha: FX.ring })],
  chest: () => [p('box', [0.9, 0.55, 0.72], [0, 0.3, 0], '#79513b'), p('box', [0.92, 0.28, 0.75], [0, 0.68, 0], '#9c6b43', { r: [12, 0, 0] }), p('box', [0.08, 0.18, 0.08], [0, 0.48, -0.39], '#e8b93b', { metalness: 0.8 })],
  treasure_chest: () => [p('box', [1.3, 0.65, 0.95], [0, 0.34, 0], '#6b4b3a'), p('cylinder', [0.68, 1.3, 0.68], [0, 0.72, 0], '#a26a3d', { r: [90, 0, 0] }), p('torus', [0.7, 0.7, 0.7], [0, 0.72, -0.02], '#e8b93b', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  key: () => [p('cylinder', [0.12, 0.55, 0.12], [0, 0.28, 0], '#e8b93b', { r: [90, 0, 0], metalness: 0.8 }), p('torus', [0.22, 0.22, 0.22], [0, 0.6, 0], '#e8b93b', { r: [90, 0, 0], flat: true })],
  coin: () => [p('cylinder', [0.28, 0.08, 0.28], [0, 0.28, 0], '#e8b93b', { r: [90, 0, 0], metalness: 0.7 }), p('torus', [0.2, 0.2, 0.2], [0, 0.33, 0], '#fff2a6', { r: [90, 0, 0], flat: true })],
  crystal: () => [p('octa', [0.38, 0.72, 0.38], [0, 0.4, 0], '#75d6ff', { emissive: '#37b9df', emissive_intensity: 1.2, blend: 'additive' }), points(18, [0.6, 0.8, 0.6], '#d3f7ff', { size: 0.04, speed: 0.18 })],
  health_pack: () => [p('box', [0.55, 0.35, 0.55], [0, 0.28, 0], '#eaf1f4'), p('box', [0.12, 0.38, 0.04], [0, 0.28, -0.29], '#e65e58'), p('box', [0.38, 0.12, 0.04], [0, 0.28, -0.29], '#e65e58')],
  checkpoint: () => [p('cylinder', [0.8, 0.12, 0.8], [0, 0.06, 0], '#4f6d8b'), p('torus', [0.65, 0.65, 0.65], [0, 0.7, 0], '#6bd6ff', { r: [90, 0, 0], flat: true, blend: 'additive' }), points(28, [1, 1.3, 1], '#8aeaff', { size: 0.035, speed: 0.22 })],
  target: () => [p('cylinder', [0.6, 0.12, 0.6], [0, 0.9, 0], '#d8584e', { r: [90, 0, 0] }), p('torus', [0.45, 0.45, 0.45], [0, 0.9, -0.08], '#fff1c2', { r: [90, 0, 0], flat: true }), p('cylinder', [0.08, 1.6, 0.08], [0, 0.8, 0.2], '#5d6570')],
  switch: () => [p('box', [0.5, 0.18, 0.4], [0, 0.09, 0], '#475569'), p('box', [0.08, 0.55, 0.08], [0, 0.38, 0], '#e8b93b', { r: [0, 0, -28] })],
  pressure_plate: () => [p('box', [1.1, 0.1, 1.1], [0, 0.05, 0], '#475569'), p('box', [0.8, 0.04, 0.8], [0, 0.12, 0], '#e8b93b', { opacity: 0.8 })],
  button: () => [p('cylinder', [0.4, 0.16, 0.4], [0, 0.08, 0], '#475569'), p('cylinder', [0.24, 0.22, 0.24], [0, 0.24, 0], '#e65e58')],
  lever: () => [p('box', [0.45, 0.15, 0.35], [0, 0.08, 0], '#475569'), p('cylinder', [0.06, 0.7, 0.06], [0, 0.42, 0], '#e8b93b', { r: [0, 0, -25] })],
  gear: () => [p('torus', [0.75, 0.75, 0.75], [0, 0.2, 0], '#8f9da8', { r: [90, 0, 0], flat: true }), p('cylinder', [0.22, 0.25, 0.22], [0, 0.2, 0], '#d5e0e8', { r: [90, 0, 0] })],
  door: () => [p('box', [1.6, 2.2, 0.16], [0, 1.1, 0], '#6d5546'), p('box', [0.12, 0.12, 0.08], [0.45, 1.1, -0.12], '#e8b93b')],
  moving_platform: () => [p('box', [1.8, 0.18, 1.8], [0, 0.09, 0], '#536d82'), p('torus', [0.75, 0.75, 0.75], [0, 0.2, 0], '#72d5f2', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  spring_pad: () => [p('cylinder', [1, 0.16, 1], [0, 0.08, 0], '#5c83c4'), p('torus', [0.65, 0.65, 0.65], [0, 0.2, 0], '#e8b93b', { r: [90, 0, 0], flat: true })],
  launcher: () => [p('cylinder', [0.55, 0.55, 0.55], [0, 0.3, 0], '#536d82'), p('cone', [0.45, 1, 0.45], [0, 0.82, 0], '#e8b93b', { r: [90, 0, 0] })],
  portal: () => [p('torus', [1.5, 2.4, 1], [0, 1.2, 0], '#65d6f2', { blend: 'additive', opacity: 0.9 }), points(90, [1.2, 2.2, 0.3], '#9cf3ff', { alpha: FX.spark, size: 0.045, speed: 0.35 })],
  teleporter: () => [p('cylinder', [1.2, 0.12, 1.2], [0, 0.06, 0], '#536d82'), p('ring', [1, 1, 1], [0, 0.14, 0], '#65d6f2', { r: [-90, 0, 0], flat: true, blend: 'additive' })],
  mine: () => [p('sphere', [0.35, 0.35, 0.35], [0, 0.35, 0], '#4b5563'), p('cone', [0.12, 0.32, 0.12], [0.18, 0.62, 0], '#e65e58')],
  beacon: () => [p('cylinder', [0.35, 1.2, 0.35], [0, 0.6, 0], '#536d82'), p('sphere', [0.23, 0.23, 0.23], [0, 1.28, 0], '#8aeaff', { emissive: '#37b9df', emissive_intensity: 1.2 }), points(34, [0.8, 1.8, 0.8], '#8aeaff', { size: 0.035, speed: 0.2 })],
  collectible_card: () => [p('box', [0.7, 1, 0.03], [0, 0.5, 0], '#f4c56b'), p('ring', [0.25, 0.25, 0.25], [0, 0.5, -0.04], '#fff3b0', { r: [0, 0, 0], flat: true, blend: 'additive' })],
  toy_tank: () => [p('box', [1.1, 0.35, 1.4], [0, 0.32, 0], '#5c83c4'), p('box', [0.58, 0.25, 0.62], [0, 0.62, 0], '#476792'), p('cylinder', [0.08, 1.2, 0.08], [0, 0.72, -0.25], '#334155', { r: [90, 0, 0] }), ...[-0.42, 0.42].flatMap(x => [p('cylinder', [0.18, 1.25, 0.18], [x, 0.16, 0], '#334155', { r: [0, 0, 90] })])],
  tank: () => [p('box', [1.8, 0.52, 2.1], [0, 0.45, 0], '#566f65'), p('cylinder', [0.55, 0.42, 0.55], [0, 0.85, 0], '#3f5a4c'), p('cylinder', [0.1, 1.5, 0.1], [0, 1.02, -0.42], '#303b3a', { r: [90, 0, 0] }), ...[-0.72, 0.72].flatMap(x => [p('cylinder', [0.25, 1.9, 0.25], [x, 0.25, 0], '#303b3a', { r: [0, 0, 90] })])],
  car: () => [p('box', [1, 0.42, 1.55], [0, 0.35, 0], '#e65e58'), p('box', [0.72, 0.4, 0.72], [0, 0.72, 0.05], '#79b4d8', { opacity: 0.76 }), ...[-0.38, 0.38].flatMap(x => [p('cylinder', [0.18, 0.14, 0.18], [x, 0.16, -0.5], '#29323b', { r: [90, 0, 0] }), p('cylinder', [0.18, 0.14, 0.18], [x, 0.16, 0.5], '#29323b', { r: [90, 0, 0] })])],
  drone: () => [p('box', [0.65, 0.18, 0.65], [0, 1.2, 0], '#536d82'), ...[[-0.55, 1.2, -0.55], [0.55, 1.2, -0.55], [-0.55, 1.2, 0.55], [0.55, 1.2, 0.55]].map(position => p('cylinder', [0.12, 0.04, 0.12], position, '#e8b93b', { r: [90, 0, 0] }))],
  robot: () => [p('box', [0.62, 0.8, 0.45], [0, 0.7, 0], '#6e9af3'), p('sphere', [0.45, 0.38, 0.4], [0, 1.35, 0], '#a8d5e5'), ...[-0.25, 0.25].flatMap(x => [p('box', [0.14, 0.62, 0.14], [x, 0.18, 0], '#536d82')])],
  turret: () => [p('cylinder', [0.65, 0.22, 0.65], [0, 0.12, 0], '#536d82'), p('cylinder', [0.42, 0.45, 0.42], [0, 0.45, 0], '#6e9af3'), p('cylinder', [0.1, 0.9, 0.1], [0, 0.72, -0.35], '#334155', { r: [90, 0, 0] })],
  cannon: () => [p('box', [0.8, 0.35, 0.65], [0, 0.32, 0], '#536d82'), p('cylinder', [0.16, 1.1, 0.16], [0, 0.7, -0.38], '#334155', { r: [90, 0, 0] })],
  ball: () => [p('sphere', [0.45, 0.45, 0.45], [0, 0.45, 0], '#e65e58', { roughness: 0.48 })],
  cube_toy: () => [p('box', [0.62, 0.62, 0.62], [0, 0.31, 0], '#e8b93b'), p('sphere', [0.14, 0.14, 0.14], [0, 0.31, -0.33], '#fff3b0')],
  windup_toy: () => [p('box', [0.5, 0.65, 0.5], [0, 0.34, 0], '#6e9af3'), p('cylinder', [0.25, 0.08, 0.25], [0, 0.35, 0.3], '#e8b93b', { r: [90, 0, 0] })],
  balloon: () => [p('sphere', [0.55, 0.72, 0.55], [0, 1.4, 0], '#e65e58', { blend: 'additive', opacity: 0.82 }), p('cylinder', [0.02, 0.8, 0.02], [0, 0.75, 0], '#64748b')],
  flying_saucer: () => [p('sphere', [1, 0.25, 1], [0, 1.4, 0], '#94a3b8', { opacity: 0.85, metalness: 0.5 }), p('ring', [0.9, 0.9, 0.9], [0, 1.35, 0], '#65d6f2', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  boat: () => [p('box', [1.6, 0.3, 2.2], [0, 0.2, 0], '#946342'), p('cone', [0.8, 1.6, 0.08], [0, 1, 0], '#e8b93b', { r: [90, 0, 0] })],
  glider: () => [p('box', [0.2, 0.2, 1.8], [0, 1.5, 0], '#536d82'), p('plane', [2.3, 0.05, 0.75], [0, 1.5, 0], '#6e9af3', { r: [0, 0, 0], opacity: 0.8 })],
  particle_emitter: () => [p('cylinder', [0.28, 0.45, 0.28], [0, 0.22, 0], '#536d82'), points(140, [1.3, 1.8, 1.3], '#ffd36a', { size: 0.045, speed: 0.3 })],
  spark_burst: () => [points(180, [1.2, 1.2, 1.2], '#fff2a6', { alpha: FX.spark, size: 0.065, speed: 0.65, drift: 0.25 }), glowPlane('#ffb03a', [1.3, 1.3, 1])],
  firefly_swarm: () => [points(140, [2.4, 1.6, 2.4], '#ffe28a', { size: 0.06, speed: 0.12, drift: 0.5 })],
  flyby_motes: () => [points(160, [3.2, 1.8, 2.2], '#bdf4ff', { size: 0.045, speed: 0.45, drift: 0.7 })],
  bird_flock: () => [points(38, [4, 2, 4], '#536d82', { alpha: FX.mote, size: 0.07, speed: 0.32, drift: 0.45 })],
  falling_leaves: () => [points(100, [3, 2.6, 3], '#d8894d', { alpha: FX.petal, size: 0.08, speed: 0.18, drift: 0.35 })],
  petals: () => [points(100, [3, 2, 3], '#f4a8bb', { alpha: FX.petal, size: 0.075, speed: 0.2, drift: 0.35 })],
  snow_particles: () => [points(180, [4, 3, 4], '#e8f8ff', { alpha: FX.mote, size: 0.06, speed: 0.1, drift: 0.25 })],
  rain: () => [points(260, [4, 3, 4], '#8bd8f2', { alpha: FX.mote, size: 0.035, speed: 0.8, drift: 0.08, opacity: 0.55 })],
  dust: () => [points(120, [2, 1.5, 2], '#d8c09a', { alpha: FX.mote, size: 0.04, speed: 0.13, drift: 0.18, opacity: 0.45 })],
  smoke: () => [points(130, [1.6, 1.8, 1.6], '#bec7d2', { alpha: FX.smoke, size: 0.12, speed: 0.12, drift: 0.2, opacity: 0.36 })],
  steam: () => [points(110, [1, 2.2, 1], '#e9f3f4', { alpha: FX.smoke, size: 0.1, speed: 0.2, drift: 0.18, opacity: 0.42 })],
  fire: () => [points(130, [1, 1.6, 1], '#ff9a3d', { alpha: FX.flare, size: 0.11, speed: 0.35, drift: 0.12 }), glowPlane('#ff8b2c', [1.2, 1.5, 1], FX.glow, [0, 0, 0])],
  magic_trail: () => [points(120, [2, 1, 2], '#9cf3ff', { alpha: FX.spark, size: 0.05, speed: 0.5, drift: 0.5 }), p('torus', [0.8, 0.8, 0.8], [0, 0.6, 0], '#65d6f2', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  vortex: () => [p('torus', [1.2, 1.2, 1.2], [0, 0.8, 0], '#65d6f2', { r: [90, 0, 0], flat: true, blend: 'additive' }), points(120, [1.5, 1.5, 1.5], '#bdf4ff', { alpha: FX.spark, size: 0.04, speed: 0.5 })],
  floating_orbs: () => [points(45, [2, 2, 2], '#ffe28a', { alpha: FX.glow, size: 0.11, speed: 0.15, drift: 0.35 })],
  shockwave: () => [p('ring', [1.2, 1.2, 1.2], [0, 0.04, 0], '#65d6f2', { r: [-90, 0, 0], flat: true, blend: 'additive', alpha: FX.ring })],
  confetti: () => [points(150, [2, 2, 2], '#f4a8bb', { alpha: FX.petal, size: 0.08, speed: 0.35, drift: 0.6 })],
  tap_target: () => [p('box', [0.85, 0.12, 0.25], [0, 0.75, 0], '#f97316', { opacity: 0.32 }), p('ring', [0.42, 0.42, 0.42], [0, 0.75, 0], '#f97316', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  gaze_target: () => [p('sphere', [0.4, 0.4, 0.4], [0, 1.2, 0], '#8aeaff', { blend: 'additive', opacity: 0.7 }), points(24, [0.8, 0.8, 0.8], '#8aeaff', { size: 0.035, speed: 0.14 })],
  hold_target: () => [p('box', [0.9, 0.16, 0.9], [0, 0.08, 0], '#f97316', { opacity: 0.45 }), p('ring', [0.62, 0.62, 0.62], [0, 0.18, 0], '#ffb26b', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  drag_handle: () => [p('sphere', [0.34, 0.34, 0.34], [0, 0.8, 0], '#8a6bc2', { blend: 'additive' }), p('torus', [0.55, 0.55, 0.55], [0, 0.8, 0], '#d6c5ff', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  pickup_object: () => [p('sphere', [0.34, 0.34, 0.34], [0, 0.45, 0], '#f4c56b')],
  throwable: () => [p('sphere', [0.5, 0.5, 0.5], [0, 0.5, 0], '#e65e58')],
  link_beam: () => [p('cylinder', [0.05, 1.8, 0.05], [0, 0.9, 0], '#65d6f2', { blend: 'additive', opacity: 0.65 })],
  sound_source: () => [p('sphere', [0.2, 0.2, 0.2], [0, 0.8, 0], '#8a6bc2', { blend: 'additive' }), p('torus', [0.5, 0.5, 0.5], [0, 0.8, 0], '#d6c5ff', { r: [90, 0, 0], flat: true, blend: 'additive', opacity: 0.6 })],
  display_panel: () => [p('box', [1.4, 0.8, 0.08], [0, 0.8, 0], '#273746'), p('plane', [1.24, 0.64, 1], [0, 0.8, -0.05], '#8aeaff', { alpha: 'demo:holo', blend: 'additive', opacity: 0.7 })],
  timer: () => [p('box', [1, 0.5, 0.06], [0, 0.8, 0], '#273746'), p('plane', [0.85, 0.35, 1], [0, 0.8, -0.05], '#ffb26b', { alpha: 'demo:holo', blend: 'additive', opacity: 0.8 })],
  trigger_zone: () => [p('box', [2, 1.5, 2], [0, 0.75, 0], '#f97316', { opacity: 0.08, blend: 'additive' }), p('box', [2, 0.02, 2], [0, 0.01, 0], '#f97316', { opacity: 0.55, blend: 'additive' })],
  spawn_point: () => [p('ring', [0.35, 0.35, 0.35], [0, 0.03, 0], '#72d572', { r: [-90, 0, 0], flat: true, blend: 'additive' })],
  camera_rig: () => [p('box', [0.3, 0.3, 0.3], [0, 1.2, 0], '#64748b'), p('torus', [0.5, 0.5, 0.5], [0, 1.2, 0], '#94a3b8', { r: [90, 0, 0], flat: true })],
  spline_path: () => [p('torus', [1.6, 1.6, 1.6], [0, 0.02, 0], '#64748b', { r: [-90, 0, 0], flat: true, opacity: 0.35 })],
  animation_driver: () => [p('box', [0.3, 0.3, 0.3], [0, 0.3, 0], '#64748b', { opacity: 0.8 })],
  ground_marker: () => [p('ring', [0.55, 0.55, 0.55], [0, 0.03, 0], '#64748b', { r: [-90, 0, 0], flat: true, blend: 'additive' })],
  wall_anchor: () => [p('sphere', [0.18, 0.18, 0.18], [0, 1, 0], '#64748b', { blend: 'additive' })],
  snap_point: () => [p('octa', [0.18, 0.18, 0.18], [0, 0.2, 0], '#64748b', { blend: 'additive' })],
  waypoint: () => [p('sphere', [0.2, 0.2, 0.2], [0, 0.2, 0], '#72d572', { blend: 'additive' })],
  checkpoint_marker: () => [p('cylinder', [0.35, 0.9, 0.35], [0, 0.45, 0], '#72d572', { opacity: 0.55 }), p('ring', [0.6, 0.6, 0.6], [0, 0.95, 0], '#72d572', { r: [90, 0, 0], flat: true, blend: 'additive' })],
  boundary_volume: () => [p('box', [3, 2, 3], [0, 1, 0], '#dc2626', { opacity: 0.06, blend: 'additive' }), p('box', [3, 0.02, 3], [0, 0.02, 0], '#dc2626', { opacity: 0.45, blend: 'additive' })],
  nav_surface: () => [p('plane', [3, 3, 1], [0, 0.02, 0], '#72d572', { r: [-90, 0, 0], opacity: 0.16, blend: 'additive' })],
  occluder: () => [p('box', [2, 2, 0.1], [0, 1, 0], '#64748b', { opacity: 0.16 })],
  light_probe: () => [p('sphere', [0.18, 0.18, 0.18], [0, 1, 0], '#f4c56b', { blend: 'additive' })],
  measurement_ruler: () => [p('box', [1, 0.02, 0.02], [0, 0.1, 0], '#64748b', { opacity: 0.8 })],
  camera_spawn: () => [p('cone', [0.3, 0.45, 0.3], [0, 0.25, 0], '#2563eb', { r: [0, 180, 0], opacity: 0.7 })],
  reset_zone: () => [p('box', [2, 1, 2], [0, 0.5, 0], '#dc2626', { opacity: 0.06, blend: 'additive' }), p('ring', [0.8, 0.8, 0.8], [0, 0.03, 0], '#dc2626', { r: [-90, 0, 0], flat: true, blend: 'additive' })]
}

function partsFor(item) {
  const recipe = RECIPES[item.render?.preset]
  const parts = recipe ? recipe() : genericParts(item)
  return parts.map(part => ({ ...part, p: vec(part.p, [0, 0, 0]), r: vec(part.r, [0, 0, 0]), s: vec(part.s, [1, 1, 1]) }))
}

function defaultProfile(item) {
  return item.interactionProfiles?.find(profile => profile !== 'static' && profile !== 'helper') || item.interactionProfiles?.[0] || 'static'
}

function hitboxFor(item) {
  const size = vec(item.default?.sizeMeters, [1, 1, 1])
  const type = item.default?.collider === 'sphere' ? 'sphere' : item.default?.collider === 'none' ? 'none' : 'box'
  return { type, size, center: [0, size[1] * 0.5, 0] }
}

export function getElement(elementId) {
  return catalogById.get(elementId) || null
}

export function recentElementIds() {
  try {
    const recent = JSON.parse(localStorage.getItem('xiyou.element.recent') || '[]')
    return Array.isArray(recent) ? recent.filter(id => catalogById.has(id)) : []
  } catch {
    return []
  }
}

export function listElements({ query = '', categoryId = '', interactiveOnly = false, profile = '' } = {}) {
  const needle = String(query || '').trim().toLowerCase()
  return ELEMENT_CATALOG.filter(item => {
    if (categoryId && item.categoryId !== categoryId) return false
    if (interactiveOnly && !item.interactionProfiles.some(itemProfile => !['static', 'helper'].includes(itemProfile))) return false
    if (profile && !item.interactionProfiles.includes(profile)) return false
    if (!needle) return true
    const haystack = [item.id, item.name, item.render?.preset, item.voice?.token, ...(item.tags || []), ...(item.voice?.aliases || [])].join(' ').toLowerCase()
    return haystack.includes(needle)
  })
}

export function normalizeVoiceText(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s，。、“”‘’'"：:；;！!？?、/\\_-]+/g, '')
}

export function resolveElementVoice(value) {
  const raw = String(value || '').trim()
  if (!raw) return { status: 'none', candidates: [] }
  const exactToken = ELEMENT_CATALOG.find(item => item.voice?.token === raw || item.id === raw)
  if (exactToken) return { status: 'exact', element: exactToken, candidates: [exactToken] }
  const needle = normalizeVoiceText(raw)
  const exact = ELEMENT_CATALOG.filter(item => [item.name, ...(item.voice?.aliases || [])].some(alias => normalizeVoiceText(alias) === needle))
  if (exact.length === 1) return { status: 'exact', element: exact[0], candidates: exact }
  if (exact.length > 1) return { status: 'ambiguous', candidates: exact }
  const partial = ELEMENT_CATALOG.filter(item => [item.name, ...(item.tags || []), ...(item.voice?.aliases || [])].some(alias => normalizeVoiceText(alias).includes(needle) || needle.includes(normalizeVoiceText(alias))))
  if (partial.length === 1) return { status: 'fuzzy', element: partial[0], candidates: partial }
  return { status: partial.length ? 'ambiguous' : 'none', candidates: partial.slice(0, 8) }
}

function elementMentions(text) {
  const raw = String(text || '').trim()
  const normalized = normalizeVoiceText(raw)
  if (!normalized) return []
  const matches = []
  ELEMENT_CATALOG.forEach(item => {
    const aliases = [item.name, ...(item.tags || []), ...(item.voice?.aliases || [])]
    const hit = aliases
      .map(alias => ({ alias, value: normalizeVoiceText(alias) }))
      .filter(entry => entry.value.length >= 2 && normalized.includes(entry.value))
      .sort((a, b) => b.value.length - a.value.length)[0]
    if (hit) matches.push({ item, alias: hit.alias, score: hit.value.length })
  })
  return matches.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
}

function objectMentions(text, objects = store.scene?.objects || []) {
  const matches = elementMentions(text)
  const ids = new Set(matches.map(match => match.item.id))
  const normalized = normalizeVoiceText(text)
  return objects.filter(object => {
    if (object.element_id && ids.has(object.element_id)) return true
    const name = normalizeVoiceText(object.name || '')
    return name.length >= 2 && normalized.includes(name)
  })
}

export function resolveVoiceCommand(text, { objects = store.scene?.objects || [], selectedIds = store.selected?.() || [] } = {}) {
  const raw = String(text || '').trim()
  const addIntent = /(添加|加一个|加个|放一个|放个|创建|生成|摆放|放置|来一个|来个)/.test(raw)
  const mentions = elementMentions(raw)
  const elementCandidates = [...new Map(mentions.map(match => [match.item.id, match.item])).values()].slice(0, 8)
  if (addIntent) {
    if (elementCandidates.length === 1) return { intent: 'add_element', status: 'exact', element: elementCandidates[0], candidates: elementCandidates }
    return { intent: 'add_element', status: elementCandidates.length ? 'ambiguous' : 'none', candidates: elementCandidates }
  }
  const instanceCandidates = objectMentions(raw, objects)
  const selected = instanceCandidates.filter(object => selectedIds.includes(object.id))
  if (selected.length === 1) return { intent: 'update_instance', status: 'exact', object: selected[0], candidates: instanceCandidates }
  if (instanceCandidates.length === 1) return { intent: 'update_instance', status: 'exact', object: instanceCandidates[0], candidates: instanceCandidates }
  return { intent: 'update_instance', status: instanceCandidates.length ? 'ambiguous' : 'none', candidates: instanceCandidates }
}

export function voiceInstanceCandidates(query, objects = store.scene?.objects || []) {
  return objectMentions(query, objects).map((object, index) => ({
    object_id: object.id,
    element_id: object.element_id || '',
    voice_token: object.voice_token || '',
    name: object.name || object.id,
    index: index + 1,
    position: object.transform?.p || [0, 0, 0]
  }))
}

export function elementVoiceSummary({ query = '', limit = 124 } = {}) {
  return listElements({ query }).slice(0, limit).map(item => `${item.voice?.token || item.id}|${item.name}|${(item.voice?.aliases || []).slice(0, 5).join(',')}|${item.interactionProfiles.join(',')}`).join('\n')
}

export function elementObjectProps(elementId, overrides = {}) {
  const item = getElement(elementId)
  if (!item) throw new Error(`固定元素不存在：${elementId}`)
  const kind = item.render?.kind
  const type = kind === 'quad' ? 'quad' : kind === 'model' ? 'glb' : 'compound'
  const profile = overrides.interaction?.profile || defaultProfile(item)
  const props = {
    ...(overrides.id ? { id: overrides.id } : {}),
    type,
    name: overrides.name || item.name,
    element_id: item.id,
    element_version: '0.1.0',
    voice_token: item.voice?.token || `xj.element.${item.id}`,
    element_category: item.categoryId,
    render_preset: item.render?.preset || item.id,
    parts: partsFor(item),
    transform: {
      p: vec(overrides.transform?.p, [0, 0, -3]),
      r: vec(overrides.transform?.r, [0, 0, 0]),
      s: vec(overrides.transform?.s, [1, 1, 1])
    },
    material: clone(overrides.material || {}),
    hitbox: clone(overrides.hitbox || hitboxFor(item)),
    interaction: {
      enabled: overrides.interaction?.enabled !== false,
      profile,
      profiles: clone(item.interactionProfiles || []),
      state: overrides.interaction?.state || 'default',
      cooldown: Number.isFinite(Number(overrides.interaction?.cooldown)) ? Number(overrides.interaction.cooldown) : 0.3,
      params: clone(overrides.interaction?.params || {})
    },
    visibleInRuntime: item.default?.visibleInRuntime !== false,
    zone_id: overrides.zone_id || '',
    node_id: '',
    asset: ''
  }
  return { ...props, ...clone(overrides), type, element_id: item.id, parts: partsFor(item), interaction: props.interaction, transform: props.transform }
}

function placementPoint(point, item) {
  const result = vec(point, [0, 0, -3])
  if (item?.default?.placement === 'floating') result[1] = Math.max(result[1], 1.2)
  if (item?.default?.placement === 'volume') result[1] = Math.max(result[1], 1)
  return result
}

function defaultTrigger(object, item) {
  const profile = object.interaction?.profile
  const trigger = {
    id: `trigger_${object.id}`,
    name: `${object.name}互动`,
    target: object.id,
    when: 'tap',
    params: {},
    do: []
  }

  if (item.interactionProfiles?.includes('collectible')) {
    trigger.name = `${object.name}收集`
    trigger.do.push({ action: 'collect', args: { targetId: object.id, score: 1 } })
  } else if (item.interactionProfiles?.includes('openable')) {
    trigger.name = `${object.name}开合`
    trigger.do.push({ action: 'set_state', args: { targetId: object.id, state: 'toggle' } }, { action: 'highlight', args: { targetId: object.id } })
  } else if (item.interactionProfiles?.includes('switchable')) {
    trigger.name = `${object.name}开关`
    trigger.do.push({ action: 'set_state', args: { targetId: object.id, state: 'toggle' } }, { action: 'highlight', args: { targetId: object.id } })
  } else if (item.interactionProfiles?.includes('vehicle')) {
    trigger.name = `${object.name}启动`
    trigger.do.push({ action: 'set_state', args: { targetId: object.id, state: 'active' } }, { action: 'highlight', args: { targetId: object.id } })
  } else if (item.interactionProfiles?.includes('particle_emitter')) {
    trigger.name = `${object.name}发射`
    trigger.do.push({ action: 'emit_particles', args: { targetId: object.id, duration: 1.2 } })
  } else {
    const supported = new Set(['tap_feedback', 'gaze_feedback', 'hold_feedback'])
    if (!supported.has(profile)) return null
    trigger.when = profile.replace('_feedback', '')
    trigger.name = `${object.name}${trigger.when === 'tap' ? '点击' : trigger.when === 'gaze' ? '注视' : '按住'}反馈`
    trigger.params = trigger.when === 'gaze' || trigger.when === 'hold' ? { secs: 1 } : {}
    trigger.do.push({ action: 'highlight', args: { targetId: object.id } })
  }
  return trigger
}

export function addElementInstance(elementId, point, overrides = {}) {
  const item = getElement(elementId)
  if (!item) {
    log(`固定元素不存在：${elementId}`, 'error')
    return null
  }
  const position = placementPoint(point, item)
  const invalid = viewport.positionViolatesZones?.(position, overrides.zone_id || '')
  if (invalid) {
    log(`无法添加「${item.name}」：位置受「${invalid.name || invalid.id}」限制`, 'warn')
    return null
  }
  const props = elementObjectProps(item.id, {
    ...overrides,
    transform: { ...(overrides.transform || {}), p: position }
  })
  let object = null
  store.batch(() => {
    object = store.addObject(props.type, props)
    const trigger = defaultTrigger(object, item)
    if (trigger) store.addTrigger(trigger)
  })
  store.select(object.id)
  try {
    const recent = JSON.parse(localStorage.getItem('xiyou.element.recent') || '[]').filter(id => id !== item.id)
    recent.unshift(item.id)
    localStorage.setItem('xiyou.element.recent', JSON.stringify(recent.slice(0, 12)))
  } catch {}
  log(`已添加固定元素「${item.name}」`)
  return object
}

export function categoryLabel(categoryId) {
  return categoryById.get(categoryId)?.name || categoryId
}

export { ELEMENT_CATALOG, ELEMENT_CATEGORIES }
