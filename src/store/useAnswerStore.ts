/**
 * What has been answered, and which way.
 *
 * Two of the paywall's four claims live here — unlimited history, and the unwatermarked
 * share card — and both take `isPremium` explicitly at the call site. The third (every
 * category) is gated in `src/logic/prompts.ts`; the fourth is the template's ad removal.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import {
  CATEGORIES,
  FREE_CATEGORY,
  canUseCategory,
  promptById,
} from "@/logic/prompts";

export const ANSWER_CACHE_KEY = "ratherly.answers.v1";

/** Answers a free player can look back through. The purchase keeps the lot. */
export const FREE_HISTORY = 20;

export type Side = "a" | "b";

export interface Answer {
  promptId: string;
  side: Side;
  at: number;
}

interface AnswerState {
  answers: Answer[];
  category: string;

  answer: (promptId: string, side: Side) => void;
  /** Clears one answer so the prompt comes round again. */
  unanswer: (promptId: string) => void;
  answeredIds: () => Set<string>;
  visibleAnswers: (isPremium: boolean) => Answer[];
  setCategory: (id: string, isPremium: boolean) => "set" | "locked";
  /** The text of a result card. Free cards carry a line naming the app; paid ones do not. */
  shareText: (promptId: string, isPremium: boolean) => string;
  clear: () => void;
  persist: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function validAnswers(value: unknown): Answer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is Answer =>
      !!a &&
      typeof a === "object" &&
      typeof (a as Answer).promptId === "string" &&
      ((a as Answer).side === "a" || (a as Answer).side === "b") &&
      typeof (a as Answer).at === "number" &&
      // An answer to a prompt that no longer exists would render as a blank row.
      promptById((a as Answer).promptId) !== undefined,
  );
}

export const useAnswerStore = create<AnswerState>((set, get) => ({
  answers: [],
  category: FREE_CATEGORY,

  answer(promptId, side) {
    if (!promptById(promptId)) return;
    set((s) => ({
      // Newest first, and one answer per prompt: answering again replaces rather than
      // appends, so the history is a record of positions held, not of taps.
      answers: [
        { promptId, side, at: Date.now() },
        ...s.answers.filter((a) => a.promptId !== promptId),
      ],
    }));
    void get().persist();
  },

  unanswer(promptId) {
    set((s) => ({ answers: s.answers.filter((a) => a.promptId !== promptId) }));
    void get().persist();
  },

  answeredIds() {
    return new Set(get().answers.map((a) => a.promptId));
  },

  visibleAnswers(isPremium) {
    const { answers } = get();
    return isPremium ? answers : answers.slice(0, FREE_HISTORY);
  },

  setCategory(id, isPremium) {
    if (!CATEGORIES.some((c) => c.id === id)) return "locked";
    if (!canUseCategory(id, isPremium)) return "locked";
    set({ category: id });
    void get().persist();
    return "set";
  },

  shareText(promptId, isPremium) {
    const prompt = promptById(promptId);
    if (!prompt) return "";
    const answer = get().answers.find((a) => a.promptId === promptId);
    const chosen = answer?.side === "b" ? prompt.b : prompt.a;
    const other = answer?.side === "b" ? prompt.a : prompt.b;
    const card = `${prompt.a}\nor\n${prompt.b}\n\nI chose: ${chosen}\n(not: ${other})`;
    // The watermark is the only difference, and it is the claim being sold. A paying user
    // gets the card clean; everyone else gets one line naming where it came from.
    return isPremium ? card : `${card}\n\n— made with Ratherly`;
  },

  clear() {
    set({ answers: [] });
    void get().persist();
  },

  async persist() {
    const { answers, category } = get();
    try {
      await AsyncStorage.setItem(
        ANSWER_CACHE_KEY,
        JSON.stringify({ answers, category }),
      );
    } catch {
      // A lost history is survivable; a failed launch is not.
    }
  },

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(ANSWER_CACHE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const record = parsed as Record<string, unknown>;
      set({
        answers: validAnswers(record.answers),
        category:
          typeof record.category === "string" &&
          CATEGORIES.some((c) => c.id === record.category)
            ? record.category
            : FREE_CATEGORY,
      });
    } catch {
      // Unreadable storage starts empty rather than preventing launch.
    }
  },
}));
