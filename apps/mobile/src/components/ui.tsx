/**
 * VOXEL mobile UI primitives — Next skin in React Native.
 */

import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radius } from "../theme";

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "violet" | "green" | "amber" | "red";
}) {
  return <View style={[styles.badge, badgeTone[tone]]}><Text style={badgeText[tone]}>{children}</Text></View>;
}

export function VButton({
  children,
  onPress,
  tone = "primary",
  disabled,
}: {
  children: ReactNode;
  onPress: () => void;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        buttonTone[tone],
        pressed && { opacity: 0.82, transform: [{ translateY: -1 }] },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.buttonText, tone === "secondary" && { color: colors.text }]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function StatusDot({ on }: { on: boolean }) {
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: on ? colors.green : colors.faint,
        shadowColor: on ? colors.green : "transparent",
        shadowOpacity: on ? 0.9 : 0,
        shadowRadius: 6,
      }}
    />
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  button: {
    borderRadius: radius.button,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13.5,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingVertical: 12,
  },
  statValue: {
    color: colors.violet,
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
});

const badgeTone = StyleSheet.create({
  default: { backgroundColor: colors.surfaceHi, borderColor: colors.border },
  violet: { backgroundColor: colors.violetSoft, borderColor: "rgba(145,85,255,0.4)" },
  green: { backgroundColor: colors.greenSoft, borderColor: "rgba(47,214,163,0.4)" },
  amber: { backgroundColor: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.4)" },
  red: { backgroundColor: "rgba(248,113,113,0.12)", borderColor: "rgba(248,113,113,0.4)" },
});

const badgeText = StyleSheet.create({
  default: { color: colors.muted, fontSize: 10.5 },
  violet: { color: "#b79cff", fontSize: 10.5 },
  green: { color: colors.green, fontSize: 10.5 },
  amber: { color: colors.amber, fontSize: 10.5 },
  red: { color: colors.red, fontSize: 10.5 },
});

const buttonTone = StyleSheet.create({
  primary: {
    backgroundColor: colors.violet,
    shadowColor: colors.violet,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  secondary: {
    backgroundColor: colors.surfaceHi,
    borderColor: colors.border,
    borderWidth: 1,
  },
  danger: { backgroundColor: "rgba(248,113,113,0.16)", borderColor: "rgba(248,113,113,0.4)", borderWidth: 1 },
});
