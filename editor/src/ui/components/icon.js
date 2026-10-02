const ICON_NAME_RE = /^[a-z0-9-]+$/

export function iconMarkup(name, label = '') {
  const safeName = ICON_NAME_RE.test(String(name || '')) ? String(name) : 'question-line'
  const safeLabel = String(label || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

  return `<i class="ri-${safeName}" aria-hidden="${safeLabel ? 'true' : 'false'}"${safeLabel ? ` title="${safeLabel}"` : ''}></i>`
}

export function icon(name, label = '') {
  const element = document.createElement('i')
  element.className = `ri-${ICON_NAME_RE.test(String(name || '')) ? name : 'question-line'}`
  element.setAttribute('aria-hidden', label ? 'true' : 'false')
  if (label) {
    element.setAttribute('aria-label', label)
    element.title = label
  }
  return element
}
