import * as cheerio from 'cheerio';
import { parse, walk, generate } from 'css-tree';
import type { Brand, Content } from '../src/lib/types.ts';

const tags=new Set('div main section header footer span h1 h2 h3 p small strong em b i br img ul ol li'.split(' '));
function invalid(message: string): never { throw Object.assign(new Error(message),{status:400}); }
const bounded=(value: unknown,max: number,name: string)=>{if(typeof value!=='string'||!value.trim()||value.length>max)invalid(`${name} must contain 1–${max} characters.`);return value.trim();};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function designInput(value){
  if(!value||typeof value!=='object'||Array.isArray(value))invalid('Invalid HTML/CSS composition.');
  const html=bounded(value.html,24000,'Composition HTML');
  const css=bounded(value.css,18000,'Composition CSS');
  const imagePrompt=bounded(value.imagePrompt,4000,'Image prompt');
  const $=cheerio.load(html,null,false);let count=0;let images=0;
  $('*').each((_,el)=>{
    if(!('tagName' in el))return;
    if(++count>250)invalid('Composition exceeds 250 elements.');
    if(!tags.has(el.tagName))invalid(`Composition tag <${el.tagName}> is not allowed. Use static HTML only.`);
    const node=$(el);
    for(const [name,attr] of Object.entries(el.attribs||{})){
      if(name==='class'||name==='id'){if(!/^[a-zA-Z0-9_\- ]{1,200}$/.test(attr))invalid('Use simple composition class and ID names.');}
      else if(el.tagName==='img'&&name==='data-asset'&&attr==='artwork'){}
      else if(el.tagName==='img'&&name==='alt'&&attr.length<=300){}
      else invalid(`Composition attribute ${name} is not allowed. Put styles in CSS; use data-asset="artwork" for images.`);
    }
    if(el.tagName==='img'){if(node.attr('data-asset')!=='artwork')invalid('Every composition image must use data-asset="artwork".');images++;}
  });
  const cleanHTML=$.html();
  for(const token of ['headline','brand','cta'])if(!cleanHTML.includes(`{{${token}}}`))invalid(`Composition HTML must include {{${token}}} as editable text.`);
  if(images<1||images>4)invalid('Use between one and four artwork image elements.');
  let ast;
  try{ast=parse(css,{parseCustomProperty:true,onParseError:()=>invalid('Composition CSS could not be parsed.')});}
  catch(error){if(error.status)throw error;invalid('Composition CSS could not be parsed.');}
  let nodes=0;
  walk(ast,node=>{
    if(++nodes>5000)invalid('Composition CSS is too complex.');
    if(['Atrule','Url','Raw'].includes(node.type))invalid('CSS imports, at-rules, URLs, and unparsed values are not allowed.');
    if(node.type==='Declaration'&&['behavior','-moz-binding','animation','animation-name','transition'].includes(node.property.toLowerCase()))invalid('Use static composition CSS.');
    if(node.type==='Function'&&['url','image','image-set','-webkit-image-set','paint','element','attr'].includes(node.name.toLowerCase()))invalid('CSS external or dynamic assets are not allowed.');
  });
  return {html:cleanHTML,css:generate(ast).replace(/</g,'\\3c '),imagePrompt};
}

export function designDocument(item: Pick<Content, 'design' | 'headline' | 'cta' | 'subhead' | 'image' | 'title'>, brand: Pick<Brand, 'name'>){
  const design=designInput(item.design);
  const $=cheerio.load(design.html,null,false);
  // Replace placeholders only in text nodes, never interpolate user text into attributes or CSS.
  const tokens={headline:item.headline,brand:brand.name,cta:item.cta,subhead:item.subhead||''};
  const replace=node=>{
    if(node.type==='text')node.data=node.data.replace(/\{\{(headline|brand|cta|subhead)\}\}/g,(_,key)=>String(tokens[key]||''));
    else for(const child of node.children||[])replace(child);
  };
  replace($.root()[0]);
  $('img').attr('src',item.image||'').attr('alt','Generated campaign artwork');
  const csp="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; base-uri 'none'; form-action 'none'; script-src 'none'";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1080"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>${escape(item.title)}</title><style>${design.css}\nhtml,body{margin:0!important;width:1080px!important;height:1080px!important;overflow:hidden!important}*{box-sizing:border-box}img{max-width:100%}</style></head><body>${$.html()}</body></html>`;
}

export const designInstructions=`For each item also return subhead (max 160 characters) and design: {html, css, imagePrompt}.
Design a distinctive complete 1080x1080 static ad using HTML and CSS, not one of a few preset layouts. Use brand colors and art direction. Typography and copy must be HTML text over/alongside the artwork, never baked into the image.
HTML is a fragment using only div, main, section, header, footer, span, h1, h2, h3, p, small, strong, em, b, i, br, img, ul, ol, li. Attributes: class/id (simple letters, digits, spaces, hyphens and underscores); images may also have alt and must use data-asset="artwork". No src, inline styles, scripts, SVG, links, forms, embedded documents, URLs, or event handlers.
Use the literal text placeholders {{brand}}, {{headline}}, {{cta}} in appropriate text nodes, and optionally {{subhead}}. Include one img data-asset="artwork". Use CSS grid/flex/absolute positioning, gradients, shapes, and system fonts. Keep typography readable, all text inside the square, and the main headline under 8 words. No CSS at-rules, url(), custom fonts, animation, or network assets.
imagePrompt must describe image-model artwork, subject, environment, lighting, framing, and negative space fitting this composition. No lettering, logos, UI or text in the artwork. Do not imply that generated products are exact representations of a supplied product photo. Avoid invented product details.`;
