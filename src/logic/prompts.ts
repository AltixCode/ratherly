/**
 * The dilemmas.
 *
 * Bundled, not fetched. The app has no backend and never asks for one, so the whole set ships
 * in the binary and works on a plane. That also means "every category pack unlocked" is a real
 * thing the purchase opens rather than a promise of content to be delivered later.
 *
 * Both sides of every dilemma are deliberately *defensible*. A would-you-rather where one
 * option is obviously correct is not a dilemma, it is a quiz with one wrong answer, and a
 * whole deck of those is boring within a minute.
 *
 * The text lives here rather than in `src/i18n` because there are hundreds of strings and they
 * are content, not chrome. The category NAMES are translated; the prompts are English-only and
 * the app says so rather than pretending otherwise.
 */

export interface Prompt {
  id: string;
  category: string;
  a: string;
  b: string;
}

export interface Category {
  id: string;
  nameKey: string;
}

export const CATEGORIES: Category[] = [
  { id: "everyday", nameKey: "catEveryday" },
  { id: "impossible", nameKey: "catImpossible" },
  { id: "food", nameKey: "catFood" },
  { id: "work", nameKey: "catWork" },
  { id: "travel", nameKey: "catTravel" },
];

/** The category a free player gets. The rest are what the purchase opens. */
export const FREE_CATEGORY = "everyday";

const make = (category: string, pairs: [string, string][]): Prompt[] =>
  pairs.map(([a, b], i) => ({ id: `${category}-${i}`, category, a, b }));

export const PROMPTS: Prompt[] = [
  ...make("everyday", [
    ["Always be ten minutes early", "Always be five minutes late"],
    ["Never have to do laundry again", "Never have to wash up again"],
    [
      "Have unlimited hot water",
      "Have a bed that is always the right temperature",
    ],
    ["Lose your keys once a week", "Lose your phone once a month"],
    ["Only ever take the stairs", "Only ever take the long way round"],
    ["Have perfect handwriting", "Have perfect spelling"],
    ["Never feel too hot", "Never feel too cold"],
    [
      "Wake up at five every day feeling rested",
      "Sleep until ten every day feeling groggy",
    ],
    ["Have every traffic light go green", "Never queue for anything again"],
    ["Be unable to whisper", "Be unable to shout"],
    [
      "Have a self-cleaning home but no privacy",
      "Total privacy but you clean everything",
    ],
    ["Remember every name you hear", "Remember every face you see"],
  ]),
  ...make("impossible", [
    [
      "Be able to fly, slowly",
      "Be able to teleport, but only somewhere you have been",
    ],
    ["Know when anyone is lying", "Have everyone believe you always"],
    ["Live a hundred years in the past", "Live a hundred years in the future"],
    ["Be invisible for one hour a day", "Be twice as strong all the time"],
    ["Speak every language badly", "Speak one extra language perfectly"],
    ["Pause time for ten minutes a day", "Rewind ten seconds, once a week"],
    ["Breathe underwater", "Survive any fall"],
    ["Always know the right thing to say", "Never need to say anything"],
    [
      "Be famous for something you did not do",
      "Be unknown for something remarkable you did",
    ],
    ["See one minute into the future", "See one year into the future, once"],
  ]),
  ...make("food", [
    ["Never eat bread again", "Never eat cheese again"],
    ["Eat the same breakfast forever", "Never eat breakfast again"],
    [
      "Only ever eat food you cooked",
      "Never cook again but never choose the menu",
    ],
    [
      "Have every meal be slightly too salty",
      "Have every meal be slightly too cold",
    ],
    ["Give up coffee", "Give up every other hot drink"],
    ["Only sweet food", "Only savoury food"],
    ["Eat dinner at four every day", "Eat dinner at eleven every day"],
    ["Never taste chocolate again", "Never taste fruit again"],
    [
      "A perfect meal you can never have twice",
      "A very good meal you can have any time",
    ],
    [
      "Only ever drink water",
      "Never drink water again, but everything else is fine",
    ],
  ]),
  ...make("work", [
    ["A four-day week for less money", "A five-day week for more"],
    ["Work alone forever", "Never work alone again"],
    ["Have every meeting be an email", "Have every email be a meeting"],
    ["Be brilliant at a job you dislike", "Be average at a job you love"],
    ["Never have a commute", "Never have a deadline"],
    ["Work nights for double pay", "Work days for what you earn now"],
    [
      "Have a manager who is never available",
      "Have a manager who is always watching",
    ],
    ["Change career every five years", "Do one thing for forty years"],
    [
      "Be paid fairly and never praised",
      "Be praised constantly and paid poorly",
    ],
    ["Know exactly what everyone earns", "Have nobody ever know what you earn"],
  ]),
  ...make("travel", [
    ["See ten countries briefly", "See one country properly"],
    ["Always have the window seat", "Always get through security instantly"],
    [
      "Travel anywhere free but never twice",
      "Travel to one place free, forever",
    ],
    [
      "Lose your luggage once a year",
      "Never sit next to your travelling companion",
    ],
    ["Only travel by train", "Only travel by sea"],
    [
      "A perfect trip you cannot photograph",
      "A dull trip with extraordinary photographs",
    ],
    ["Never need a visa again", "Never pay for accommodation again"],
    [
      "Arrive at three in the morning every time",
      "Always have a six-hour layover",
    ],
    ["Travel alone always", "Never travel alone again"],
    ["Know a city like a local in a week", "Have a month but stay a tourist"],
  ]),
];

export const promptsIn = (category: string): Prompt[] =>
  PROMPTS.filter((p) => p.category === category);

export const promptById = (id: string): Prompt | undefined =>
  PROMPTS.find((p) => p.id === id);

/** Whether a player may open a category. */
export function canUseCategory(category: string, isPremium: boolean): boolean {
  if (!CATEGORIES.some((c) => c.id === category)) return false;
  return isPremium || category === FREE_CATEGORY;
}

/**
 * The next unanswered prompt in a category, or null when the pack is finished.
 *
 * Deterministic given the answered set: no shuffling, so a player who closes the app mid-pack
 * comes back to where they were rather than to a random re-roll.
 */
export function nextPrompt(
  category: string,
  answered: Set<string>,
): Prompt | null {
  return promptsIn(category).find((p) => !answered.has(p.id)) ?? null;
}

/** How far through a pack a player is. */
export function progressIn(
  category: string,
  answered: Set<string>,
): { done: number; total: number } {
  const all = promptsIn(category);
  return {
    done: all.filter((p) => answered.has(p.id)).length,
    total: all.length,
  };
}
