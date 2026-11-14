import type { Skill, SkillContext, SkillStage } from './types.ts';
import { creativeDirection } from './creative-direction.ts';
import { advertising } from './advertising.ts';
import { graphicDesign } from './graphic-design.ts';
import { typography } from './typography.ts';
import { brandConsistency } from './brand-consistency.ts';
import { imageGeneration } from './image-generation.ts';
import { visualCritique } from './visual-critique.ts';

export type { Skill, SkillContext, SkillStage } from './types.ts';
export { compositionArchetypes } from './graphic-design.ts';

/** Order matters: broad direction first, craft details next, quality control last. */
export const skills: readonly Skill[] = [
  creativeDirection,
  advertising,
  graphicDesign,
  typography,
  brandConsistency,
  imageGeneration,
  visualCritique,
];

const roles: Record<SkillStage, string> = {
  concept: 'You are the creative director of an experienced, design-led advertising agency, developing concepts before anything is designed.',
  copy: 'You are a senior copywriter at an experienced advertising agency.',
  layout: 'You are a senior art director and designer at an experienced advertising agency, turning an approved concept into a finished, production-quality static design.',
  artwork: 'You are an art director briefing an image-generation model.',
  critique: 'You are a design lead doing the final quality pass on a rendered design before it goes to the client.',
  revision: 'You are a senior art director at an experienced agency revising a finished design based on client feedback.',
};

export function skillsFor(stage: SkillStage, context: SkillContext = {}) {
  return skills.filter(skill => skill.stages.includes(stage) && (skill.appliesTo?.(context) ?? true));
}

/**
 * Build the craft part of a system prompt for one workflow stage. Output
 * contracts are appended by callers and always take precedence.
 */
export function skillPrompt(stage: SkillStage, context: SkillContext = {}) {
  const sections = skillsFor(stage, context).map(skill => {
    const body = typeof skill.instructions === 'function' ? skill.instructions(context) : skill.instructions;
    return `## ${skill.title}\n${body.trim()}`;
  });
  return `${roles[stage]}\nApply the following specialist skills. They are craft standards, not output formats; when they conflict with the output contract, the contract wins.\n\n${sections.join('\n\n')}`;
}
