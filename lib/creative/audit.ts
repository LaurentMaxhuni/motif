/**
 * Visual quality audit for rendered compositions. Measurement runs inside the
 * headless browser that renders the design; scoring is pure and provider
 * independent, so every text model gets the same objective feedback.
 */
export interface Rect { x: number; y: number; w: number; h: number }
export type TextRole = 'headline' | 'subhead' | 'cta' | 'brand' | 'text';
export interface TextMeasure {
  role: TextRole;
  label: string;
  text: string;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  color: [number, number, number, number] | null;
  rects: Rect[];
  hidden: boolean;
  clipped: boolean;
  aided: boolean; // text-shadow or stroke improves legibility over busy backgrounds
}
export interface CompositionMeasure { width: number; height: number; texts: TextMeasure[]; artworkCoverage: number; artwork?: Rect[] }
export type Severity = 'critical' | 'major' | 'minor';
export interface AuditIssue { severity: Severity; code: string; message: string }
export interface Audit { score: number; issues: AuditIssue[] }

/** Runs in the page (serialised by Playwright); must stay self-contained. */
export function measureComposition(tokens: Record<string, string>): CompositionMeasure {
  const width = 1080, height = 1080;
  const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
  const parseColor = (value: string): [number, number, number, number] | null => {
    const match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(value);
    if (!match) return null;
    const alpha = match[4] === undefined ? 1 : match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
    return [Number(match[1]), Number(match[2]), Number(match[3]), alpha];
  };
  const roles: [string, string][] = [['headline', tokens.headline], ['cta', tokens.cta], ['subhead', tokens.subhead], ['brand', tokens.brand]];
  const texts: TextMeasure[] = [];
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    const nodes = Array.from(el.childNodes).filter(node => node.nodeType === 3 && clean(node.textContent || ''));
    if (!nodes.length) continue;
    const style = getComputedStyle(el);
    const rects: Rect[] = [];
    for (const node of nodes) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of Array.from(range.getClientRects())) if (r.width > 0.5 && r.height > 0.5) rects.push({ x: r.left, y: r.top, w: r.width, h: r.height });
    }
    let opacity = 1;
    for (let node: Element | null = el; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    let clipped = false;
    for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
      const s = getComputedStyle(node);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const box = node.getBoundingClientRect();
      if (rects.some(r => r.x < box.left - 2 || r.y < box.top - 2 || r.x + r.w > box.right + 2 || r.y + r.h > box.bottom + 2)) { clipped = true; break; }
    }
    const own = clean(nodes.map(node => node.textContent).join(' '));
    const role = (roles.find(([, value]) => value && own.includes(clean(value)))?.[0] || 'text') as TextRole;
    const classes = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    texts.push({
      role, label: el.tagName.toLowerCase() + classes, text: own.slice(0, 120),
      fontSize: parseFloat(style.fontSize) || 0, fontWeight: Number(style.fontWeight) || 400,
      fontFamily: style.fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase(),
      color: parseColor(style.color), rects, clipped,
      hidden: !rects.length || style.visibility === 'hidden' || opacity < 0.15,
      aided: style.textShadow !== 'none' || parseFloat(style.webkitTextStrokeWidth || '0') > 0,
    });
  }
  let artwork = 0;
  const frames: Rect[] = [];
  for (const img of Array.from(document.querySelectorAll('img'))) {
    const r = img.getBoundingClientRect();
    const x = Math.max(r.left, 0), y = Math.max(r.top, 0), w = Math.max(0, Math.min(r.right, width) - x), h = Math.max(0, Math.min(r.bottom, height) - y);
    artwork += w * h;
    if (w * h > 0) frames.push({ x, y, w, h });
  }
  return { width, height, texts, artworkCoverage: Math.min(1, artwork / (width * height)), artwork: frames };
}

