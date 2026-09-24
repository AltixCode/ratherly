import AsyncStorage from "@react-native-async-storage/async-storage";

import { PROMPTS } from "@/logic/prompts";
import { CONTENT_BASE_URL, cachedPromptPool, fetchPromptPool } from "../sync";

const RAW = { category: "everyday", a: "Option A", b: "Option B" };

const install = (fn: unknown) => {
  (globalThis as { fetch?: unknown }).fetch = fn;
};

const ok = (body: unknown) =>
  jest.fn(async () => ({ ok: true, status: 200, json: async () => body }));

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe("fetchPromptPool", () => {
  it("hits the content-drip prompts pool for this app", async () => {
    const fetcher = ok({ items: [RAW] });
    install(fetcher);
    await fetchPromptPool();
    expect((fetcher as jest.Mock).mock.calls[0]![0]).toBe(
      `${CONTENT_BASE_URL}/api/v1/ratherly/prompts/all`,
    );
  });

  it("reconstructs ids in the bundled deck's shape, per category", async () => {
    install(
      ok({
        items: [
          RAW,
          { ...RAW, a: "Second A" },
          { ...RAW, category: "food", a: "Food A" },
        ],
      }),
    );
    const pool = await fetchPromptPool();
    expect(pool.map((p) => p.id)).toEqual([
      "everyday-0",
      "everyday-1",
      "food-0",
    ]);
  });

  it("falls back to the bundled deck on a network failure", async () => {
    install(
      jest.fn(async () => {
        throw new Error("Network request failed");
      }),
    );
    expect(await fetchPromptPool()).toEqual(PROMPTS);
  });

  it("falls back to the bundled deck on an HTTP error", async () => {
    install(
      jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    );
    expect(await fetchPromptPool()).toEqual(PROMPTS);
  });

  it("falls back to the bundled deck on a malformed response", async () => {
    install(ok({ items: [{ a: "only a" }] }));
    expect(await fetchPromptPool()).toEqual(PROMPTS);
  });

  it("falls back to the bundled deck on an empty pool", async () => {
    install(ok({ items: [] }));
    expect(await fetchPromptPool()).toEqual(PROMPTS);
  });

  it("caches a successful fetch for cachedPromptPool to read back", async () => {
    install(ok({ items: [RAW] }));
    await fetchPromptPool();
    const cached = await cachedPromptPool();
    expect(cached).toEqual([{ id: "everyday-0", ...RAW }]);
  });
});

describe("cachedPromptPool", () => {
  it("is null when nothing has been cached yet", async () => {
    expect(await cachedPromptPool()).toBeNull();
  });

  it("is null when the cache holds garbage", async () => {
    await AsyncStorage.setItem(
      "ratherly.content.v1.prompts",
      "not json at all {{{",
    );
    expect(await cachedPromptPool()).toBeNull();
  });
});
