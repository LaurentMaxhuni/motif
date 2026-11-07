import { renderToString } from 'react-dom/server'
import Marketing from './Marketing'
export function render(privacy: boolean) { return renderToString(<Marketing privacy={privacy} />) }
