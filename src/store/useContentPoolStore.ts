/**
 * Syncs the prompt deck shown by `src/logic/prompts.ts` with content-drip on
 * launch.
 *
 * "on launch, then leave it alone" — a full-sync pool has no per-day
 * cadence to chase, so there is nothing to poll for during a session. Unlike
 * quizburst's single `current` question, ratherly has no committed
 * "question on screen" state — the next prompt is derived fresh from the
 * answered set on every render — so "already in progress" here means "the
 * selected category's pack has been started but not finished": swapping the
 * deck mid-pack could change the very dilemma someone is reading. The swap
 * is skipped in that window and picked up on the next natural boundary
 * (pack finished, or a fresh category with nothing answered yet).
 */
import { create } from "zustand";

import { promptById, promptsIn, setActivePool } from "@/logic/prompts";
import { cachedPromptPool, fetchPromptPool } from "@/content/sync";
import { useAnswerStore } from "@/store/useAnswerStore";

interface ContentPoolState {
  /** True once a sync (successful or fallen back) has completed at least once. */
  synced: boolean;
  refresh: () => Promise<void>;
}

/** Whether it is safe to swap the active pool right now. */
function nothingInProgress(): boolean {
  const { category, answers } = useAnswerStore.getState();
  const answeredInCategory = answers.filter(
    (a) => promptById(a.promptId)?.category === category,
  ).length;
  const total = promptsIn(category).length;
  return answeredInCategory === 0 || answeredInCategory >= total;
}

export const useContentPoolStore = create<ContentPoolState>((set) => ({
  synced: false,

  async refresh() {
    const cached = await cachedPromptPool();
    if (cached && nothingInProgress()) setActivePool(cached);

    const fresh = await fetchPromptPool();
    if (nothingInProgress()) setActivePool(fresh);
    set({ synced: true });
  },
}));
