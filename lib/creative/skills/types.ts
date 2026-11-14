/**
 * A skill is a focused block of professional craft knowledge that Motif injects
 * into model instructions for the workflow stages where it matters. Skills never
 * define output formats; each stage owns its own contract.
 */
export type SkillStage =
  | 'concept'   // creative direction: choosing what to say and how it should look
  | 'copy'      // writing headlines, body and CTAs
  | 'layout'    // building the HTML/CSS composition and its artwork brief
  | 'artwork'   // writing prompts for image models
  | 'critique'  // fixing measured visual problems in a rendered design
  | 'revision'; // applying a person's change request to a finished design

export interface SkillContext {
  kind?: string;
  channel?: string;
}

export interface Skill {
  id: string;
  title: string;
  stages: readonly SkillStage[];
  /** Restrict a skill to some content kinds, e.g. only visual formats. */
  appliesTo?: (context: SkillContext) => boolean;
  instructions: string | ((context: SkillContext) => string);
}

export const visualKinds = new Set(['Social post', 'Ad creative']);
