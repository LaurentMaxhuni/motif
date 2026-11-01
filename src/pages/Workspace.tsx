import { useState } from 'react'
import { Download, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import CreationCard from '@/components/creation-card'
import { useWorkspace } from '@/lib/workspace'
import { statuses } from '@/lib/types'
import { download,slug } from '@/lib/api'

export default function Workspace(){
  const {contents,brand,navigate}=useWorkspace(),[query,setQuery]=useState(''),[filter,setFilter]=useState('All')
  const items=contents.filter(c=>(filter==='All'||c.status===filter)&&`${c.title} ${c.headline} ${c.body}`.toLowerCase().includes(query.toLowerCase()))
  function csv(){const safe=(value:unknown)=>{let s=String(value||'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};download(slug(brand?.name||'motif')+'-content.csv','\ufeff'+[['Title','Type','Channel','Status','Scheduled at','Headline','Body','CTA','Source'],...contents.map(c=>[c.title,c.kind,c.channel,c.status,c.scheduledAt,c.headline,c.body,c.cta,c.source])].map(row=>row.map(safe).join(',')).join('\r\n'),'text/csv;charset=utf-8')}
  return <div className="space-y-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Workspace</h1><p className="mt-2 text-muted-foreground">Review, refine, and approve your next creation.</p></div><div className="flex gap-2"><Button variant="outline" onClick={csv}><Download/> Export CSV</Button><Button onClick={()=>navigate('studio')}><Plus/> Create</Button></div></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[['Creations',contents.length],['To review',contents.filter(c=>c.status==='Draft').length],['Approved',contents.filter(c=>c.status==='Approved').length],['On the calendar',contents.filter(c=>['Scheduled','Ready'].includes(c.status)).length]].map(([label,n])=><Card key={label} className="shadow-none"><CardContent><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{n}</p></CardContent></Card>)}</div><div className="flex flex-wrap items-center justify-between gap-4"><ToggleGroup type="single" value={filter} onValueChange={value=>{if(value)setFilter(value)}} aria-label="Content status filter" className="max-w-full flex-wrap justify-start">{['All',...statuses].map(s=><ToggleGroupItem key={s} value={s}>{s}</ToggleGroupItem>)}</ToggleGroup><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input type="search" aria-label="Search creations" placeholder="Find a creation…" className="pl-9" value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map(c=><CreationCard key={c.id} item={c}/>)}</div>{!items.length&&<Card className="p-12 text-center shadow-none"><h2 className="font-medium">No creations found</h2><p className="mt-2 text-sm text-muted-foreground">Try another filter or create something in Studio.</p></Card>}</div>
}
