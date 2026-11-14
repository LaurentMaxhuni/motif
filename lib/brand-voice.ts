/**
 * Deterministic reading of a brand's writing: how it sounds (sentence length,
 * person, formality, casing, vocabulary) and the figures it quotes. Every
 * observation is measured from the website copy, never guessed.
 */
export interface Quote { quote: string; sourceUrl: string }
export interface Figure { figure: string; context: string; sourceUrl: string }
export interface VoiceProfile {
  summary: string;
  traits: string[];
  metrics: { sentences: number; words: number; averageSentenceWords: number; readingEase: number; youPer100: number; wePer100: number; contractionsPer100: number; exclamationShare: number; questionShare: number; headlineCase: 'sentence' | 'title' | 'upper' | 'mixed'; usesEmoji: boolean };
  vocabulary: string[];
}

const stop = new Set('a an and are as at be been but by can do does for from has have how i if in into is it its just more most no not of on one or our out so than that the their them then there these they this to up us was we what when which who will with you your yours all any about also get new make every each over very only like may per via both such here use used using own way well'.split(' '));
const count = (text: string, pattern: RegExp) => (text.match(pattern) || []).length;
const syllables = (word: string) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  return Math.max(1, (w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g) || []).length);
};

function headlineCase(headings: string[]): VoiceProfile['metrics']['headlineCase'] {
  const sample = headings.filter(h => h.split(/\s+/).length >= 3 && /[a-z]/i.test(h)).slice(0, 40);
  if (!sample.length) return 'mixed';
  const tally = { sentence: 0, title: 0, upper: 0 };
  for (const heading of sample) {
    const words = heading.split(/\s+/).filter(word => /^[a-z]/i.test(word) && !stop.has(word.toLowerCase()));
    if (heading === heading.toUpperCase()) tally.upper++;
    else if (words.length >= 2 && words.slice(1).filter(word => /^[A-Z]/.test(word)).length / Math.max(1, words.length - 1) >= 0.7) tally.title++;
    else tally.sentence++;
  }
  const [winner, votes] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return votes / sample.length >= 0.6 ? winner as 'sentence' | 'title' | 'upper' : 'mixed';
}

