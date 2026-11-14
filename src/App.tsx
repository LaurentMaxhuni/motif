import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, AudioLines, CalendarDays, ChevronDown, CircleHelp, Command, Fingerprint, FolderClosed, LayoutGrid, Link2, Loader2, MessageSquare, Monitor, Moon, Plus, Settings as SettingsIcon, ShieldCheck, Sun, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FieldSelect, FieldSelectItem } from '@/components/field-select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WorkspaceContext } from '@/lib/workspace'
import { api } from '@/lib/api'
import { useTheme, type Theme } from '@/lib/theme'
import { useGeneration } from '@/hooks/use-generation'
import { GenerationIndicator } from '@/components/generation-indicator'
import type { GenerationJob } from '@/lib/generation'
import type { Content, Page, Snapshot } from '@/lib/types'
const Studio=lazy(()=>import('@/pages/Studio'))
const Workspace=lazy(()=>import('@/pages/Workspace'))
const Calendar=lazy(()=>import('@/pages/Calendar'))
const Brand=lazy(()=>import('@/pages/Brand'))
const Connections=lazy(()=>import('@/pages/Connections'))
const Assistant=lazy(()=>import('@/pages/Assistant'))
const Activity=lazy(()=>import('@/pages/Activity'))
const Settings=lazy(()=>import('@/pages/Settings'))
const Onboarding=lazy(()=>import('@/pages/Onboarding'))
const CreativeEditor=lazy(()=>import('@/components/creative-editor'))

const navigation = [
  {id:'studio',label:'Creative studio',icon:LayoutGrid}, {id:'workspace',label:'Workspace',icon:FolderClosed},
  {id:'calendar',label:'Calendar',icon:CalendarDays}, {id:'brand',label:'Brand DNA',icon:Fingerprint},
  {id:'connections',label:'Connections',icon:Link2}, {id:'chat',label:'Assistant',icon:MessageSquare},
] as const