/** Runs in the page: sample luminance of a text-free screenshot behind each text region. */
export async function sampleBackgrounds({ png, regions }: { png: string; regions: Rect[][] }) {
  const image = new Image();
  image.src = png;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  const channel = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return regions.map(rects => {
    const area = rects.reduce((sum, r) => sum + r.w * r.h, 0) || 1;
    const out: number[] = [];
    for (const r of rects) {
      const points = Math.max(4, Math.round(160 * (r.w * r.h) / area));
      const columns = Math.max(2, Math.round(Math.sqrt(points * r.w / Math.max(1, r.h))));
      const rows = Math.max(2, Math.ceil(points / columns));
      for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) {
        const x = Math.floor(r.x + (i + 0.5) * r.w / columns), y = Math.floor(r.y + (j + 0.5) * r.h / rows);
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const k = (y * width + x) * 4;
        out.push(0.2126 * channel(data[k]) + 0.7152 * channel(data[k + 1]) + 0.0722 * channel(data[k + 2]));
      }
    }
    return out;
  });
}

const linear = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const luminance = ([r, g, b]: number[]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
export const contrastRatio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const percentile = (values: number[], p: number) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]; };
const intersect = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const penalty: Record<Severity, number> = { critical: 30, major: 12, minor: 4 };

/** Score a measured composition. `backgrounds[i]` are luminance samples behind `measure.texts[i]`. */
export function assessComposition(measure: CompositionMeasure, backgrounds: number[][] = []): Audit {
  const issues: AuditIssue[] = [];
  const add = (severity: Severity, code: string, message: string) => { if (!issues.some(issue => issue.code === code && issue.message === message)) issues.push({ severity, code, message }); };
  const visible = measure.texts.map((text, index) => ({ text, index })).filter(({ text }) => !text.hidden);
  const named = (text: TextMeasure) => text.role === 'text' ? `"${text.text.slice(0, 40)}" (${text.label})` : `${text.role} (${text.label})`;

  for (const role of ['headline', 'cta'] as const) {
    if (!visible.some(({ text }) => text.role === role)) add('critical', 'missing-' + role, `The ${role} is not visible in the render.`);
  }
  for (const { text, index } of visible) {
    const outside = text.rects.some(r => r.x < -1 || r.y < -1 || r.x + r.w > measure.width + 1 || r.y + r.h > measure.height + 1);
    if (outside) add('critical', 'off-canvas', `${named(text)} runs outside the 1080×1080 canvas.`);
    else if (text.clipped) add('critical', 'clipped', `${named(text)} is cut off by its container.`);
    const margin = Math.min(...text.rects.map(r => Math.min(r.x, r.y, measure.width - r.x - r.w, measure.height - r.y - r.h)));
    if (!outside && margin < 24) add('major', 'edge', `${named(text)} sits ${Math.max(0, Math.round(margin))}px from the canvas edge; keep text at least 64px in.`);
    else if (!outside && margin < 48) add('minor', 'edge', `${named(text)} is only ${Math.round(margin)}px from the edge; use the 64px safe margin.`);
    if (text.fontSize < 16) add('major', 'tiny-text', `${named(text)} is set at ${Math.round(text.fontSize)}px; use at least 18px.`);

    const samples = backgrounds[index] || [];
    if (text.color && text.color[3] > 0.1 && samples.length >= 4) {
      const ink = luminance(text.color);
      const ratios = samples.map(bg => contrastRatio(ink, bg));
      const effective = percentile(ratios, 0.2), worst = percentile(ratios, 0.05);
      const large = text.fontSize >= 24 || (text.fontSize >= 18.5 && text.fontWeight >= 700);
      const required = large ? 3 : 4.5;
      let severity: Severity | null = effective < 2 ? 'critical' : effective < required ? 'major' : worst < required * 0.8 ? 'minor' : null;
      if (severity && text.aided) severity = severity === 'critical' ? 'major' : severity === 'major' ? 'minor' : null;
      if (severity) add(severity, 'contrast', `${named(text)} has ${effective.toFixed(1)}:1 contrast against what is behind it (needs ${required}:1)${worst < effective * 0.8 ? '; the background behind it is busy' : ''}.`);
    }
  }
  for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
    const a = visible[i].text, b = visible[j].text;
    const overlap = a.rects.reduce((sum, ra) => sum + b.rects.reduce((s, rb) => s + intersect(ra, rb), 0), 0);
    const smaller = Math.min(...[a, b].map(t => t.rects.reduce((sum, r) => sum + r.w * r.h, 0))) || 1;
    if (overlap / smaller > 0.04) add('critical', 'overlap', `${named(a)} overlaps ${named(b)}.`);
  }
  const headline = visible.find(({ text }) => text.role === 'headline')?.text;
  if (headline) {
    const others = visible.filter(({ text }) => text !== headline && text.role !== 'brand').map(({ text }) => text.fontSize);
    const next = Math.max(0, ...others);
    if (headline.fontSize < 56) add('major', 'hierarchy', `The headline is only ${Math.round(headline.fontSize)}px; a 1080px ad headline needs roughly 72–160px to stop the scroll.`);
    else if (next && headline.fontSize < next * 1.5) add('major', 'hierarchy', `The headline (${Math.round(headline.fontSize)}px) is not dominant over other text (${Math.round(next)}px); aim for at least 2× the next size.`);
    const brand = visible.find(({ text }) => text.role === 'brand')?.text;
    if (brand && brand.fontSize > headline.fontSize) add('minor', 'brand-size', 'The brand name is larger than the headline; make it a secondary signature.');
  }
  // Web-page grammar: the most common way generated posts end up looking like a landing-page hero.
  const blocks = visible.map(({ text }) => text);
  const bounds = (rects: Rect[]) => ({ left: Math.min(...rects.map(r => r.x)), right: Math.max(...rects.map(r => r.x + r.w)), top: Math.min(...rects.map(r => r.y)), bottom: Math.max(...rects.map(r => r.y + r.h)) });
  const topRow = blocks.filter(text => bounds(text.rects).bottom < measure.height * 0.16 && text.role !== 'headline');
  if (topRow.some(text => bounds(text.rects).right < measure.width * 0.5) && topRow.some(text => bounds(text.rects).left > measure.width * 0.5))
    add('major', 'web-layout', 'Text in both top corners reads as a website navigation bar; keep a single brand signature and let the image lead.');
  // Judge the core message only; stray labels (e.g. cards drawn over the art) must not mask a hero split.
  const message = blocks.filter(text => ['headline', 'subhead', 'cta'].includes(text.role));
  const copy = message.length ? message : blocks.filter(text => text.role !== 'brand');
  const art = [...(measure.artwork || [])].sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (copy.length && art && art.w < measure.width * 0.75) {
    const text = bounds(copy.flatMap(t => t.rects));
    const separate = text.right <= art.x + 8 || text.left >= art.x + art.w - 8;
    if (separate) add('major', 'web-layout', 'Copy sits in its own column beside the artwork, like a website hero; integrate the type with the image (full-bleed artwork with type in its negative space, or type overlapping the subject).');
  }
  if (blocks.length > 5) add('major', 'web-layout', `${blocks.length} separate text blocks make it read like a web page; a post needs a headline, at most one supporting line, the CTA and the brand.`);
  const words = visible.reduce((sum, { text }) => sum + text.text.split(/\s+/).filter(Boolean).length, 0);
  if (words > 45) add('minor', 'copy-load', `The design shows about ${words} words; static ads read best under 30.`);
  const families = new Set(visible.map(({ text }) => text.fontFamily));
  if (families.size > 2) add('minor', 'typefaces', `${families.size} typefaces are used; limit the design to 2.`);
  const sizes = new Set(visible.map(({ text }) => Math.round(text.fontSize / 2)));
  if (sizes.size > 5) add('minor', 'type-scale', `${sizes.size} different text sizes are used; consolidate to 4 or fewer.`);
  if (measure.artworkCoverage < 0.12) add('minor', 'artwork-size', `The artwork covers only ${Math.round(measure.artworkCoverage * 100)}% of the canvas; give it a deliberate, generous presence.`);

  const order: Severity[] = ['critical', 'major', 'minor'];
  issues.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + penalty[issue.severity], 0));
  return { score, issues: issues.slice(0, 20) };
}

/** Quality bar for automatic refinement before a design is shown. */
export const needsRefinement = (audit: Audit) => audit.issues.some(issue => issue.severity === 'critical' || issue.code === 'web-layout') || audit.score < 70;
