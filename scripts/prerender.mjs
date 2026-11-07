import { build } from 'vite'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// Both public pages remain readable without JavaScript.
await build({ build: { ssr: 'src/marketing/render.tsx', outDir: 'output/marketing-ssr', emptyOutDir: true } })
const { render } = await import(pathToFileURL(resolve('output/marketing-ssr/render.js')).href)
const template = readFileSync('dist/index.html', 'utf8')
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'))
const publicCSS = manifest['src/marketing/Marketing.tsx']?.css || []
const site = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null
if (site && (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash)) throw new Error('SITE_URL must be a public HTTPS origin.')
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
for (const [path, title, description, content] of [
  ['', 'Motif — Your local AI creative studio', 'Turn brand briefs into AI-made creatives. An open-source, local-first creative studio. Bring your models, keep your workspace.', render(false)],
  ['privacy', 'Privacy policy — Motif', 'How the local Motif app stores your workspace and handles optional AI providers, website analysis, and social connections.', render(true)],
  ['app', 'Motif — AI creative workspace', 'Your local Motif creative workspace.', ''],
]) {
  const folder = path ? `dist/${path}` : 'dist'
  mkdirSync(folder, { recursive: true })
  let html = template.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}"/>`)
    .replace('<div id="root"></div>', () => `<div id="root">${content}</div>`)
  if (path !== 'app') {
    html = html.replace('<html lang="en">', '<html lang="en" data-type="software" data-radius="soft" data-buttons="solid" data-motion="on">')
      .replace('</head>', publicCSS.map(file => `<link rel="stylesheet" href="/${file}"/>`).join('') + '<meta name="page-type" content="software"/><meta name="site-kind" content="software"/></head>')
      .replace('content="#f8fafc"', 'content="#171716"')
  }
  const url = site ? new URL(path || '/', site).href : null
  const metadata = `<meta name="robots" content="${path === 'app' || !site ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}"/>`
    + (path === 'app' ? '' : `<meta property="og:type" content="website"/><meta property="og:site_name" content="Motif"/><meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(description)}"/><meta name="twitter:card" content="summary"/><meta name="twitter:title" content="${escape(title)}"/><meta name="twitter:description" content="${escape(description)}"/>`)
    + (url ? `<link rel="canonical" href="${escape(url)}"/><meta property="og:url" content="${escape(url)}"/>` : '')
  const schema = path === '' ? { '@context': 'https://schema.org', '@type': ['SoftwareApplication', 'SoftwareSourceCode'], name: 'Motif', description, applicationCategory: 'DesignApplication', softwareRequirements: 'Node.js 22.13+ and Chrome, Chromium, or Edge', license: 'https://opensource.org/license/mit', codeRepository: 'https://github.com/LaurentMaxhuni/motif', ...(url ? { url } : {}), featureList: ['Brand DNA', '1080 × 1080 creatives', 'PNG and HTML export', 'Configurable AI providers', 'Local workspace storage'] } : null
  html = html.replace('</head>', metadata + (schema ? `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>` : '') + '</head>')
  writeFileSync(`${folder}/index.html`, html)
}
writeFileSync('dist/robots.txt', `User-agent: *\n${site ? 'Allow: /\nDisallow: /api/\n' : 'Disallow: /\n'}${site ? `Sitemap: ${new URL('sitemap.xml', site).href}\n` : ''}`)
writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${site ? ['', 'privacy'].map(path => `<url><loc>${escape(new URL(path || '/', site).href)}</loc></url>`).join('') : ''}</urlset>`)
console.log('Prerendered landing and privacy pages; emitted workspace entry.')
