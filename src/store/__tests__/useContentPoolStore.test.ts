import { PROMPTS, promptById, resetActivePool } from "@/logic/prompts";
import { useContentPoolStore } from "../useContentPoolStore";
import { useAnswerStore } from "../useAnswerStore";

jest.mock("@/content/sync", () => ({
  cachedPromptPool: jest.fn(),
  fetchPromptPool: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sync = require("@/content/sync") as {
  cachedPromptPool: jest.Mock;
  fetchPromptPool: jest.Mock;
};

const REMOTE = [
  { id: "everyday-0", category: "everyday", a: "Remote A", b: "Remote B" },
];

beforeEach(() => {
  jest.clearAllMocks();
  resetActivePool();
  useContentPoolStore.setState({ synced: false });
  useAnswerStore.setState({ answers: [], category: "everyday" });
});

it("swaps in the synced deck when the category has not been started", async () => {
  sync.cachedPromptPool.mockResolvedValue(null);
  sync.fetchPromptPool.mockResolvedValue(REMOTE);

  await useContentPoolStore.getState().refresh();

  expect(promptById("everyday-0")).toEqual(REMOTE[0]);
  expect(useContentPoolStore.getState().synced).toBe(true);
});

it("does not swap the deck while the selected category is mid-pack", async () => {
  sync.cachedPromptPool.mockResolvedValue(null);
  sync.fetchPromptPool.mockResolvedValue(REMOTE);
  useAnswerStore.setState({
    category: "everyday",
    answers: [{ promptId: PROMPTS[0]!.id, side: "a", at: 1 }],
  });

  await useContentPoolStore.getState().refresh();

  expect(promptById("everyday-0")).toEqual(PROMPTS[0]);
  expect(useContentPoolStore.getState().synced).toBe(true);
});

it("swaps once the selected category's pack is finished", async () => {
  sync.cachedPromptPool.mockResolvedValue(null);
  sync.fetchPromptPool.mockResolvedValue(REMOTE);
  useAnswerStore.setState({
    category: "everyday",
    answers: PROMPTS.filter((p) => p.category === "everyday").map((p) => ({
      promptId: p.id,
      side: "a" as const,
      at: 1,
    })),
  });

  await useContentPoolStore.getState().refresh();

  expect(promptById("everyday-0")).toEqual(REMOTE[0]);
});
