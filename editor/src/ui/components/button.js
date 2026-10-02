import { icon } from './icon.js'

export function button({ label = '', iconName = '', variant = 'secondary', size = 'md', type = 'button', title = '', disabled = false } = {}) {
  const element = document.createElement('button')
  element.type = type
  element.className = `btn btn-${variant} btn-${size}`
  element.disabled = Boolean(disabled)
  if (title) {
    element.title = title
    element.setAttribute('aria-label', title)
  } else if (label) {
    element.setAttribute('aria-label', label)
  }

  if (iconName) element.appendChild(icon(iconName, title || label))
  if (label) {
    const text = document.createElement('span')
    text.textContent = label
    element.appendChild(text)
  }
  return element
}