export function voiceProfile(blocks: Quote[], headings: string[]): VoiceProfile | undefined {
  const text = blocks.map(block => block.quote).join(' ');
  const words = text.match(/[\p{L}\p{N}'’-]+/gu) || [];
  if (words.length < 40) return undefined;
  const sentences = text.split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"“])/u).filter(sentence => /\p{L}/u.test(sentence));
  const per100 = (n: number) => Math.round(n / words.length * 1000) / 10;
  const averageSentenceWords = Math.round(words.length / Math.max(1, sentences.length) * 10) / 10;
  const readingEase = Math.round(206.835 - 1.015 * averageSentenceWords - 84.6 * (words.reduce((sum, word) => sum + syllables(word), 0) / words.length));
  const youPer100 = per100(count(text, /\byou(?:r|rs|rself|'re|’re|'ll|’ll|'ve|’ve)?\b/gi));
  const wePer100 = per100(count(text, /\b(?:we|our|ours|us|we're|we’re|we've|we’ve)\b/gi));
  const contractionsPer100 = per100(count(text, /\b\p{L}+['’](?:re|s|t|ll|ve|d|m)\b/giu));
  const exclamationShare = Math.round(count(text, /!/g) / Math.max(1, sentences.length) * 100) / 100;
  const questionShare = Math.round(count(text, /\?/g) / Math.max(1, sentences.length) * 100) / 100;
  const usesEmoji = /\p{Emoji_Presentation}/u.test(text + headings.join(' '));
  const casing = headlineCase(headings);
  const traits = [
    averageSentenceWords <= 12 ? `Short, punchy sentences (about ${Math.round(averageSentenceWords)} words)` : averageSentenceWords <= 19 ? `Medium-length sentences (about ${Math.round(averageSentenceWords)} words)` : `Long, detailed sentences (about ${Math.round(averageSentenceWords)} words)`,
    youPer100 > wePer100 * 1.5 && youPer100 >= 0.8 ? 'Talks to the reader as "you"' : wePer100 > youPer100 * 1.5 && wePer100 >= 0.8 ? 'Talks about itself as "we"' : 'Balances "we" and "you"',
    contractionsPer100 >= 0.8 ? "Conversational, uses contractions (we're, you'll)" : 'Fairly formal, few contractions',
    exclamationShare >= 0.08 ? 'Energetic, uses exclamation marks' : 'Calm, rarely uses exclamation marks',
    readingEase >= 60 ? 'Plain and easy to read' : readingEase >= 40 ? 'Moderately complex wording' : 'Dense or technical wording',
    casing === 'sentence' ? 'Headlines in sentence case' : casing === 'title' ? 'Headlines in Title Case' : casing === 'upper' ? 'Headlines in capitals' : '',
    usesEmoji ? 'Uses emoji' : '',
    questionShare >= 0.12 ? 'Asks the reader questions' : '',
  ].filter(Boolean);
  const frequency = new Map<string, number>();
  for (const word of words.map(word => word.toLowerCase().replace(/['’]s$/, ''))) if (word.length > 3 && !stop.has(word) && !/^\d/.test(word)) frequency.set(word, (frequency.get(word) || 0) + 1);
  const vocabulary = [...frequency].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([word]) => word);
  return {
    summary: traits.slice(0, 5).join('. ') + '.',
    traits,
    metrics: { sentences: sentences.length, words: words.length, averageSentenceWords, readingEase, youPer100, wePer100, contractionsPer100, exclamationShare, questionShare, headlineCase: casing, usesEmoji },
    vocabulary,
  };
}

const countNouns = 'customers?|clients?|users?|members?|subscribers?|teams?|companies|businesses|brands|organi[sz]ations|countries|cities|stores|shops|locations|offices|markets|years|reviews|ratings|downloads|installs|people|employees|experts|partners|projects|orders|products|integrations|languages|hours|minutes|patients|students|creators|developers|merchants|restaurants|hotels|homes|transactions|deliveries|cups|meals|trees';
const figurePattern = new RegExp([
  String.raw`[$€£¥₹]\s?\d[\d,.]*\s?(?:k|m|bn|b|million|billion)?\+?`,
  String.raw`\b\d[\d,.]*\s?%`,
  String.raw`\b\d+(?:\.\d+)?\s?(?:x|×)\b`,
  String.raw`\b\d+(?:[.,]\d+)?\s?(?:k|m|bn|b|million|billion|thousand)\+?(?=\s|$|[.,])`,
  String.raw`\b\d[\d,.]*\+?\s+(?:[a-z-]+\s+){0,2}(?:${countNouns})\b`,
  String.raw`\b\d(?:\.\d)?\s?(?:\/\s?5|out of 5|stars?)\b`,
  String.raw`\b(?:since|founded in|established in|est\.?)\s+(?:19|20)\d{2}\b`,
  String.raw`\b(?:24\/7|99(?:\.\d+)?%)`,
].join('|'), 'gi');
const noise = /(?:©|copyright|all rights reserved|\bcookie|\bterms\b|privacy|\+\d{1,3}[\s-]?\(?\d|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b|\b(?:mon|tue|wed|thu|fri|sat|sun)\w*\s+\d|\b\d{1,2}:\d{2}\b|\bv\d+\.\d+)/i;

/** Statistics, prices, ratings and dates the brand quotes about itself. */
export function findFigures(blocks: Quote[], cap = 24): Figure[] {
  const figures = new Map<string, Figure>();
  for (const block of blocks) {
    const text = block.quote.replace(/\s+/g, ' ').trim();
    if (text.length > 280 || noise.test(text)) continue;
    for (const match of text.matchAll(figurePattern)) {
      const figure = match[0].trim().replace(/\s+/g, ' ');
      if (/^\d{4}$/.test(figure) || /^0+%?$/.test(figure) || /\b(?:fortune|top|series|section|chapter|step|level|tier)\s*$/i.test(text.slice(0, match.index!))) continue;
      // The sentence around the figure; decimal points and abbreviations are not sentence ends.
      const ends = [...text.matchAll(/[.!?](?=\s|$)/g)].map(end => end.index!);
      const start = (ends.filter(end => end < match.index!).at(-1) ?? -1) + 1, end = ends.find(end => end >= match.index! + match[0].length);
      const context = text.slice(start, end !== undefined && end - start <= 200 ? end + 1 : Math.min(text.length, start + 200)).trim();
      const key = figure.toLowerCase() + '|' + context.toLowerCase();
      if (!figures.has(key) && ![...figures.values()].some(other => other.figure.toLowerCase() === figure.toLowerCase() || (other.context === context && other.figure.includes(figure)))) figures.set(key, { figure, context, sourceUrl: block.sourceUrl });
      if (figures.size >= cap) return [...figures.values()];
    }
  }
  return [...figures.values()];
}
