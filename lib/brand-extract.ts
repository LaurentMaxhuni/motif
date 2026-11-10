import * as cheerio from 'cheerio';
import * as cssTree from 'css-tree';

const clean = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const unique = <T>(values: T[]) => [...new Set(values.filter(Boolean))];
const hue = value => parseFloat(value) * (value.endsWith('turn') ? 360 : value.endsWith('grad') ? 0.9 : value.endsWith('rad') ? 180 / Math.PI : 1);
const matrix = (rows, values) => rows.map(row => row.reduce((sum, n, i) => sum + n * values[i], 0));

function oklchRGB(parts) {
  // CSS Color 4 reference conversion, with final clipping for this six-digit palette.
  // https://www.w3.org/TR/css-color-4/#color-conversion-code
  const l = Math.min(1, Math.max(0, parseFloat(parts[0]) / (parts[0].endsWith('%') ? 100 : 1)));
  const c = Math.max(0, parseFloat(parts[1]) * (parts[1].endsWith('%') ? 0.004 : 1));
  const h = hue(parts[2]) * Math.PI / 180;
  const lms = matrix([[1, .3963377773761749, .2158037573099136], [1, -.1055613458156586, -.0638541728258133], [1, -.0894841775298119, -1.2914855480194092]], [l, c * Math.cos(h), c * Math.sin(h)]).map(v => v ** 3);
  const xyz = matrix([[1.2268798758459243, -.5578149944602171, .2813910456659647], [-.0405757452148008, 1.1122868032803170, -.0717110580655164], [-.0763729366746601, -.4214933324022432, 1.5869240198367816]], lms);
  return matrix([[12831 / 3959, -329 / 214, -1974 / 3959], [-851781 / 878810, 1648619 / 878810, 36519 / 878810], [705 / 12673, -2585 / 12673, 705 / 667]], xyz).map(v => 255 * Math.min(1, Math.max(0, v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055)));
}

function resolveURL(value, base, crawl = false) {
  if (typeof value !== 'string' || value.length > 2000) return '';
  try {
    const u = new URL(value, base);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return '';
    u.hash = '';
    if (crawl) {
      u.search = '';
      u.pathname = u.pathname.replace(/\/{2,}/g, '/');
      if (u.pathname !== '/') u.pathname = u.pathname.replace(/\/$/, '');
    }
    return u.href;
  } catch { return ''; }
}

