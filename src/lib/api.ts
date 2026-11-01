let token = ''
export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api/'+path, { method, headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Motif-Token': token }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed. Try again.')
  if (path === 'state') token = data.token
  return data
}
export function download(name: string, data: BlobPart, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const link = document.createElement('a'); link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
export const slug = (text: string) => text.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,80) || 'motif'
export const localDateTime = (value: string) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
export async function upload(file?: File): Promise<string> {
  if (!file) return ''
  if (file.size > 5_000_000 || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP smaller than 5 MB.')
  return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read image.')); reader.readAsDataURL(file) })
}
