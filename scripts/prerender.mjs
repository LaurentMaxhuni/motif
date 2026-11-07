import { build } from 'vite'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// Both public pages remain readable without JavaScript.
await build({ build: { ssr: 'src/marketing/render.tsx', outDir: 'output/marketing-ssr', emptyOutDir: true } })
const { render } = await import(pathToFileURL(resolve('output/marketing-ssr/render.js')).href)
const template = readFileSync('dist/index.html', 'utf8')
for (const [path, title, description, content] of [
  ['', 'Motif — Your local AI creative studio', 'Turn brand briefs into AI-made creatives. An open-source, local-first creative studio. Bring your models, keep your workspace.', render(false)],
  ['privacy', 'Privacy policy — Motif', 'How the local Motif app stores your workspace and handles optional AI providers, website analysis, and social connections.', render(true)],
  ['app', 'Motif — AI creative workspace', 'Your local Motif creative workspace.', ''],
]) {
  const folder = path ? `dist/${path}` : 'dist'
  mkdirSync(folder, { recursive: true })
  const html = template.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}"/>`)
    .replace('<div id="root"></div>', () => `<div id="root">${content}</div>`)
  writeFileSync(`${folder}/index.html`, html)
}
console.log('Prerendered landing and privacy pages; emitted workspace entry.')
