// Builds the static Motif marketing site into site/dist.
// Usage: node site/build.mjs
// Each file in site/pages starts with <!--page {"title": "...", "description": "...", "nav": "..."}-->
// and is wrapped in site/partials/layout.html. No dependencies.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, 'dist')
const read = file => readFileSync(join(here, file), 'utf8')

const layout = read('partials/layout.html')
const header = read('partials/header.html')
const footer = read('partials/footer.html')
const sprite = read('partials/icons.svg')

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })
cpSync(join(here, 'assets'), join(dist, 'assets'), { recursive: true })
cpSync(join(here, 'favicon.svg'), join(dist, 'favicon.svg'))

const pages = readdirSync(join(here, 'pages')).filter(name => name.endsWith('.html'))
for (const name of pages) {
  const source = read(join('pages', name))
  const match = source.match(/^<!--page (\{.*?\})-->\s*/s)
  if (!match) throw new Error(`${name}: missing <!--page {...}--> header`)
  const meta = JSON.parse(match[1])
  const content = source.slice(match[0].length)
  const nav = header.replace(/\{\{current:(\w+)\}\}/g, (_, key) => (key === meta.nav ? ' aria-current="page"' : ''))
  const html = layout
    .replaceAll('{{title}}', meta.title)
    .replaceAll('{{description}}', meta.description)
    .replace('{{sprite}}', () => sprite)
    .replace('{{header}}', () => nav)
    .replace('{{content}}', () => content)
    .replace('{{footer}}', () => footer)
  writeFileSync(join(dist, name), html)
  console.log(`built ${name}`)
}
