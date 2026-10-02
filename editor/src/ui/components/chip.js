export function statusChip(label, tone = 'neutral') {
  const element = document.createElement('span')
  element.className = `stchip ${tone}`
  element.textContent = label
  return element
}
