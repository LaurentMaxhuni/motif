import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWorkspace } from '@/lib/workspace'
import type { Content } from '@/lib/types'
import { CreativePreview } from './creative-preview'

export function CreationCard({item}:{item:Content}) {
  const {brand,edit}=useWorkspace()
  return <Card className="content-card gap-0 overflow-hidden py-0 shadow-none" data-testid="content-card">
    <Button variant="ghost" className="preview-button h-auto w-full rounded-none p-0 has-[>svg]:px-0 hover:opacity-90" onClick={()=>edit(item)} aria-label={`Edit ${item.title}`}><CreativePreview item={item} brand={brand}/></Button>
    <CardContent className="space-y-3 p-4"><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{item.channel} · {item.kind}</span><Badge variant={item.status==='Approved'?'default':'secondary'}>{item.status}</Badge></div><Button variant="link" className="h-auto max-w-full justify-start p-0 text-left text-base font-medium whitespace-normal" onClick={()=>edit(item)}>{item.title}</Button><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{item.source?.startsWith('Local AI')?'Local AI':item.source}</span><Button size="icon" variant="ghost" onClick={()=>edit(item)} aria-label={`Open ${item.title}`}><ArrowUpRight className="size-4"/></Button></div></CardContent>
  </Card>
}
export default CreationCard
