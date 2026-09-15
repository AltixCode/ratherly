import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";

import { BannerAdSlot } from "@/components/BannerAdSlot";
import { Button, Screen, Text } from "@/components/ui";
import { t, type TranslationKey } from "@/i18n";
import {
  CATEGORIES,
  FREE_CATEGORY,
  nextPrompt,
  progressIn,
} from "@/logic/prompts";
import { type Side, useAnswerStore } from "@/store/useAnswerStore";
import { usePremiumStore } from "@/store/usePremiumStore";
import { useTheme } from "@/theme";

const MIN_TOUCH_TARGET = 44;

export default function Rather() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const category = useAnswerStore((s) => s.category);
  const answers = useAnswerStore((s) => s.answers);
  const answer = useAnswerStore((s) => s.answer);
  const setCategory = useAnswerStore((s) => s.setCategory);
  const shareText = useAnswerStore((s) => s.shareText);

  // Derived from `answers` on every render rather than stored: a second copy of something
  // that is already a pure function of the list is a second thing to keep in step.
  const answered = new Set(answers.map((a) => a.promptId));
  const prompt = nextPrompt(category, answered);
  const progress = progressIn(category, answered);

  const choose = useCallback(
    (side: Side) => {
      if (!prompt) return;
      answer(prompt.id, side);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [prompt, answer],
  );

  const pickCategory = useCallback(
    (id: string) => {
      if (setCategory(id, isPremium) === "locked") {
        Alert.alert(t("lockedTitle"), t("unlockBody"), [
          { text: t("cancel"), style: "cancel" },
          { text: t("removeAdsCta"), onPress: () => router.push("/paywall") },
        ]);
      }
    },
    [setCategory, isPremium, router],
  );

  const shareLast = useCallback(() => {
    const last = answers[0];
    if (!last) return;
    void Share.share({ message: shareText(last.promptId, isPremium) });
  }, [answers, shareText, isPremium]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scroll>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text variant="display">{t("appName")}</Text>
            <Text variant="caption" tone="muted">
              {t("progressLabel", {
                done: String(progress.done),
                total: String(progress.total),
              })}
            </Text>
          </View>
          <Button
            label={t("historyTitle")}
            variant="ghost"
            onPress={() => router.push("/history")}
          />
        </View>

        <View
          style={[styles.chips, { gap: spacing.sm, marginTop: spacing.md }]}
        >
          {CATEGORIES.map((option) => {
            const locked = !isPremium && option.id !== FREE_CATEGORY;
            const name = t(option.nameKey as TranslationKey);
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityLabel={
                  locked ? t("categoryLocked", { name }) : name
                }
                accessibilityState={{ selected: category === option.id }}
                onPress={() => pickCategory(option.id)}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  justifyContent: "center",
                  paddingHorizontal: spacing.base,
                  borderRadius: radius.full,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: category === option.id ? 2 : 1,
                  borderColor:
                    category === option.id ? colors.accent : colors.border,
                }}
              >
                <Text variant="caption">{name}</Text>
              </Pressable>
            );
          })}
        </View>

        {prompt ? (
          <>
            <Text
              variant="micro"
              tone="faint"
              style={{ marginTop: spacing.xl }}
            >
              {t("wouldYouRather").toUpperCase()}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chooseA", { text: prompt.a })}
              onPress={() => choose("a")}
              style={{
                minHeight: 110,
                justifyContent: "center",
                padding: spacing.base,
                marginTop: spacing.sm,
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="bodyStrong">{prompt.a}</Text>
            </Pressable>

            <Text
              variant="caption"
              tone="faint"
              align="center"
              style={{ marginVertical: spacing.xs }}
            >
              {t("orLabel")}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("chooseA", { text: prompt.b })}
              onPress={() => choose("b")}
              style={{
                minHeight: 110,
                justifyContent: "center",
                padding: spacing.base,
                borderRadius: radius.lg,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="bodyStrong">{prompt.b}</Text>
            </Pressable>
          </>
        ) : (
          <View style={{ marginTop: spacing.xl }}>
            <Text variant="bodyStrong">{t("packDone")}</Text>
            <Text
              variant="caption"
              tone="muted"
              style={{ marginTop: spacing.xs }}
            >
              {t("packDoneBody")}
            </Text>
          </View>
        )}

        {answers.length > 0 ? (
          <Button
            label={t("shareCta")}
            variant="secondary"
            fullWidth
            onPress={shareLast}
            style={{ marginTop: spacing.lg }}
          />
        ) : null}

        <Text variant="micro" tone="faint" style={{ marginTop: spacing.lg }}>
          {t("englishOnlyNote")}
        </Text>

        <Button
          label={t("settingsTitle")}
          variant="ghost"
          fullWidth
          onPress={() => router.push("/settings")}
          style={{ marginTop: spacing.md }}
        />
      </Screen>
      <BannerAdSlot />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center" },
  chips: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
});
