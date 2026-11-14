/** Turns measured, painted colors into a brand palette with roles. Pure and deterministic. */
import type { PaletteColor } from './brand-render.ts';

export type ColorRole = 'primary' | 'secondary' | 'accent' | 'text' | 'background' | 'surface';
export interface BrandColor { color: string; role: ColorRole; share: number; usage: string[] }

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
export function distance(a: string, b: string) {
  // Weighted RGB distance ("redmean"), close enough to perceptual for grouping swatches.
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b), r = (r1 + r2) / 2;
  return Math.sqrt((2 + r / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - r) / 256) * (b1 - b2) ** 2);
}
export const chroma = (hex: string) => { const values = rgb(hex); return Math.max(...values) - Math.min(...values); };
export const lightness = (hex: string) => { const [r, g, b] = rgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const isNeutral = (hex: string) => chroma(hex) < 28;

type Entry = Omit<PaletteColor, 'color'> & { color: string };
const roles = ['background', 'text', 'action', 'logo', 'heading'] as const;

/** Merge near-identical shades (anti-aliasing, hover states, rounding) into the dominant one. */
export function groupColors(colors: Entry[], threshold = 22): Entry[] {
  const groups: Entry[] = [];
  for (const color of [...colors].sort((a, b) => b.weight - a.weight)) {
    const target = groups.find(group => distance(group.color, color.color) < threshold);
    if (!target) { groups.push({ ...color }); continue; }
    for (const role of roles) target[role] += color[role];
    target.weight += color.weight;
  }
  return groups;
}

export function summarizePalette(measured: PaletteColor[]): BrandColor[] {
  const colors = groupColors(measured.filter(color => /^#[\da-f]{6}$/.test(color.color)));
  if (!colors.length) return [];
  const total = colors.reduce((sum, color) => sum + color.weight, 0) || 1;
  const usage = (color: Entry) => roles.filter(role => color[role] > color.weight * 0.08).map(role => role === 'action' ? 'buttons and links' : role === 'logo' ? 'logo' : role === 'heading' ? 'headlines' : role);
  const result: BrandColor[] = [];
  const take = (color: Entry | undefined, role: ColorRole) => {
    if (!color || result.some(item => distance(item.color, color.color) < 30)) return;
    result.push({ color: color.color, role, share: Math.round(color.weight / total * 1000) / 10, usage: usage(color) });
  };
  const sum = (role: typeof roles[number]) => colors.reduce((total, color) => total + color[role], 0) || 1;
  const totals = { background: sum('background'), text: sum('text') + sum('heading'), mark: sum('action') + sum('logo'), action: sum('action'), logo: sum('logo'), heading: sum('heading') };
  // Brand colors are the saturated ones people are steered toward. Each role is scored as a share of that role,
  // so a big illustration tint cannot outweigh the color on every button and in the logo.
  const brandScore = (color: Entry) => color.action / totals.action * 3 + color.logo / totals.logo * 3 + color.heading / totals.heading * 1.2 + color.background / totals.background * 1 + color.text / totals.text * 0.3;
  // A brand color must matter somewhere: on buttons and links, in the logo, in large fields or in a real share of the type.
  const significant = (color: Entry) => (color.action + color.logo) / totals.mark >= 0.03 || color.background / totals.background >= 0.004 || (color.text + color.heading) / totals.text >= 0.05;
  const chromatic = colors.filter(color => !isNeutral(color.color) && significant(color)).sort((a, b) => brandScore(b) - brandScore(a));
  const neutrals = colors.filter(color => isNeutral(color.color));
  const background = [...colors].sort((a, b) => b.background - a.background)[0];
  const text = [...colors].filter(color => color.text + color.heading > 0 && distance(color.color, background.color) > 120).sort((a, b) => (b.text + b.heading) - (a.text + a.heading))[0];
  take(chromatic[0], 'primary');
  take(chromatic.find(color => !result.some(item => distance(item.color, color.color) < 60)), 'secondary');
  for (const color of chromatic.slice(1)) if (result.length < 5 && brandScore(color) > brandScore(chromatic[0]) * 0.04) take(color, 'accent');
  // Brands that use black and white only: the strongest dark or light neutral is the primary.
  if (!result.length) take(neutrals.filter(color => color.action + color.logo + color.heading > 0).sort((a, b) => brandScore(b) - brandScore(a))[0], 'primary');
  take(text, 'text');
  take(background, 'background');
  const surface = neutrals.filter(color => color.background > 0 && color.color !== background.color).sort((a, b) => b.background - a.background)[0];
  if (surface && Math.abs(lightness(surface.color) - lightness(background.color)) > 0.02) take(surface, 'surface');
  return result.slice(0, 8);
}

/** The colors saved on the brand: brand colors first, then text and background, at most six. */
export function brandColorsFrom(palette: BrandColor[]) {
  const order: ColorRole[] = ['primary', 'secondary', 'accent', 'text', 'background', 'surface'];
  return [...palette].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role)).map(item => item.color).slice(0, 6);
}
