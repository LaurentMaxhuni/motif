import { createRoot, hydrateRoot } from 'react-dom/client'
import Marketing from './marketing/Marketing'
import './index.css'

const root = document.getElementById('root')!
if (/^\/app\/?$/.test(location.pathname)) {
  const { default: App } = await import('./App')
  createRoot(root).render(<App />)
} else {
  const page = <Marketing privacy={/^\/privacy\/?$/.test(location.pathname)} />
  if (root.hasChildNodes()) hydrateRoot(root, page)
  else createRoot(root).render(page)
}
