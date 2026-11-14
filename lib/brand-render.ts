/**
 * Rendered brand scan: loads a few pages of a public website in headless Chrome
 * (with the site's own JavaScript) to measure what visitors actually see —
 * the painted color palette, the fonts in use, logos and key imagery.
 *
 * Chrome is not allowed to touch the network itself: host resolution is
 * disabled and every request is fulfilled through Motif's public fetcher, which
 * pins DNS, rejects private and special-use addresses and enforces budgets.
 */
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { chromePath } from './render.ts';

export interface PaletteColor { color: string; weight: number; background: number; text: number; action: number; logo: number; heading: number }
export interface BrandAsset { dataUrl: string; width: number; height: number; alt: string; src?: string; sourceUrl: string; backdrop?: string }
export interface RenderedPage {
  url: string;
  /** The URL that was asked for, before redirects. */
  requestedUrl: string;
  html: string;
  palette: PaletteColor[];
  fonts: { heading?: string; body?: string; button?: string; loaded: string[] };
  logos: BrandAsset[];
  images: BrandAsset[];
  screenshot?: string;
}
export interface RenderResource { body: Buffer; contentType: string; url: string }
export interface RenderOptions {
  /** Fetch one public resource. `document` is true for top-level page navigations. */
  fetch: (url: string, kind: { document: boolean }) => Promise<RenderResource>;
  /** Whether a top-level page navigation may load (same site, allowed by robots.txt). */
  allowDocument: (url: string) => boolean;
  brandName?: string;
  signal?: AbortSignal;
  maxRequests?: number;
  maxBytes?: number;
}
export type RenderSite = (urls: string[], options: RenderOptions) => Promise<{ pages: RenderedPage[]; warnings: string[] }>;

const trackers = /(?:^|\.)(?:google-analytics\.com|googletagmanager\.com|doubleclick\.net|googlesyndication\.com|googleadservices\.com|facebook\.net|connect\.facebook\.com|hotjar\.com|clarity\.ms|segment\.(?:io|com)|mixpanel\.com|amplitude\.com|intercom(?:cdn)?\.io|hs-scripts\.com|hs-analytics\.net|hubspot\.com|linkedin\.com|ads-twitter\.com|tiktok\.com|bing\.com|sentry\.io|fullstory\.com|heap(?:analytics)?\.(?:io|com)|optimizely\.com|cookiebot\.com|onetrust\.com|cookielaw\.org|usercentrics\.eu|trustarc\.com)$/i;
const blockedTypes = new Set(['media', 'websocket', 'eventsource', 'manifest', 'texttrack', 'other']);
const rasterTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const assetLimit = 420_000, originalLimit = 2_500_000, imageEdge = 960;

/** Runs in the page: hides consent banners and chat widgets so they do not pollute colors or screenshots. */
function hideOverlays() {
  const marker = /(?:^|[\s_-])(?:cookie(?:s|bot|-banner|-consent)?|consent|onetrust|gdpr|cmp|usercentrics|intercom|drift|crisp|hubspot-messages|chat-widget)(?:[\s_-]|$)/i;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *')).slice(0, 6000)) {
    const id = el.id || '', name = typeof el.className === 'string' ? el.className : '';
    if (marker.test(id) || marker.test(name)) el.style.setProperty('display', 'none', 'important');
  }
}

/** Runs in the page: scrolls down in steps so lazy-loaded images and sections render. */
async function revealLazyContent() {
  const step = Math.max(400, innerHeight * 0.9), limit = Math.min(document.documentElement.scrollHeight, 12000);
  for (let y = 0; y < limit; y += step) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 120)); }
  scrollTo(0, 0);
  await new Promise(resolve => setTimeout(resolve, 300));
}

