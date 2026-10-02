import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd(), '..')
const source = path.join(root, 'docs/sidebar-element-asset-table.json')
const target = path.join(process.cwd(), 'src/core/element-catalog.js')
const catalog = JSON.parse(fs.readFileSync(source, 'utf8'))
const items = catalog.categories.flatMap(category => category.items.map(item => ({
  ...item,
  categoryId: category.id,
  categoryName: category.name
})))
const output = `// Generated from docs/sidebar-element-asset-table.json. Run: npm run elements:generate\nexport const ELEMENT_CATALOG = ${JSON.stringify(items, null, 2)}\n\nexport const ELEMENT_CATEGORIES = ${JSON.stringify(catalog.categories.map(category => ({ id: category.id, name: category.name, description: category.description })), null, 2)}\n\nexport const ELEMENT_INTERACTION_PROFILES = ${JSON.stringify(catalog.interactionProfileDefinitions, null, 2)}\n`
fs.writeFileSync(target, output)
console.log(`generated ${catalog.categories.length} categories / ${items.length} elements -> ${target}`)
