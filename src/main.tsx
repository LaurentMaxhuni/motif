import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'

const root = document.getElementById('root')!
if (/^\/app\/?$/.test(location.pathname)) {
  const { default: App } = await import('./App')
  createRoot(root).render(<App />)
} else {
  const { default: Marketing } = await import('./marketing/Marketing')
  const page = <Marketing privacy={/^\/privacy\/?$/.test(location.pathname)} />
  if (root.hasChildNodes()) hydrateRoot(root, page)
  else createRoot(root).render(page)
}
