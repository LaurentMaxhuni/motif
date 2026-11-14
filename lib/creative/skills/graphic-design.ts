import type { Skill } from './types.ts';
import { visualKinds } from './types.ts';

/** Named composition routes the concept stage can pick from and the layout stage can execute. */
export const compositionArchetypes = [
  'full-bleed artwork with type set into its negative space',
  'split field: artwork on one side, solid color block with type on the other',
  'oversized headline that crops off one edge, artwork tucked behind or beside it',
  'hero object isolated on a confident flat color field',
  'editorial grid with strong margins, a rule line and a framed image',
  'frame within a frame: artwork inset in a bold colored border',
  'diagonal tension: artwork and type arranged on a strong diagonal',
  'poster stack: big type block on top, artwork band below',
] as const;

export const graphicDesign: Skill = {
  id: 'graphic-design',
  title: 'Graphic design and composition',
  stages: ['concept', 'layout', 'critique', 'revision'],
  appliesTo: ({ kind }) => !kind || visualKinds.has(kind),
  instructions: `Compose like an art director at a design-led agency.
- Choose one composition route and commit to it. Routes: ${compositionArchetypes.join('; ')}.
- Hierarchy: the eye must travel in a deliberate order — visual or headline first, then supporting line, then CTA, then brand. Make the first element unmistakably dominant through scale (headline at least ~2× the next text size), weight, contrast or isolation.
- Use a grid. On 1080×1080 keep at least 64px outer margins for all text; align elements to shared edges; repeat the same spacing values (e.g. 16/24/40/64/96px). Random offsets look accidental.
- Negative space is an active element. Leave real breathing room around the headline and the hero subject; do not fill every corner.
- Contrast: every piece of text must sit on a background it clearly separates from. Over artwork, place text only on calm negative space, or add a solid panel, a strong scrim or a color block behind it.
- Restraint: at most 3 colors besides artwork (usually brand colors plus one neutral), at most 2 typefaces, at most 4 text sizes. Decorative shapes must reinforce the idea or the grid, never just fill space.
- Size the artwork with purpose: either generously (at least ~40% of the canvas) or as a deliberate small object in a large field. Avoid medium-sized, centred, apologetic images.
- The CTA should look actionable (a pill, an underline or a clear block) but must not compete with the headline.
- Everything must be fully inside the 1080×1080 canvas: no clipped words, no overlapping text, no text touching edges. Artwork may bleed off edges intentionally.`,
};
