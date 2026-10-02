import { icon } from './icon.js'

export function emptyState({ iconName = 'inbox-line', title = '暂无内容', description = '', actionLabel = '', onAction } = {}) {
  const element = document.createElement('div')
  element.className = 'empty-state-component'

  const iconElement = icon(iconName)
  iconElement.classList.add('empty-state-icon')
  element.appendChild(iconElement)

  const titleElement = document.createElement('div')
  titleElement.className = 'empty-state-title'
  titleElement.textContent = title
  element.appendChild(titleElement)

  if (description) {
    const descriptionElement = document.createElement('div')
    descriptionElement.className = 'empty-state-description'
    descriptionElement.textContent = description
    element.appendChild(descriptionElement)
  }

  if (actionLabel && typeof onAction === 'function') {
    const action = document.createElement('button')
    action.type = 'button'
    action.className = 'btn btn-secondary btn-md'
    action.textContent = actionLabel
    action.addEventListener('click', onAction)
    element.appendChild(action)
  }

  return element
}
