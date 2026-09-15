import AsyncStorage from '@react-native-async-storage/async-storage';

import { ANSWER_CACHE_KEY, FREE_HISTORY, useAnswerStore } from '../useAnswerStore';
import { FREE_CATEGORY, PROMPTS, promptsIn } from '@/logic/prompts';

const first = PROMPTS[0]!;
const second = PROMPTS[1]!;

const reset = () => useAnswerStore.setState({ answers: [], category: FREE_CATEGORY });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  reset();
});

describe('answering', () => {
  it('records a side', () => {
    useAnswerStore.getState().answer(first.id, 'b');
    expect(useAnswerStore.getState().answers[0]).toMatchObject({ promptId: first.id, side: 'b' });
  });

  it('ignores a prompt that does not exist', () => {
    useAnswerStore.getState().answer('invented', 'a');
    expect(useAnswerStore.getState().answers).toHaveLength(0);
  });

  it('replaces rather than appends when the same prompt is answered again', () => {
    // The history is a record of positions held, not of taps.
    useAnswerStore.getState().answer(first.id, 'a');
    useAnswerStore.getState().answer(first.id, 'b');
    expect(useAnswerStore.getState().answers).toHaveLength(1);
    expect(useAnswerStore.getState().answers[0]!.side).toBe('b');
  });

  it('puts the newest first', () => {
    useAnswerStore.getState().answer(first.id, 'a');
    useAnswerStore.getState().answer(second.id, 'a');
    expect(useAnswerStore.getState().answers[0]!.promptId).toBe(second.id);
  });

  it('clears one answer so the prompt comes round again', () => {
    useAnswerStore.getState().answer(first.id, 'a');
    useAnswerStore.getState().unanswer(first.id);
    expect(useAnswerStore.getState().answeredIds().has(first.id)).toBe(false);
  });
});

describe('history', () => {
  const fill = (n: number) => {
    for (const prompt of PROMPTS.slice(0, n)) useAnswerStore.getState().answer(prompt.id, 'a');
  };

  it('shows a free player only the most recent', () => {
    fill(FREE_HISTORY + 8);
    expect(useAnswerStore.getState().visibleAnswers(false)).toHaveLength(FREE_HISTORY);
  });

  it('shows a paying player everything', () => {
    fill(FREE_HISTORY + 8);
    expect(useAnswerStore.getState().visibleAnswers(true)).toHaveLength(FREE_HISTORY + 8);
  });

  it('clears on request', () => {
    fill(3);
    useAnswerStore.getState().clear();
    expect(useAnswerStore.getState().answers).toHaveLength(0);
  });
});

describe('categories', () => {
  it('lets a free player select the free pack and nothing else', () => {
    expect(useAnswerStore.getState().setCategory(FREE_CATEGORY, false)).toBe('set');
    expect(useAnswerStore.getState().setCategory('food', false)).toBe('locked');
    expect(useAnswerStore.getState().category).toBe(FREE_CATEGORY);
  });

  it('opens them all for a paying player', () => {
    expect(useAnswerStore.getState().setCategory('travel', true)).toBe('set');
    expect(useAnswerStore.getState().category).toBe('travel');
  });

  it('refuses a category that does not exist', () => {
    expect(useAnswerStore.getState().setCategory('invented', true)).toBe('locked');
  });
});

describe('the share card', () => {
  it('names both options and which was chosen', () => {
    useAnswerStore.getState().answer(first.id, 'b');
    const text = useAnswerStore.getState().shareText(first.id, true);
    expect(text).toContain(first.a);
    expect(text).toContain(first.b);
    expect(text).toContain(`I chose: ${first.b}`);
  });

  it('watermarks a free card and not a paid one — that is the whole claim', () => {
    useAnswerStore.getState().answer(first.id, 'a');
    expect(useAnswerStore.getState().shareText(first.id, false)).toContain('Ratherly');
    expect(useAnswerStore.getState().shareText(first.id, true)).not.toContain('made with');
  });

  it('is empty for a prompt that does not exist rather than a broken card', () => {
    expect(useAnswerStore.getState().shareText('invented', true)).toBe('');
  });
});

describe('persistence', () => {
  it('round-trips answers and the chosen category', async () => {
    useAnswerStore.getState().answer(first.id, 'b');
    useAnswerStore.getState().setCategory('work', true);
    await useAnswerStore.getState().persist();

    reset();
    await useAnswerStore.getState().hydrate();
    expect(useAnswerStore.getState().answers).toHaveLength(1);
    expect(useAnswerStore.getState().category).toBe('work');
  });

  it('drops answers to prompts that no longer exist', async () => {
    // A deck can shrink between versions; a stale id would render as a blank row.
    await AsyncStorage.setItem(
      ANSWER_CACHE_KEY,
      JSON.stringify({ answers: [{ promptId: 'retired-prompt', side: 'a', at: 1 }] }),
    );
    await useAnswerStore.getState().hydrate();
    expect(useAnswerStore.getState().answers).toHaveLength(0);
  });

  it('starts clean on stored rubbish', async () => {
    await AsyncStorage.setItem(ANSWER_CACHE_KEY, '{"answers":"none","category":9}');
    await useAnswerStore.getState().hydrate();
    expect(useAnswerStore.getState().answers).toEqual([]);
    expect(useAnswerStore.getState().category).toBe(FREE_CATEGORY);
  });

  it('knows the free pack is finite', () => {
    expect(promptsIn(FREE_CATEGORY).length).toBeGreaterThan(5);
  });
});
