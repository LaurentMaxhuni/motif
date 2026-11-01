import { useId } from 'react'
import type { Brand, Content } from '@/lib/types'

export function safeImage(value?: string) {
  return value && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(value) ? value : undefined
}

export function CreativePreview({item,brand,className=''}:{item:Content,brand?:Brand,className?:string}) {
  const id=useId().replace(/:/g,'')
  const rendered=safeImage(item.rendered)
  if(item.design && rendered) return <img src={rendered} width={1080} height={1080} alt={item.headline||item.title} className={`aspect-square w-full object-cover ${className}`}/>
  const layout=item.layout||0, color=/^#[a-f0-9]{3,8}$/i.test(item.color||'')?item.color:brand?.colors[0]||'#cb6877'
  const lines:string[]=[]; let line=''
  for(const word of (item.headline||item.title||'Your next idea.').replace(/\n/g,' ').split(/\s+/)){if((line+' '+word).length>(layout===1?11:18)&&line){lines.push(line);line=word}else line+=(line?' ':'')+word}if(line)lines.push(line)
  const image=safeImage(item.image), split=layout===1
  return <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 400 400" role="img" aria-label={item.headline||item.title} className={`size-full aspect-square h-auto ${className}`}>
    <defs><linearGradient id={`clay-${id}`}><stop stopColor="#c7b094"/><stop offset=".42" stopColor="#f0e0c8"/><stop offset="1" stopColor="#baa184"/></linearGradient><clipPath id={`crop-${id}`}><rect x="0" y={split?0:185} width={split?185:400} height={split?400:215}/></clipPath></defs>
    <rect width="400" height="400" fill={['#efe4db','#e7e9df','#f2dfcb','#dce5e9'][layout]||'#efe4db'}/>
    {split?<rect x="185" width="215" height="400" fill={color}/>:layout===2?<circle cx="330" cy="280" r="200" fill={color} opacity=".17"/>:layout===3?<path d="M0 310Q170 170 400 300V400H0z" fill={color} opacity=".32"/>:null}
    {image?<image href={image} x="0" y={split?0:185} width={split?185:400} height={split?400:215} preserveAspectRatio="xMidYMid slice" clipPath={`url(#crop-${id})`}/>: /ceramic|pottery|mugs?|vases?/i.test(brand?.product||'')?<g transform={`translate(${split?30:125},${layout===0?188:split?160:174})`}><ellipse cx="90" cy="158" rx="103" ry="14" fill="#000" opacity=".09"/><path d="M30 29Q15 22 22 76l12 66Q39 162 88 162t55-20l12-66q7-54-8-47Z" fill={`url(#clay-${id})`}/><ellipse cx="88" cy="30" rx="63" ry="17" fill="#d4bda6"/><ellipse cx="88" cy="30" rx="51" ry="11" fill="#776958"/><path d="M151 49q59-7 49 51-8 32-52 21" fill="none" stroke="#d9c6af" strokeWidth="19"/><path d="M43 65l6 59" stroke="#fff" opacity=".24" strokeWidth="5" strokeLinecap="round"/></g>:<g fill={color}><path d="M35 330V260a65 65 0 0 1 130 0v70z" opacity=".65"/><circle cx={split?95:270} cy="270" r={split?48:75} opacity=".35"/><rect x={split?40:115} y="298" width={split?110:205} height="35" rx="17" opacity=".28"/></g>}
    <text x={split?205:34} y="38" fontSize="12" fontFamily="Arial,sans-serif" fontWeight="600" letterSpacing="1" fill={split?'#fff':'#33433b'}>{(brand?.name||'Your brand').slice(0,26)}</text>
    <text x={split?205:34} y={split?105:94} fontFamily="Georgia,serif" fontSize={split?29:39} letterSpacing="-1.1" fill={split?'#fff':'#293f34'}>{lines.slice(0,split?5:4).map((text,i)=><tspan key={i} x={split?205:34} dy={i?42:0}>{text}</tspan>)}</text>
    <text x={split?205:34} y="373" fontSize="11" fontFamily="Arial,sans-serif" fill={split?'#fff':'#33433b'}>{(item.cta||'Discover more').slice(0,29)} ↗</text>
  </svg>
}
export default CreativePreview
