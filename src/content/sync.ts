/**
 * The one place that talks to content-drip for ratherly's dilemma deck.
 *
 * ratherly's pool is FULL_SYNC: there is no "today", the client fetches the
 * service's current full prompt set and caches it wholesale, exactly like
 * the bundled `PROMPTS` (`src/logic/prompts.ts`) it falls back to. The
 * bundled deck is never deleted and never stops working — it is what this
 * returns whenever the service is unreachable, slow, or answers with
 * something malformed.
 *
 * content-drip stores only the app-defined `data` shape, not an id (see its
 * schema): ids are reconstructed here in the bundled deck's own
 * `${category}-${index within category}` shape, walking items in the order
 * the service returns them. The service returns items ordered by creation,
 * and they were seeded grouped by category in the bundled deck's order, so
 * this reproduces the bundled ids exactly today and assigns stable new ones
 * as content is added later.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { PROMPTS, type Prompt } from "@/logic/prompts";

/** Where the content service lives. Overridable for a staging build. */
export const CONTENT_BASE_URL =
  process.env.EXPO_PUBLIC_CONTENT_BASE_URL ?? "https://content.altixcode.com";

/** Short: this can run while someone is already browsing a pack. */
const TIMEOUT_MS = 8_000;

const CACHE_KEY = "ratherly.content.v1.prompts";

interface RawItem {
  category: string;
  a: string;
  b: string;
}

function isRawItem(value: unknown): value is RawItem {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.category === "string" &&
    typeof p.a === "string" &&
    typeof p.b === "string"
  );
}

function isValidPool(value: unknown): value is RawItem[] {
  return Array.isArray(value) && value.length > 0 && value.every(isRawItem);
}

/** Assigns ids in the bundled deck's `${category}-${index}` shape, per item order. */
function withIds(items: RawItem[]): Prompt[] {
  const seen: Record<string, number> = {};
  return items.map((item) => {
    const index = seen[item.category] ?? 0;
    seen[item.category] = index + 1;
    return { id: `${item.category}-${index}`, ...item };
  });
}

async function readCache(): Promise<RawItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidPool(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(pool: RawItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(pool));
  } catch {
    // A lost cache entry just costs one extra fetch next launch.
  }
}

/**
 * The cached pool from the last successful sync, if any — read on launch so
 * the store can swap in the last-known-good remote list without waiting on
 * a fresh network round trip.
 */
export async function cachedPromptPool(): Promise<Prompt[] | null> {
  const cached = await readCache();
  return cached ? withIds(cached) : null;
}

/**
 * Fetches the service's current full prompt pool. Returns the bundled
 * `PROMPTS` on any failure — network, timeout, or a malformed response.
 * Never throws.
 */
export async function fetchPromptPool(): Promise<Prompt[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${CONTENT_BASE_URL}/api/v1/ratherly/prompts/all`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`${response.status} from content-drip`);
    const body = (await response.json()) as { items?: unknown };
    if (isValidPool(body.items)) {
      void writeCache(body.items);
      return withIds(body.items);
    }
  } catch {
    // Network failure, timeout, or a malformed response: fall through.
  } finally {
    clearTimeout(timer);
  }
  return PROMPTS;
}
