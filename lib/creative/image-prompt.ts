import type { Settings } from '../../src/lib/types.ts';

/** Image models follow named colors far better than hex codes. */
export function colorName(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!match) return '';
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(channel => channel / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  if (saturation < 0.12 || max - min < 0.06) {
    return lightness > 0.92 ? 'off-white' : lightness > 0.7 ? 'light grey' : lightness > 0.4 ? 'mid grey' : lightness > 0.15 ? 'charcoal' : 'near-black';
  }
  let hue = 0;
  if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
  else if (max === g) hue = (b - r) / (max - min) + 2;
  else hue = (r - g) / (max - min) + 4;
  hue *= 60;
  const names: [number, string][] = [[12, 'red'], [35, 'orange'], [48, 'amber'], [64, 'yellow'], [80, 'olive'], [162, 'green'], [182, 'teal'], [195, 'cyan'], [215, 'sky blue'], [245, 'blue'], [265, 'indigo'], [290, 'violet'], [320, 'magenta'], [345, 'pink'], [361, 'red']];
  let name = names.find(([limit]) => hue < limit)![1];
  if (name === 'orange' && lightness < 0.4) name = 'brown';
  if (name === 'pink' && lightness < 0.45) name = 'crimson';
  const tone = lightness < 0.25 ? 'deep ' : lightness > 0.8 ? 'pale ' : saturation < 0.35 ? 'muted ' : saturation > 0.8 && lightness > 0.4 && lightness < 0.65 ? 'vivid ' : '';
  return tone + name;
}

export interface ImagePromptInput {
  /** The layout-specific artwork brief written by the text model. */
  prompt: string;
  /** Art direction from the approved concept, when available. */
  artDirection?: string;
  brandColors?: string[];
  provider?: Settings['imageProvider'];
}

export const imagePromptLimit = (provider?: Settings['imageProvider']) => provider === 'cloudflare' ? 2048 : 4000;

const finish = 'Square 1:1 frame for a 1080×1080 social advertisement; keep the described negative space genuinely empty so typography can sit on it. Professional commercial finish: intentional light, real materials and textures, believable proportions, crisp focus on the hero subject, natural imperfections.';
const noText = 'The image contains no text, letters, numbers, logos, labels, signage, watermarks, frames or interface elements.';

function clip(value: string, max: number) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const sentence = cut.lastIndexOf('. ');
  return (sentence > max * 0.6 ? cut.slice(0, sentence + 1) : cut.replace(/\s+\S*$/, '')).trim();
}

/**
 * Turn a layout's artwork brief into a provider-ready prompt. Provider
 * independent: image models receive the same structured natural-language
 * brief, only bounded to the provider's prompt limit.
 */
export function buildImagePrompt({ prompt, artDirection, brandColors = [], provider }: ImagePromptInput) {
  const limit = imagePromptLimit(provider);
  const brief = prompt.trim().replace(/\s+/g, ' ');
  const palette = [...new Set(brandColors.map(colorName).filter(Boolean))].slice(0, 3);
  const direction = artDirection?.trim().replace(/\s+/g, ' ');
  // Display order; when space runs out, drop the generic finish first, then palette, then art direction.
  // The no-text rule is never dropped.
  let extras = [
    direction && !brief.toLowerCase().includes(direction.toLowerCase().slice(0, 40)) ? `Art direction: ${direction}` : '',
    palette.length ? `Color direction: lean on ${palette.join(', ')} for backdrop, props or light.` : '',
    finish,
  ].filter(Boolean);
  const join = (parts: string[]) => parts.map(part => /[.!?]$/.test(part) ? part : part + '.').join(' ');
  while (extras.length && join([brief, ...extras, noText]).length > limit) extras = extras.slice(0, -1);
  const tail = join([...extras, noText]);
  return join([clip(brief, Math.max(200, limit - tail.length - 1)), tail]).slice(0, limit);
}
