import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { BannerAdSlot } from "@/components/BannerAdSlot";
import { Button, Screen, Text } from "@/components/ui";
import { t } from "@/i18n";
import { promptById } from "@/logic/prompts";
import { useAnswerStore } from "@/store/useAnswerStore";
import { usePremiumStore } from "@/store/usePremiumStore";
import { useTheme } from "@/theme";

const MIN_TOUCH_TARGET = 44;

/**
 * Every position taken, newest first.
 *
 * A free reader sees the most recent twenty and is told exactly how many more the purchase
 * would show — a number, not a vague "more", so the claim is checkable by the person paying.
 */
export default function History() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const all = useAnswerStore((s) => s.answers);
  const visible = useAnswerStore((s) => s.visibleAnswers)(isPremium);
  const unanswer = useAnswerStore((s) => s.unanswer);
  const shareText = useAnswerStore((s) => s.shareText);
  const clear = useAnswerStore((s) => s.clear);
  const hidden = all.length - visible.length;

  const share = useCallback(
    (promptId: string) => {
      void Share.share({ message: shareText(promptId, isPremium) });
    },
    [shareText, isPremium],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scroll>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text variant="display">{t("historyTitle")}</Text>
          </View>
          {all.length > 0 ? (
            <Button label={t("clearAnswers")} variant="ghost" onPress={clear} />
          ) : null}
        </View>

        {visible.length === 0 ? (
          <Text
            variant="caption"
            tone="muted"
            style={{ marginTop: spacing.md }}
          >
            {t("emptyHistory")}
          </Text>
        ) : (
          visible.map((entry) => {
            const prompt = promptById(entry.promptId);
            if (!prompt) return null;
            const chosen = entry.side === "b" ? prompt.b : prompt.a;
            const other = entry.side === "b" ? prompt.a : prompt.b;
            return (
              <View
                key={entry.promptId}
                style={{
                  marginTop: spacing.sm,
                  padding: spacing.base,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text variant="bodyStrong">{chosen}</Text>
                <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
                  {`${t("orLabel")} ${other}`}
                </Text>
                <View
                  style={[
                    styles.row,
                    { gap: spacing.sm, marginTop: spacing.sm },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("changeMind")}
                    onPress={() => unanswer(entry.promptId)}
                    style={{
                      minHeight: MIN_TOUCH_TARGET,
                      justifyContent: "center",
                    }}
                  >
                    <Text variant="caption" tone="accent">
                      {t("changeMind")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t("shareCta")}: ${chosen}`}
                    onPress={() => share(entry.promptId)}
                    style={{
                      minHeight: MIN_TOUCH_TARGET,
                      justifyContent: "center",
                    }}
                  >
                    <Text variant="caption" tone="accent">
                      {t("shareCta")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {hidden > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("moreHistoryLocked", { n: String(hidden) })}
            onPress={() => router.push("/paywall")}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              justifyContent: "center",
              paddingHorizontal: spacing.base,
              marginTop: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text variant="caption" tone="accent">
              {t("moreHistoryLocked", { n: String(hidden) })}
            </Text>
          </Pressable>
        ) : null}
      </Screen>
      <BannerAdSlot />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center" },
});
