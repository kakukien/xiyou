#!/usr/bin/env node
/**
 * 本地 Release JSON 服务器。
 * 仅用于局域网/开发验收，不提供生产鉴权、对象存储或发布权限控制。
 */
import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import { basename, join, resolve } from 'node:path'

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const dir = resolve(arg('dir', './releases'))
const host = arg('host', '0.0.0.0')
const port = Number(arg('port', '8790')) || 8790

function json(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  })
  res.end(JSON.stringify(value))
}

function safeId(value) {
  const id = basename(String(value || '')).replace(/\.json$/i, '')
  return /^[a-zA-Z0-9._-]+$/.test(id) ? id : ''
}

async function readBody(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true, service: 'xiyou-release-server', dir, readOnly: false })
  }

  if (req.method === 'GET' && url.pathname === '/') {
    const names = (await fs.readdir(dir).catch(() => []))
      .filter(name => name.endsWith('.json'))
      .sort()
    return json(res, 200, { ok: true, releases: names.map(name => `/release/${name}`) })
  }

  const match = url.pathname.match(/^\/release\/([^/]+\.json)$/)
  if (!match) return json(res, 404, { error: 'not_found' })
  const id = safeId(match[1])
  if (!id) return json(res, 400, { error: 'invalid_release_id' })
  const file = join(dir, `${id}.json`)

  if (req.method === 'GET') {
    try {
      const content = await fs.readFile(file, 'utf8')
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' })
      return res.end(content)
    } catch {
      return json(res, 404, { error: 'release_not_found', id })
    }
  }

  if (req.method === 'POST') {
    try {
      const raw = await readBody(req)
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') throw new Error('JSON root must be an object')
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')
      return json(res, 201, { ok: true, id, url: `/release/${id}.json` })
    } catch (error) {
      return json(res, 400, { error: error?.message || 'invalid_json' })
    }
  }

  return json(res, 405, { error: 'method_not_allowed' })
})

await fs.mkdir(dir, { recursive: true })
server.listen(port, host, () => {
  console.log(`xiyou release server listening on http://${host}:${port}`)
  console.log(`release directory: ${dir}`)
})
