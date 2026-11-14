// Preview the built site: node site/build.mjs && node site/serve.mjs  (http://127.0.0.1:4173)
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), 'dist')
const port = Number(process.env.PORT) || 4173
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' }

createServer(async (request, response) => {
  let path = decodeURIComponent(new URL(request.url, 'http://x').pathname)
  if (path.endsWith('/')) path += 'index.html'
  const file = normalize(join(root, path))
  if (!file.startsWith(root)) { response.writeHead(403).end(); return }
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }).end(body)
  } catch {
    response.writeHead(404, { 'content-type': types['.html'] }).end(await readFile(join(root, '404.html')))
  }
}).listen(port, '127.0.0.1', () => console.log(`Motif site at http://127.0.0.1:${port}`))