/** Runs in the page: measures painted colors, fonts and candidate logos and images. */
function measureBrand(brandName: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const cache = new Map<string, string | null>();
  const hex = (value: string) => {
    if (!value || value === 'transparent' || value === 'none' || /rgba?\([^)]*,\s*0\)$/.test(value)) return null;
    if (cache.has(value)) return cache.get(value)!;
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#010203'; ctx.fillStyle = value;
    let result: string | null = null;
    if (ctx.fillStyle !== '#010203' || value.replace(/\s/g, '') === '#010203') {
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a >= 200) result = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
    }
    cache.set(value, result);
    return result;
  };
  const colors = new Map<string, { background: number; text: number; action: number; logo: number; heading: number }>();
  const add = (color: string | null, role: 'background' | 'text' | 'action' | 'logo' | 'heading', weight: number) => {
    if (!color || !(weight > 0)) return;
    const entry = colors.get(color) || { background: 0, text: 0, action: 0, logo: 0, heading: 0 };
    entry[role] += weight; colors.set(color, entry);
  };
  const pageWidth = document.documentElement.clientWidth || innerWidth, pageHeight = Math.min(document.documentElement.scrollHeight, 8000);
  const area = (rect: DOMRect) => Math.max(0, Math.min(rect.right, pageWidth) - Math.max(rect.left, 0)) * Math.max(0, Math.min(rect.bottom + scrollY, pageHeight) - Math.max(rect.top + scrollY, 0));
  const logoWords = /logo|brand|wordmark|site-title|navbar-brand/i;
  const nameText = brandName.trim().toLowerCase();
  const describe = (el: Element) => [el.id, typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : el.getAttribute('class'), el.getAttribute('alt'), el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('src')].filter(Boolean).join(' ');
  const visible = (el: Element, style: CSSStyleDeclaration, rect: DOMRect) => rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0.05;
  const parentBackground = (el: Element) => {
    for (let node: Element | null = el; node; node = node.parentElement) { const color = hex(getComputedStyle(node).backgroundColor); if (color) return color; }
    return hex(getComputedStyle(document.body).backgroundColor) || '#ffffff';
  };
  add(hex(getComputedStyle(document.documentElement).backgroundColor) || hex(getComputedStyle(document.body).backgroundColor) || '#ffffff', 'background', pageWidth * pageHeight * 0.5);

  const elements = Array.from(document.body.querySelectorAll('*')).slice(0, 5000);
  const logos: { el: Element; score: number }[] = [], images: { el: Element; score: number; src: string; alt: string; width: number; height: number }[] = [];
  for (const el of elements) {
    const style = getComputedStyle(el), rect = el.getBoundingClientRect();
    if (!visible(el, style, rect)) continue;
    const tag = el.tagName.toLowerCase(), box = area(rect);
    const parentColor = el.parentElement ? hex(getComputedStyle(el.parentElement).backgroundColor) : null;
    const background = hex(style.backgroundColor);
    const isAction = tag === 'button' || el.getAttribute('role') === 'button' || (tag === 'a' && (style.display.includes('block') || style.display.includes('flex') || parseFloat(style.paddingLeft) >= 8) && rect.height >= 28 && rect.height <= 90);
    if (background && background !== parentColor) add(background, isAction ? 'action' : 'background', isAction ? Math.max(box, 6000) * 6 : box);
    for (const match of style.backgroundImage.matchAll(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*(?:\([^()]*\)[^()]*)*\)|#[\da-f]{3,8}\b/gi)) add(hex(match[0]), 'background', box / 3);
    const ownText = Array.from(el.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent || '').join('').trim();
    if (ownText) {
      const size = parseFloat(style.fontSize) || 16, weight = ownText.length * size * size / 40;
      add(hex(style.color), isAction ? 'action' : size >= 28 || /^h[1-3]$/.test(tag) ? 'heading' : 'text', weight);
      if (tag === 'a' && !isAction) add(hex(style.color), 'action', weight * 0.5);
    }
    const inHeader = rect.top + scrollY < 220 || !!el.closest('header,nav,[role=banner],[class*=header i],[class*=navbar i]');
    if ((tag === 'svg' || tag === 'img' || (tag === 'a' && style.backgroundImage.startsWith('url('))) && rect.width >= 16 && rect.width <= 700 && rect.height >= 12 && rect.height <= 320) {
      const text = describe(el) + ' ' + (el.closest('a') ? describe(el.closest('a')!) : '');
      const home = el.closest('a') && /^(?:\/|\.\/|https?:\/\/[^/]+\/?)(?:index\.html?)?(?:[?#].*)?$/.test(el.closest('a')!.getAttribute('href') || '');
      let score = (logoWords.test(text) ? 4 : 0) + (nameText && text.toLowerCase().includes(nameText) ? 3 : 0) + (home ? 3 : 0) + (inHeader ? 2 : 0) + (rect.left < pageWidth / 2 ? 1 : 0) - (rect.top + scrollY > pageHeight - 900 ? 1 : 0);
      if (tag === 'svg' && rect.width < 30 && rect.height < 30) score -= 3; // icons, not logos
      // Customer and partner logo walls: named after someone else, or far below the header.
      const label = (el.getAttribute('alt') || el.getAttribute('aria-label') || el.closest('a')?.getAttribute('aria-label') || '').toLowerCase();
      if (nameText && label && !label.includes(nameText) && !/^(?:(?:site |company )?logo|home|homepage|go to homepage|back to home)$/.test(label.trim())) score -= 5;
      if (!inHeader && rect.top + scrollY > 1200 && !home) score -= 3;
      if (score >= 4) logos.push({ el, score });
      if (tag === 'svg' && score >= 4) for (const shape of Array.from(el.querySelectorAll('path,rect,circle,polygon,text,g')).slice(0, 60)) add(hex(getComputedStyle(shape).fill), 'logo', 4000);
    }
    if (tag === 'img') {
      const img = el as HTMLImageElement;
      if (rect.width >= 220 && rect.height >= 160 && img.naturalWidth >= 300 && !logoWords.test(describe(el))) images.push({ el, score: box, src: img.currentSrc || img.src, alt: img.alt || '', width: img.naturalWidth, height: img.naturalHeight });
    } else if (style.backgroundImage.startsWith('url(') && rect.width >= 400 && rect.height >= 240 && !logoWords.test(describe(el))) {
      const src = /url\(["']?([^"')]+)["']?\)/.exec(style.backgroundImage)?.[1] || '';
      if (src && !src.startsWith('data:image/svg')) images.push({ el, score: box * 0.8, src: new URL(src, location.href).href, alt: el.getAttribute('aria-label') || '', width: Math.round(rect.width), height: Math.round(rect.height) });
    }
  }
  const family = (selector: string) => { const el = Array.from(document.querySelectorAll(selector)).find(node => node.getBoundingClientRect().height > 0); return el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim() : undefined; };
  const loaded = Array.from(document.fonts || []).filter(face => face.status === 'loaded').map(face => face.family.replace(/["']/g, '').trim());
  logos.sort((a, b) => b.score - a.score);
  const chosenLogos = logos.filter((item, index) => !logos.slice(0, index).some(other => other.el.contains(item.el) || item.el.contains(other.el))).slice(0, 4);
  chosenLogos.forEach((item, index) => item.el.setAttribute('data-motif-logo', String(index)));
  const seen = new Set<string>();
  const chosenImages = images.sort((a, b) => b.score - a.score).filter(item => item.src && !seen.has(item.src) && seen.add(item.src)).slice(0, 10);
  chosenImages.forEach((item, index) => item.el.setAttribute('data-motif-image', String(index)));
  return {
    palette: [...colors].map(([color, roles]) => ({ color, ...roles, weight: roles.background + roles.text + roles.action + roles.logo + roles.heading })).sort((a, b) => b.weight - a.weight).slice(0, 60),
    fonts: { heading: family('h1') || family('h2'), body: family('p') || family('li'), button: family('button') || family('a[class*=button i],a[class*=btn i]'), loaded: [...new Set(loaded)].slice(0, 20) },
    logos: chosenLogos.map((item, index) => ({ index, alt: (item.el.getAttribute('alt') || item.el.getAttribute('aria-label') || item.el.closest('a')?.getAttribute('aria-label') || '').slice(0, 200), src: item.el.tagName.toLowerCase() === 'img' ? (item.el as HTMLImageElement).currentSrc : '', width: Math.round(item.el.getBoundingClientRect().width), height: Math.round(item.el.getBoundingClientRect().height), backdrop: parentBackground(item.el) })),
    images: chosenImages.map((item, index) => ({ index, src: item.src, alt: item.alt.slice(0, 300), width: item.width, height: item.height })),
  };
}

const dataUrl = (type: string, body: Buffer) => `data:${type};base64,${body.toString('base64')}`;

/** Runs in an offline page: re-encodes an image at a storable size. Data URLs never taint the canvas. */
async function shrinkImage({ src, edge }: { src: string; edge: number }) {
  const image = new Image(); image.src = src; await image.decode();
  const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

async function captureAsset(page: Page, selector: string, type: 'png' | 'jpeg') {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  for (const quality of type === 'jpeg' ? [72, 50] : [undefined]) {
    const shot = await target.screenshot({ type, timeout: 4000, animations: 'disabled', ...(type === 'png' ? { omitBackground: true } : { quality }) });
    if (shot.length <= assetLimit) return dataUrl(`image/${type}`, shot);
  }
  return '';
}

export const renderSite: RenderSite = async (urls, options) => {
  const executablePath = chromePath();
  if (!executablePath) return { pages: [], warnings: ['Chrome or Edge was not found, so pages were read without loading them in a browser. Set CHROME_PATH to enable the visual scan.'] };
  const warnings: string[] = [], pages: RenderedPage[] = [];
  const maxRequests = options.maxRequests ?? 260, maxBytes = options.maxBytes ?? 40_000_000; // requests per page, bytes in total
  let requests = 0, bytes = 0, browser: Browser | undefined;
  const cancel = () => { void browser?.close().catch(() => {}); };
  options.signal?.throwIfAborted();
  try {
    // Chrome may not resolve hosts itself; every request goes through the route below.
    browser = await chromium.launch({ headless: true, executablePath, timeout: 15000, args: ['--host-resolver-rules=MAP * ~NOTFOUND', '--disable-features=DnsOverHttps'] });
    options.signal?.addEventListener('abort', cancel, { once: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block', acceptDownloads: false, reducedMotion: 'reduce', locale: 'en-US', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 MotifLocal/1.0 (user-requested brand scan)' });
    const images = new Map<string, RenderResource>();
    let main: Page | undefined;
    // An offline page for re-encoding images; it never navigates, so no request reaches the route.
    const workbench = await context.newPage();
    await context.route('**/*', async route => {
      const request = route.request(), url = request.url();
      try {
        const host = new URL(url).hostname;
        const document = request.isNavigationRequest();
        if (request.method() !== 'GET' || !/^https?:/.test(url) || blockedTypes.has(request.resourceType()) || trackers.test(host)) return await route.abort('blockedbyclient');
        if (document && (request.frame() !== main?.mainFrame() || !options.allowDocument(url))) return await route.abort('blockedbyclient');
        if (++requests > maxRequests || bytes > maxBytes) return await route.abort('blockedbyclient');
        const resource = await options.fetch(url, { document });
        bytes += resource.body.length;
        if (rasterTypes.has(resource.contentType) && resource.body.length <= originalLimit) images.set(url, resource);
        await route.fulfill({ status: 200, body: resource.body, contentType: resource.contentType || 'application/octet-stream', headers: { 'access-control-allow-origin': '*' } });
      } catch { await route.abort('failed').catch(() => {}); }
    });
    for (const url of urls) {
      options.signal?.throwIfAborted();
      main = await context.newPage();
      requests = 0;
      main.setDefaultTimeout(8000);
      try {
        await main.goto(url, { waitUntil: 'load', timeout: 20000 });
        await main.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
        await main.evaluate(hideOverlays);
        await main.evaluate(revealLazyContent);
        await main.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
        await main.evaluate(hideOverlays);
        const finalUrl = main.url();
        const measure = await main.evaluate(measureBrand, options.brandName || '');
        const html = (await main.content()).slice(0, 3_000_000);
        const logos: BrandAsset[] = [];
        for (const logo of measure.logos) {
          const original = logo.src ? images.get(logo.src) : undefined;
          const captured = original ? dataUrl(original.contentType, original.body) : await captureAsset(main, `[data-motif-logo="${logo.index}"]`, 'png').catch(() => '');
          if (captured) logos.push({ dataUrl: captured, width: logo.width, height: logo.height, alt: logo.alt, ...(logo.src ? { src: logo.src } : {}), sourceUrl: finalUrl, backdrop: logo.backdrop });
        }
        const pageImages: BrandAsset[] = [];
        for (const image of measure.images) {
          const original = images.get(image.src);
          let captured = original ? dataUrl(original.contentType, original.body) : await captureAsset(main, `[data-motif-image="${image.index}"]`, 'jpeg').catch(() => '');
          if (captured && (captured.length > 260_000 || Math.max(image.width, image.height) > imageEdge)) {
            const source = captured;
            captured = await workbench.evaluate(shrinkImage, { src: source, edge: imageEdge }).catch(() => source.length <= assetLimit ? source : '');
          }
          if (captured) pageImages.push({ dataUrl: captured, width: image.width, height: image.height, alt: image.alt, src: image.src, sourceUrl: finalUrl });
        }
        if (requests > maxRequests) warnings.push(`${finalUrl}: stopped loading after ${maxRequests} requests; some images or styles may be missing.`);
        await main.evaluate(() => scrollTo(0, 0));
        const shot = pages.length ? undefined : await main.screenshot({ type: 'jpeg', quality: 55, timeout: 6000, animations: 'disabled' }).catch(() => undefined);
        pages.push({ url: finalUrl, requestedUrl: url, html, palette: measure.palette, fonts: measure.fonts, logos, images: pageImages, ...(shot && shot.length <= assetLimit ? { screenshot: dataUrl('image/jpeg', shot) } : {}) });
      } catch (error) {
        options.signal?.throwIfAborted();
        warnings.push(`Could not load ${url} in the browser: ${String((error as Error).message).split('\n')[0].slice(0, 160)}`);
      } finally { await main.close().catch(() => {}); }
    }
    if (bytes > maxBytes) warnings.push('The browser scan reached its download limit; some images or styles may be missing.');
  } catch (error) {
    options.signal?.throwIfAborted();
    warnings.push(`The browser scan could not run: ${String((error as Error).message).split('\n')[0].slice(0, 200)}`);
  } finally {
    options.signal?.removeEventListener('abort', cancel);
    await browser?.close().catch(() => {});
  }
  return { pages, warnings };
};
