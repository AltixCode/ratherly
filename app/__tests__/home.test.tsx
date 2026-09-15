import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import Home from '../index';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { FREE_CATEGORY, promptsIn } from '@/logic/prompts';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { useAnswerStore } from '@/store/useAnswerStore';
import { usePremiumStore } from '@/store/usePremiumStore';

const free = promptsIn(FREE_CATEGORY);

beforeEach(() => {
  jest.clearAllMocks();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
  useAnswerStore.setState({ answers: [], category: FREE_CATEGORY });
});

describe('the dilemma screen', () => {
  it('shows the first unanswered prompt', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(free[0]!.a)).toBeTruthy();
    expect(getByText(free[0]!.b)).toBeTruthy();
  });

  it('records a choice and moves to the next one', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('chooseA', { text: free[0]!.a })));

    expect(useAnswerStore.getState().answers[0]).toMatchObject({ promptId: free[0]!.id, side: 'a' });
    // The screen advances rather than sitting on an answered prompt.
    expect(getByText(free[1]!.a)).toBeTruthy();
  });

  it('shows progress through the pack', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('progressLabel', { done: '0', total: String(free.length) }))).toBeTruthy();
  });

  it('says the pack is finished rather than showing a blank card', async () => {
    useAnswerStore.setState({
      answers: free.map((p) => ({ promptId: p.id, side: 'a' as const, at: 1 })),
    });
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('packDone'))).toBeTruthy();
  });

  it('sends a free player tapping a locked pack to the paywall, changing nothing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('categoryLocked', { name: t('catFood') })));

    expect(alert.mock.calls[0]![0]).toBe(t('lockedTitle'));
    expect(useAnswerStore.getState().category).toBe(FREE_CATEGORY);
  });

  it('lets a paying player switch packs', async () => {
    usePremiumStore.setState({ isPremium: true });
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('catTravel')));
    expect(useAnswerStore.getState().category).toBe('travel');
  });

  it('says the dilemmas are English, rather than implying they are translated', async () => {
    // Fourteen locales of chrome around English content is fine; pretending otherwise is not.
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('englishOnlyNote'))).toBeTruthy();
  });

  it('offers sharing only once something has been answered', async () => {
    const empty = await renderWithProviders(<Home />);
    expect(empty.queryByText(t('shareCta'))).toBeNull();

    useAnswerStore.setState({ answers: [{ promptId: free[0]!.id, side: 'a', at: 1 }] });
    const answered = await renderWithProviders(<Home />);
    expect(answered.getByText(t('shareCta'))).toBeTruthy();
  });

  it('routes to history and settings', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t('historyTitle')));
    expect(testRouter.push).toHaveBeenCalledWith('/history');
    await fireEvent.press(getByText(t('settingsTitle')));
    expect(testRouter.push).toHaveBeenCalledWith('/settings');
  });
});
