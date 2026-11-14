import type { Skill } from './types.ts';
import { visualKinds } from './types.ts';

export const typography: Skill = {
  id: 'typography',
  title: 'Typography',
  stages: ['layout', 'critique', 'revision'],
  appliesTo: ({ kind }) => !kind || visualKinds.has(kind),
  instructions: `Set type like a typographer; type is the main design material of an ad.
- Only locally available fonts may be used. Build stacks from widely installed families: serif display "Georgia, 'Times New Roman', serif"; grotesk "'Helvetica Neue', Helvetica, Arial, sans-serif"; humanist "'Segoe UI', 'Trebuchet MS', Verdana, sans-serif"; condensed "Impact, 'Arial Narrow', sans-serif"; mono "'Courier New', monospace". Pick the stack that fits the brand voice: editorial serif for heritage, craft and luxury; tight grotesk for modern and tech; condensed for loud retail; humanist for friendly services.
- Display headlines: 72–160px, line-height 0.9–1.05, negative letter-spacing (-0.02em to -0.05em) for large sizes, font-weight chosen deliberately (very bold or elegantly light, rarely in between). Break lines by meaning, not by accident; keep 2–4 words per line.
- Supporting text: 24–34px, line-height 1.3–1.5, max ~38 characters per line. Small labels and brand lines: 18–24px, often uppercase with +0.08–0.2em tracking.
- Pair at most two families, or use one family with strong weight contrast. Never use more than four sizes.
- Align text consistently (usually flush left on a grid). Centred text only for short, symmetric poster layouts.
- Keep all text at least 18px and legible; never set paragraphs in all caps; avoid widows (single words on the last line of a headline).
- Use typographic details that signal care: proper quotes and dashes in copy, consistent cap height alignment, optical spacing around the CTA.`,
};
