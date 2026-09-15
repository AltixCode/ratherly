import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import History from '../history';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { FREE_CATEGORY, PROMPTS } from '@/logic/prompts';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { FREE_HISTORY, useAnswerStore } from '@/store/useAnswerStore';
import { usePremiumStore } from '@/store/usePremiumStore';

const entry = (i: number) => ({ promptId: PROMPTS[i]!.id, side: 'a' as const, at: i });

beforeEach(() => {
  jest.clearAllMocks();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
  useAnswerStore.setState({ answers: [], category: FREE_CATEGORY });
});

describe('the history screen', () => {
  it('says so when nothing has been answered', async () => {
    const { getByText } = await renderWithProviders(<History />);
    expect(getByText(t('emptyHistory'))).toBeTruthy();
  });

  it('shows what was chosen and what was not', async () => {
    useAnswerStore.setState({ answers: [entry(0)] });
    const { getByText } = await renderWithProviders(<History />);
    expect(getByText(PROMPTS[0]!.a)).toBeTruthy();
    expect(getByText(`${t('orLabel')} ${PROMPTS[0]!.b}`)).toBeTruthy();
  });

  it('lets a reader change their mind, which puts the prompt back in the deck', async () => {
    useAnswerStore.setState({ answers: [entry(0)] });
    const { getByLabelText } = await renderWithProviders(<History />);
    await fireEvent.press(getByLabelText(t('changeMind')));
    expect(useAnswerStore.getState().answers).toHaveLength(0);
  });

  it('tells a free reader exactly how many answers the purchase would show', async () => {
    const many = Array.from({ length: FREE_HISTORY + 4 }, (_, i) => entry(i));
    useAnswerStore.setState({ answers: many });

    const { getByText } = await renderWithProviders(<History />);
    expect(getByText(t('moreHistoryLocked', { n: '4' }))).toBeTruthy();
  });

  it('sends that prompt to the paywall', async () => {
    useAnswerStore.setState({ answers: Array.from({ length: FREE_HISTORY + 2 }, (_, i) => entry(i)) });
    const { getByLabelText } = await renderWithProviders(<History />);
    await fireEvent.press(getByLabelText(t('moreHistoryLocked', { n: '2' })));
    expect(testRouter.push).toHaveBeenCalledWith('/paywall');
  });

  it('shows a paying reader everything, with no prompt', async () => {
    usePremiumStore.setState({ isPremium: true });
    useAnswerStore.setState({ answers: Array.from({ length: FREE_HISTORY + 4 }, (_, i) => entry(i)) });
    const { queryByText } = await renderWithProviders(<History />);
    expect(queryByText(t('moreHistoryLocked', { n: '4' }))).toBeNull();
  });

  it('clears everything on request', async () => {
    useAnswerStore.setState({ answers: [entry(0), entry(1)] });
    const { getByText } = await renderWithProviders(<History />);
    await fireEvent.press(getByText(t('clearAnswers')));
    expect(useAnswerStore.getState().answers).toHaveLength(0);
  });
});