function restoreStreamedContent($) {
  // Read completed React HTML segments as markup; never evaluate page scripts.
  // Only explicit completion calls with matching pending-boundary markers qualify.
  let restored = 0, calls = 0;
  $('script:not([src])').slice(0, 2000).each((_, script) => {
    const raw = $(script).text();
    if (raw.length > 100000 || calls >= 100) return;
    for (const match of raw.matchAll(/(?:^|;)\s*\$RC\(["'](B:[\da-f]+)["'],\s*["'](S:[\da-f]+)["']\)/g)) {
      if (calls++ >= 100) break;
      const target = $(`template[id="${match[1]}"]`), segment = $(`div[hidden][id="${match[2]}"]`);
      if (target.length !== 1 || segment.length !== 1 || target.parents().get().includes(segment[0]) || target[0].prev?.type !== 'comment' || target[0].prev.data !== '$?') continue;
      const fallback = []; let depth = 0, end = target[0].next;
      while (end && fallback.length < 10000) {
        if (end.type === 'comment') {
          if (['$', '$?', '$~', '$!'].includes(end.data)) depth++;
          if (end.data === '/$' && depth-- === 0) break;
        }
        fallback.push(end); end = end.next;
      }
      if (!end || end.type !== 'comment' || end.data !== '/$') continue;
      for (const node of fallback) $(node).remove();
      target.replaceWith(segment.contents()); segment.remove(); restored++;
    }
  });
  return restored;
}

function color(value) {
  value = value.trim().toLowerCase();
  if (/^#[\da-f]{3,4}$/.test(value)) value = '#' + [...value.slice(1)].map(x => x + x).join('');
  if (/^#[\da-f]{8}$/.test(value)) return value.endsWith('ff') ? value.slice(0, 7) : '';
  if (/^#[\da-f]{6}$/.test(value)) return value;
  const match = /^(rgba?|hsla?|oklch)\((.*)\)$/.exec(value);
  if (!match) return '';
  const parts = match[2].replace(/%([+\-.\d])/g, '% $1').replace(/[,/]/g, ' ').trim().split(/\s+/);
  if (parts.length < 3 || parts.length > 4 || parts.some(p => !/^[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?(?:%|deg|grad|rad|turn)?$/.test(p))) return '';
  if (parts.some(p => !Number.isFinite(parseFloat(p)))) return '';
  if (parts[3] && (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : Number(parts[3])) !== 1) return '';
  let rgb;
  if (match[1].startsWith('rgb')) {
    if (parts.slice(0, 3).some(p => /[a-z]/i.test(p.replace(/e[+-]?\d+/i, '')))) return '';
    rgb = parts.slice(0, 3).map(p => Math.min(255, Math.max(0, parseFloat(p) * (p.endsWith('%') ? 255 / 100 : 1))));
  } else if (match[1] === 'oklch') {
    if (parts.slice(0, 2).some(p => /(?:deg|grad|rad|turn)$/.test(p)) || parts[2].endsWith('%')) return '';
    rgb = oklchRGB(parts);
  } else {
    if (!parts[1].endsWith('%') || !parts[2].endsWith('%') || parts[0].endsWith('%')) return '';
    let h = hue(parts[0]);
    h = ((h % 360) + 360) % 360 / 30;
    const s = Math.min(1, Math.max(0, parseFloat(parts[1]) / 100));
    const l = Math.min(1, Math.max(0, parseFloat(parts[2]) / 100));
    const a = s * Math.min(l, 1 - l);
    rgb = [0, 8, 4].map(n => { const k = (n + h) % 12; return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); });
  }
  return rgb.every(Number.isFinite) ? '#' + rgb.map(n => Math.round(n).toString(16).padStart(2, '0')).join('') : '';
}

export function extractStyles(css: string) {
  const colors = [], fonts = [], colorSignals = [];
  let tree;
  try { tree = cssTree.parse(String(css || '').slice(0, 400000), { parseCustomProperty: true }); } catch { return { colors, fonts, colorSignals }; }
  cssTree.walk(tree, { visit: 'Declaration', enter(node) {
    const property = node.property.toLowerCase();
    if (property === 'font-family') fonts.push(cssTree.generate(node.value).slice(0, 200));
    const role = /^--(?:[\w]+-)*(brand|primary|accent)(?:-|$)/.exec(property)?.[1];
    cssTree.walk(node.value, candidate => {
      if (candidate.type !== 'Hash' && !(candidate.type === 'Function' && /^(?:rgba?|hsla?|oklch)$/i.test(candidate.name))) return;
      const normalized = color(cssTree.generate(candidate));
      if (!normalized) return;
      colors.push(normalized);
      if (role) colorSignals.push({ color: normalized, role, weight: 3 });
    });
  } });
  return { colors: unique(colors), fonts: unique(fonts).slice(0, 20), colorSignals: [...new Map(colorSignals.map(s => [s.role + s.color, s])).values()].slice(0, 60) };
}

interface SchemaEntry {
  type: string;
  name: string;
  description: string;
  url: string;
  source: string;
  identityEligible: boolean;
  variantOf?: string;
}

export function extractPage(html: string, url: string) {
  const $ = cheerio.load(String(html || '').slice(0, 3000000));
  const streamedBoundaries = restoreStreamedContent($);
  const meta = name => clean($(`meta[name="${name}"],meta[property="${name}"]`).first().attr('content'));
  const resolve = value => resolveURL(value, url, true);
  const asset = value => resolveURL(value, url);
  const links = $('a[href]').slice(0, 1000).map((_, el) => ({ url: resolve($(el).attr('href')), text: clean($(el).text()).slice(0, 160) })).get().filter(v => v.url);
  const canonical = resolve($('link[rel="canonical"]').first().attr('href'));
  const schema: SchemaEntry[] = [], identities: SchemaEntry[] = [], schemaLogos = []; let schemaErrors = 0, visited = 0;
  $('script[type="application/ld+json"]').slice(0, 12).each((_, el) => {
    const raw = $(el).text();
    if (raw.length > 100000) { schemaErrors++; return; }
    try {
      const visit = (value, depth = 0, variantOf = '', ownerRelationship = true) => {
        if (!value || typeof value !== 'object' || depth > 12 || visited++ >= 1200) return;
        if (Array.isArray(value)) { value.slice(0, 100).forEach(v => visit(v, depth + 1, variantOf, ownerRelationship)); return; }
        const types = (Array.isArray(value['@type']) ? value['@type'] : [value['@type']]).filter(t => typeof t === 'string').map(t => t.replace(/^https?:\/\/schema\.org\//, ''));
        if (types.length && schema.length < 100) {
          const identityEligible = ownerRelationship && types.some(t => ['Organization', 'WebSite', 'LocalBusiness'].includes(t));
          const item: SchemaEntry = { type: types.join(', ').slice(0, 150), name: clean(value.name).slice(0, 200), description: clean(value.description).slice(0, 1500), url: resolve(value.url), source: url, identityEligible };
          const parentName = variantOf || clean(value.isVariantOf?.name).slice(0, 200);
          if (parentName) item.variantOf = parentName;
          schema.push(item);
          if (identityEligible) {
            identities.push(item);
            const logo = typeof value.logo === 'string' ? value.logo : value.logo?.url || value.logo?.contentUrl;
            if (logo) schemaLogos.push({ url: asset(logo), alt: item.name });
          }
        }
        Object.entries(value).slice(0, 100).forEach(([key, child]) => visit(child, depth + 1, key === 'hasVariant' && types.includes('ProductGroup') ? clean(value.name).slice(0, 200) : '', ownerRelationship && (key === '@graph' || (key === 'publisher' && types.includes('WebSite')))));
      };
      visit(JSON.parse(raw));
    } catch { schemaErrors++; }
  });
  const identity = identities.find(item => item.name && item.type.split(', ').includes('WebSite')) || identities.find(item => item.name) || identities[0];
  const title = (clean($('title').first().text()) || meta('og:title') || meta('twitter:title') || identity?.name || '').slice(0, 500);
  const description = (meta('description') || meta('og:description') || meta('twitter:description') || identity?.description || '').slice(0, 2000);
  const siteName = (meta('og:site_name') || identity?.name || '').slice(0, 100);
  const css = $('style').map((_, el) => $(el).text()).get().join('\n').slice(0, 300000) + '\n' + $('[style]').slice(0, 1000).map((_, el) => '.inline{' + $(el).attr('style') + '}').get().join('\n').slice(0, 100000);
  const styles = extractStyles(css), theme = color(meta('theme-color'));
  const logos = $('img').filter((_, el) => /logo|brand/i.test([$(el).attr('alt'), $(el).attr('class'), $(el).attr('id'), $(el).attr('src')].join(' '))).slice(0, 8).map((_, el) => ({ url: asset($(el).attr('src') || $(el).attr('data-src') || $(el).attr('srcset')?.split(',')[0].trim().split(/\s+/)[0]), alt: clean($(el).attr('alt')).slice(0, 200) })).get();
  const visuals = { colors: unique([theme, ...styles.colors]).slice(0, 20), fonts: styles.fonts, colorSignals: [...(theme ? [{ color: theme, role: 'theme', weight: 3 }] : []), ...styles.colorSignals].slice(0, 60), logos: [...new Map([...logos, ...schemaLogos].filter(v => v.url).map(v => [v.url, v])).values()].slice(0, 8), socialImage: asset(meta('og:image') || meta('twitter:image')), stylesheets: $('link[rel="stylesheet"][href]').slice(0, 15).map((_, el) => asset($(el).attr('href'))).get().filter(Boolean) };
  const imageCount = $('img').length, missingAlt = $('img:not([alt])').length;
  const robots = meta('robots'), language = clean($('html').attr('lang')).slice(0, 60);
  // Capture crawl/visual evidence before removing chrome; preserve editorial hero headers.
  $('script,style,noscript,svg,template,nav,footer,form,[hidden],[aria-hidden="true"],[role="navigation"],[role="contentinfo"],[role="dialog"],[aria-modal="true"]').remove();
  $('header').filter((_, el) => {
    const node = $(el);
    return !node.closest('main,article,[role="main"]').length || node.attr('role') === 'banner' || /(?:^|\s)fixed(?:\s|$)/.test(node.attr('class') || '') || /position\s*:\s*fixed/i.test(node.attr('style') || '');
  }).remove();
  $('[id],[class],[style]').each((_, el) => {
    const node = $(el), marker = [node.attr('id'), node.attr('class')].join(' ');
    if (/(?:^|[\s_-])(?:cookie(?:s|bot)?|consent|onetrust|shopping-cart|cart-drawer|cart-modal|mini-cart|site-nav|site-footer)(?:[\s_-]|$)/i.test(marker) || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(node.attr('style') || '')) node.remove();
  });
  const mains = $('main,[role="main"]').filter((_, el) => !$(el).parents('main,[role="main"]').length);
  let content = mains.length ? mains : $('body'), contentScope = mains.length ? 'main' : 'body';
  const mainLength = clean(mains.text()).length, bodyLength = clean($('body').text()).length;
  if (mains.length && mainLength < 1200 && bodyLength > mainLength * 2 && $('body h2,body h3').filter((_, el) => !$(el).closest('main,[role="main"]').length).length) {
    content = $('body'); contentScope = 'body-fallback';
  }
  content.find('span').filter((_, el) => $(el).find('br').length > 0).each((_, el) => { $(el).before(' '); $(el).after(' '); });
  content.find('address,article,aside,blockquote,br,div,dl,dt,dd,h1,h2,h3,h4,h5,h6,hr,li,ol,p,section,table,td,th,tr,ul,header').each((_, el) => { $(el).before(' '); $(el).after(' '); });
  const headings = content.find('h1,h2,h3').slice(0, 60).map((_, el) => ({ level: Number(el.tagName[1]), text: clean($(el).text()).slice(0, 300) })).get().filter(h => h.text);
  const ctas = unique(content.find('a,button').slice(0, 300).map((_, el) => clean($(el).text())).get().filter(s => /^(get|start|try|book|buy|shop|request|contact|discover|learn|join|sign up|download|explore)\b/i.test(s) && s.length <= 120)).slice(0, 20);
  const paragraphs = unique(content.find('p,li,h1,h2,h3').map((_, el) => clean($(el).text())).get().filter(s => s.length >= 25 && s.length <= 700)).slice(0, 80);
  const text = clean(content.map((_, el) => $(el).text()).get().join(' ')).slice(0, 18000);
  const origin = new URL(url).origin;
  const seo = { titleLength: title.length, descriptionLength: description.length, h1Count: headings.filter(h => h.level === 1).length, canonical, robots, language, imageCount, missingAlt, schema, schemaErrors, internalLinks: links.filter(l => new URL(l.url).origin === origin).length, externalLinks: links.filter(l => new URL(l.url).origin !== origin).length };
  const extractionNotes = streamedBoundaries ? [`Statically assembled ${streamedBoundaries} completed React HTML boundaries; page scripts were not executed.`] : [];
  return { url, title, description, siteName, headings, wordCount: text ? text.split(/\s+/).length : 0, excerpt: text, paragraphs, links, seo, visuals, ctas, contentScope, streamedBoundaries, extractionNotes };
}