export default function App() {
  const [data,setData] = useState<Snapshot|null>(null), [error,setError] = useState(''), [page,setPage] = useState<Page>('studio')
  const [brandId,setBrandId] = useState(localStorage.getItem('motif-brand') || ''), [editing,setEditing] = useState<{item:Content;key:number}|null>(null)
  const [onboardingKey,setOnboardingKey]=useState(0),[weekPlanRequested,setWeekPlanRequested]=useState(false)
  const clearWeekPlan=useCallback(()=>setWeekPlanRequested(false),[])
  const editorKey=useRef(0), refreshEpoch=useRef(0), initialized=useRef(false)
  const refresh = useCallback(async() => {
    const epoch=++refreshEpoch.current; const snapshot=await api<Snapshot>('state')
    if (epoch!==refreshEpoch.current) return
    setData(snapshot)
    setBrandId(current => snapshot.brands.some(b=>b.id===current) ? current : snapshot.brands[0]?.id || '')
    if (!initialized.current) { initialized.current=true; if (!snapshot.workspace.onboardingCompleted) setPage('onboarding') }
  }, [])
  useEffect(()=>{void refresh().catch(e=>setError(e.message))},[refresh])
  const brand=data?.brands.find(b=>b.id===brandId)
  const generation=useGeneration(brand?.id,refresh)
  const navigate=(next:Page)=>{setEditing(null);if(next!=='studio')setWeekPlanRequested(false);setPage(next)}
  const selectBrand=(id:string)=>{setEditing(null);setBrandId(id);localStorage.setItem('motif-brand',id)}
  const addBrand=()=>{localStorage.removeItem('motif-onboarding');setOnboardingKey(key=>key+1);navigate('onboarding')}
  if(error)return <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6"><h1 className="text-2xl font-semibold">Couldn’t open your workspace</h1><p className="text-sm text-muted-foreground">{error}</p><Button onClick={()=>location.reload()}>Try again</Button></div>
  if(!data)return <div className="grid min-h-screen grid-cols-[240px_1fr] gap-10 p-8"><Skeleton className="h-full"/><div className="space-y-8"><Skeleton className="h-12 w-64"/><Skeleton className="h-64 w-full"/><div className="grid grid-cols-3 gap-6">{[0,1,2].map(i=><Skeleton key={i} className="h-80"/>)}</div><span className="sr-only" role="status">Loading workspace</span></div></div>
  const contents=data.contents.filter(c=>c.brandId===brand?.id)
  const pages={studio:Studio,workspace:Workspace,calendar:Calendar,brand:Brand,connections:Connections,chat:Assistant,analytics:Activity,settings:Settings,onboarding:Onboarding}
  const CurrentPage=pages[page]
  return <WorkspaceContext.Provider value={{data,brand,contents,refresh,generation,page,navigate,selectBrand,edit:item=>setEditing({item,key:++editorKey.current}),addBrand,weekPlanRequested,clearWeekPlan,planWeek:()=>{setWeekPlanRequested(true);navigate('studio')}}}><TooltipProvider><SidebarProvider><Shell data={data} page={page} brandId={brandId} selectBrand={selectBrand} navigate={navigate} addBrand={addBrand} generationJob={generation.job} draftCount={contents.filter(c=>c.status==='Draft').length}>
    {brand||page==='settings'||page==='onboarding'?<Suspense fallback={<div className="space-y-5" role="status" aria-label="Loading page"><Skeleton className="h-10 w-72"/><Skeleton className="h-80 w-full"/></div>}><CurrentPage key={page==='onboarding'?'onboarding:'+onboardingKey:brandId+page}/></Suspense>:<div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 text-center"><Fingerprint className="size-10 text-muted-foreground"/><h1 className="text-2xl font-semibold">Make it your brand.</h1><p className="max-w-sm text-sm text-muted-foreground">Add your business, then turn your next idea into a finished creative.</p><Button onClick={addBrand}><Plus/>Add your brand</Button></div>}
  </Shell>{editing&&editing.item.brandId===brand?.id&&<Suspense fallback={<div role="status" className="fixed bottom-5 right-5 rounded-md border bg-background px-4 py-3 text-sm shadow">Opening creation…</div>}><CreativeEditor key={editing.key} item={editing.item} onClose={()=>setEditing(null)}/></Suspense>}<Toaster richColors closeButton position="bottom-right"/></SidebarProvider></TooltipProvider></WorkspaceContext.Provider>
}

function Shell({data,page,brandId,selectBrand,navigate,addBrand,generationJob,draftCount,children}:{data:Snapshot;page:Page;brandId:string;selectBrand:(id:string)=>void;navigate:(page:Page)=>void;addBrand:()=>void;generationJob?:GenerationJob|null;draftCount:number;children:React.ReactNode}){
  const {setOpenMobile}=useSidebar(),{theme,setTheme}=useTheme()
  const brand=data.brands.find(b=>b.id===brandId)
  const go=(next:Page)=>{navigate(next);setOpenMobile(false)}
  const firstRun = page === 'onboarding' && !data.brands.length && !data.workspace.onboardingCompleted
  const label=navigation.find(n=>n.id===page)?.label || ({analytics:'Activity',settings:'Settings',onboarding:'Set up your business'} as Record<string,string>)[page]
  return <><a href="#main" className="sr-only fixed left-4 top-4 z-50 rounded-md bg-background p-3 shadow focus:not-sr-only">Skip to content</a>{!firstRun&&<Sidebar variant="sidebar" className="border-r-0"><SidebarHeader className="gap-6 px-5 py-6"><button onClick={()=>go('studio')} className="flex w-fit items-center gap-2.5 text-xl font-semibold tracking-tight" aria-label="Motif home"><span className="grid size-8 place-items-center rounded-lg bg-foreground text-background"><AudioLines className="size-5" strokeWidth={2.5}/></span>motif<span className="ml-0.5 rounded border px-1.5 py-0.5 text-[9px] font-medium tracking-normal text-muted-foreground">LOCAL</span></button><div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background p-2 shadow-xs"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-violet-100 font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-300">{brand?.name[0]||'M'}</span><div className="min-w-0 flex-1"><span className="block px-1 text-[10px] text-muted-foreground">Your brand</span><FieldSelect className="h-6 data-[size=default]:h-6 w-full min-w-0 border-0 bg-transparent px-1 py-0 text-xs font-medium shadow-none" aria-label="Active brand" placeholder="No brand yet" disabled={!data.brands.length} value={brandId} onValueChange={value=>{selectBrand(value);setOpenMobile(false)}}>{!data.brands.length&&<FieldSelectItem value="">No brand yet</FieldSelectItem>}{data.brands.map(b=><FieldSelectItem key={b.id} value={b.id}>{b.name}</FieldSelectItem>)}</FieldSelect></div></div></SidebarHeader><SidebarContent className="px-3"><SidebarGroup className="px-0"><SidebarGroupLabel className="px-3 text-[11px] font-normal text-muted-foreground">Workspace</SidebarGroupLabel><SidebarMenu className="gap-1">{navigation.map(item=><SidebarMenuItem key={item.id}><SidebarMenuButton isActive={page===item.id} onClick={()=>go(item.id)} className="h-10 gap-3 rounded-md px-3 text-[13px] data-[active=true]:bg-background data-[active=true]:font-medium data-[active=true]:shadow-xs"><item.icon className="size-4 text-muted-foreground"/><span>{item.label}</span></SidebarMenuButton>{item.id==='workspace'&&draftCount>0&&<SidebarMenuBadge className="right-3 top-2.5 text-[10px] text-muted-foreground">{draftCount}</SidebarMenuBadge>}</SidebarMenuItem>)}</SidebarMenu></SidebarGroup></SidebarContent><SidebarFooter className="gap-5 px-4 pb-5"><div className="rounded-lg border bg-background p-3.5"><div className="mb-1.5 flex items-center gap-2 text-xs font-medium"><ShieldCheck className="size-3.5 text-violet-500"/>Your private creative space</div><p className="text-[11px] leading-relaxed text-muted-foreground">Your brand, your models, your ideas. Saved on this machine.</p></div><SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive={page==='analytics'} onClick={()=>go('analytics')}><TrendingUp/><span>Activity</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton isActive={page==='settings'} onClick={()=>go('settings')}><SettingsIcon/><span>Settings</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu><Separator/><div className="flex items-center gap-2.5 px-1"><span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-medium">M</span><div className="flex-1 text-xs font-medium">My workspace<span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">Local workspace</span></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7" aria-label="Workspace actions"><ChevronDown className="size-3.5"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={addBrand}><Plus/>Add brand</DropdownMenuItem><DropdownMenuItem onSelect={()=>go('settings')}><SettingsIcon/>Settings & backup</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></SidebarFooter></Sidebar>}<SidebarInset className="min-w-0">{!firstRun&&<header className="flex h-[70px] shrink-0 items-center justify-between gap-3 border-b px-4 md:px-8 lg:px-10"><div className="flex min-w-0 items-center gap-3"><SidebarTrigger className="-ml-1"/><Separator orientation="vertical" className="hidden h-4 sm:block"/><span className="hidden text-xs text-muted-foreground md:inline">Workspace</span><span className="hidden text-muted-foreground/40 md:inline">/</span><span className="truncate text-xs font-medium">{label}</span></div><div className="flex items-center gap-2"><GenerationIndicator job={generationJob} navigate={go}/><span className="mr-2 hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex"><span className="size-1.5 rounded-full bg-emerald-500"/>Saved locally</span><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`Theme: ${theme}. Change appearance`}><Sun className="size-4 dark:hidden"/><Moon className="hidden size-4 dark:block"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Appearance</DropdownMenuLabel><DropdownMenuSeparator/>{(['light','dark','system'] as Theme[]).map(t=><DropdownMenuItem key={t} onSelect={()=>setTheme(t)}>{t==='light'?<Sun/>:t==='dark'?<Moon/>:<Monitor/>}{t[0].toUpperCase()+t.slice(1)}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu><Button variant="outline" size="sm" onClick={addBrand}><Plus className="size-3.5"/><span className="hidden sm:inline">Add brand</span><span className="sm:hidden">Brand</span></Button></div></header>}<main id="main" tabIndex={-1} className={firstRun ? "w-full flex-1 outline-none" : "mx-auto w-full max-w-[1600px] flex-1 px-4 py-7 outline-none md:px-8 md:py-9 lg:px-10"}>{children}</main>{!firstRun&&<footer className="flex justify-between px-4 py-5 text-[10px] text-muted-foreground md:px-8 lg:px-10"><span>Motif · Your AI creative workspace</span><span>Made for your next idea</span></footer>}</SidebarInset></>
}
