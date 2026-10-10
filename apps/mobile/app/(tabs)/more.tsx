/**
 * More — connection, AI status, legal and links (briefing §10: everything
 * beyond the primary destinations lives here).
 */

import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useConnection } from "../../src/lib/store";
import { colors } from "../../src/theme";
import { APP_TAGLINE, LEGAL_DISCLAIMER } from "@voxel/core";
import { Badge, Card, SectionTitle, VButton } from "../../src/components/ui";

export default function More() {
  const connection = useConnection((s) => s.connection);

  return (
    <View style={styles.screen}>
      <Card>
        <SectionTitle>Connection</SectionTitle>
        {connection ? (
          <>
            <Text style={styles.hint}>Paired with {connection.address}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <Badge tone="green">online</Badge>
              <VButton
                tone="secondary"
                onPress={() => router.push("/connect")}
              >
                Change PC
              </VButton>
              <VButton
                tone="danger"
                onPress={() =>
                  Alert.alert("Disconnect?", "You can pair again anytime.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Disconnect",
                      style: "destructive",
                      onPress: () => useConnection.getState().disconnect(),
                    },
                  ])
                }
              >
                Disconnect
              </VButton>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.hint}>No PC paired yet.</Text>
            <VButton onPress={() => router.push("/connect")}>Connect to PC</VButton>
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>About</SectionTitle>
        <Text style={styles.title}>VOXEL</Text>
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        <Text style={styles.hint}>
          The mobile companion of the VOXEL desktop studio: the phone
          commands the SAME real engine on your PC — projects, Gradle
          builds, Minecraft servers, console and AI.
        </Text>
        <Text style={styles.legal}>{LEGAL_DISCLAIMER}</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: 1 },
  tagline: { color: colors.violet, fontSize: 11.5, marginTop: 2, letterSpacing: 1.5 },
  hint: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  legal: { color: colors.faint, fontSize: 10.5, lineHeight: 15, marginTop: 10 },
});
