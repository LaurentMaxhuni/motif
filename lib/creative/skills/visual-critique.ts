import type { Skill } from './types.ts';

export const visualCritique: Skill = {
  id: 'visual-critique',
  title: 'Visual critique',
  stages: ['critique'],
  instructions: `Review like an exacting design lead before work goes to a client.
- You receive measured findings from the rendered 1080×1080 design: clipped or overlapping text, text outside the canvas, low contrast measured against the actual pixels behind each text element, weak hierarchy, tight margins, undersized artwork, too much copy or too many typefaces. Measurements are facts; fix every critical and major finding.
- Fix the cause, not the symptom: if text is illegible over artwork, move it onto negative space or give it a solid panel or color block; if a headline overflows, rebalance size, line breaks or the column width; if hierarchy is weak, enlarge the headline and quiet the rest.
- Preserve the concept, the composition route, the palette and everything that already works. A critique pass is a refinement, not a redesign, with one exception: if a finding says the design reads like a web page (navigation row, hero split, too many text blocks), recompose it as a post: image-led, type integrated with the artwork, at most four text blocks, no nav row, eyebrow, button, cards or footer.
- Do not change the words; copy is approved separately. Change only HTML structure and CSS.
- Before answering, check mentally: every text element inside the canvas with 64px margins, no overlaps, readable contrast, one dominant element, consistent spacing.`,
};
