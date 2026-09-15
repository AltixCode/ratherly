import {
  CATEGORIES,
  FREE_CATEGORY,
  PROMPTS,
  canUseCategory,
  nextPrompt,
  progressIn,
  promptById,
  promptsIn,
} from '../prompts';

describe('the bundled deck', () => {
  it('has prompts in every listed category', () => {
    // A category chip that opens an empty pack is worse than no chip.
    for (const category of CATEGORIES) {
      expect(promptsIn(category.id).length).toBeGreaterThan(0);
    }
  });

  it('gives every prompt a unique id', () => {
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length);
  });

  it('gives every prompt two distinct, non-empty options', () => {
    for (const prompt of PROMPTS) {
      expect(prompt.a.trim().length).toBeGreaterThan(0);
      expect(prompt.b.trim().length).toBeGreaterThan(0);
      expect(prompt.a).not.toBe(prompt.b);
    }
  });

  it('only uses categories that exist', () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const prompt of PROMPTS) expect(ids.has(prompt.category)).toBe(true);
  });

  it('finds a prompt by id, and returns undefined for one that is not there', () => {
    expect(promptById(PROMPTS[0]!.id)).toEqual(PROMPTS[0]);
    expect(promptById('no-such-prompt')).toBeUndefined();
  });
});

describe('canUseCategory', () => {
  it('gives a free player exactly one pack', () => {
    expect(canUseCategory(FREE_CATEGORY, false)).toBe(true);
    for (const category of CATEGORIES.filter((c) => c.id !== FREE_CATEGORY)) {
      expect(canUseCategory(category.id, false)).toBe(false);
    }
  });

  it('gives a paying player all of them', () => {
    for (const category of CATEGORIES) expect(canUseCategory(category.id, true)).toBe(true);
  });

  it('refuses a category that does not exist, whoever asks', () => {
    expect(canUseCategory('invented', true)).toBe(false);
  });
});

describe('nextPrompt', () => {
  it('starts at the first prompt of a pack', () => {
    expect(nextPrompt(FREE_CATEGORY, new Set())).toEqual(promptsIn(FREE_CATEGORY)[0]);
  });

  it('skips what has been answered', () => {
    const [first, second] = promptsIn(FREE_CATEGORY);
    expect(nextPrompt(FREE_CATEGORY, new Set([first!.id]))).toEqual(second);
  });

  it('is deterministic, so closing the app does not re-roll the deck', () => {
    const answered = new Set([promptsIn(FREE_CATEGORY)[0]!.id]);
    expect(nextPrompt(FREE_CATEGORY, answered)).toEqual(nextPrompt(FREE_CATEGORY, answered));
  });

  it('is null once the pack is finished', () => {
    const all = new Set(promptsIn(FREE_CATEGORY).map((p) => p.id));
    expect(nextPrompt(FREE_CATEGORY, all)).toBeNull();
  });

  it('is null for a category that does not exist', () => {
    expect(nextPrompt('invented', new Set())).toBeNull();
  });
});

describe('progressIn', () => {
  it('counts what is done out of what there is', () => {
    const all = promptsIn(FREE_CATEGORY);
    expect(progressIn(FREE_CATEGORY, new Set())).toEqual({ done: 0, total: all.length });
    expect(progressIn(FREE_CATEGORY, new Set([all[0]!.id, all[1]!.id]))).toEqual({
      done: 2,
      total: all.length,
    });
  });

  it('ignores answers from other categories', () => {
    // Otherwise a player who finished one pack appears to have finished them all.
    const other = promptsIn('food')[0]!;
    expect(progressIn(FREE_CATEGORY, new Set([other.id])).done).toBe(0);
  });
});
