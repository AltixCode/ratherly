import {
  CATEGORIES,
  FREE_CATEGORY,
  PROMPTS,
  canUseCategory,
  nextPrompt,
  progressIn,
  promptById,
  promptsForCycle,
  promptsIn,
  resetActivePool,
  setActivePool,
} from "../prompts";

describe("the bundled deck", () => {
  it("has prompts in every listed category", () => {
    // A category chip that opens an empty pack is worse than no chip.
    for (const category of CATEGORIES) {
      expect(promptsIn(category.id).length).toBeGreaterThan(0);
    }
  });

  it("gives every prompt a unique id", () => {
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length);
  });

  it("gives every prompt two distinct, non-empty options", () => {
    for (const prompt of PROMPTS) {
      expect(prompt.a.trim().length).toBeGreaterThan(0);
      expect(prompt.b.trim().length).toBeGreaterThan(0);
      expect(prompt.a).not.toBe(prompt.b);
    }
  });

  it("only uses categories that exist", () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const prompt of PROMPTS) expect(ids.has(prompt.category)).toBe(true);
  });

  it("finds a prompt by id, and returns undefined for one that is not there", () => {
    expect(promptById(PROMPTS[0]!.id)).toEqual(PROMPTS[0]);
    expect(promptById("no-such-prompt")).toBeUndefined();
  });
});

describe("setActivePool / resetActivePool", () => {
  afterEach(() => resetActivePool());

  it("defaults to the bundled deck", () => {
    expect(promptsIn(FREE_CATEGORY)).toEqual(
      PROMPTS.filter((p) => p.category === FREE_CATEGORY),
    );
  });

  it("swaps every read over to the given pool", () => {
    const swapped = [
      { id: "everyday-swapped", category: "everyday", a: "A", b: "B" },
    ];
    setActivePool(swapped);
    expect(promptsIn("everyday")).toEqual(swapped);
    expect(promptById("everyday-swapped")).toEqual(swapped[0]);
    expect(promptById(PROMPTS[0]!.id)).toBeUndefined();
  });

  it("restores the bundled deck", () => {
    setActivePool([]);
    resetActivePool();
    expect(promptById(PROMPTS[0]!.id)).toEqual(PROMPTS[0]);
  });
});

describe("canUseCategory", () => {
  it("gives a free player exactly one pack", () => {
    expect(canUseCategory(FREE_CATEGORY, false)).toBe(true);
    for (const category of CATEGORIES.filter((c) => c.id !== FREE_CATEGORY)) {
      expect(canUseCategory(category.id, false)).toBe(false);
    }
  });

  it("gives a paying player all of them", () => {
    for (const category of CATEGORIES)
      expect(canUseCategory(category.id, true)).toBe(true);
  });

  it("refuses a category that does not exist, whoever asks", () => {
    expect(canUseCategory("invented", true)).toBe(false);
  });
});

describe("nextPrompt", () => {
  it("starts at the first prompt of a pack", () => {
    expect(nextPrompt(FREE_CATEGORY, new Set())).toEqual(
      promptsIn(FREE_CATEGORY)[0],
    );
  });

  it("skips what has been answered", () => {
    const [first, second] = promptsIn(FREE_CATEGORY);
    expect(nextPrompt(FREE_CATEGORY, new Set([first!.id]))).toEqual(second);
  });

  it("is deterministic, so closing the app does not re-roll the deck", () => {
    const answered = new Set([promptsIn(FREE_CATEGORY)[0]!.id]);
    expect(nextPrompt(FREE_CATEGORY, answered)).toEqual(
      nextPrompt(FREE_CATEGORY, answered),
    );
  });

  it("is null once the pack is finished", () => {
    const all = new Set(promptsIn(FREE_CATEGORY).map((p) => p.id));
    expect(nextPrompt(FREE_CATEGORY, all)).toBeNull();
  });

  it("is null for a category that does not exist", () => {
    expect(nextPrompt("invented", new Set())).toBeNull();
  });

  it("starts a fresh cycle with a different order than cycle 0", () => {
    // The literal bug reported: "have another round" cleared the answers but the pack
    // always restarted from promptsIn(category)[0] in the same fixed order, so a replayed
    // pack looked identical to the one before it.
    expect(nextPrompt(FREE_CATEGORY, new Set(), 1)).not.toEqual(
      nextPrompt(FREE_CATEGORY, new Set(), 0),
    );
  });

  it("stays deterministic within one cycle, preserving the mid-pack resume guarantee", () => {
    const answered = new Set([promptsForCycle(FREE_CATEGORY, 3)[0]!.id]);
    expect(nextPrompt(FREE_CATEGORY, answered, 3)).toEqual(
      nextPrompt(FREE_CATEGORY, answered, 3),
    );
  });
});

describe("promptsForCycle", () => {
  it("contains exactly the same prompts as promptsIn, only reordered", () => {
    const ordered = promptsForCycle(FREE_CATEGORY, 5);
    expect([...ordered].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...promptsIn(FREE_CATEGORY)].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it("gives the same cycle the same order every time", () => {
    expect(promptsForCycle(FREE_CATEGORY, 5)).toEqual(
      promptsForCycle(FREE_CATEGORY, 5),
    );
  });

  it("gives different cycles different orders", () => {
    const a = promptsForCycle(FREE_CATEGORY, 5).map((p) => p.id);
    const b = promptsForCycle(FREE_CATEGORY, 6).map((p) => p.id);
    expect(a.join()).not.toBe(b.join());
  });
});

describe("progressIn", () => {
  it("counts what is done out of what there is", () => {
    const all = promptsIn(FREE_CATEGORY);
    expect(progressIn(FREE_CATEGORY, new Set())).toEqual({
      done: 0,
      total: all.length,
    });
    expect(
      progressIn(FREE_CATEGORY, new Set([all[0]!.id, all[1]!.id])),
    ).toEqual({
      done: 2,
      total: all.length,
    });
  });

  it("ignores answers from other categories", () => {
    // Otherwise a player who finished one pack appears to have finished them all.
    const other = promptsIn("food")[0]!;
    expect(progressIn(FREE_CATEGORY, new Set([other.id])).done).toBe(0);
  });
});
