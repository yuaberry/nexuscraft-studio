/**
 * Connect — pairing screen. The PC (Settings → Mobile) shows the local
 * address and an 8-char token; typing both here verifies with a real
 * /api/status call before saving.
 */

import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { bridge } from "../src/lib/bridge";
import { useConnection } from "../src/lib/store";
import { colors } from "../src/theme";
import { Card, VButton } from "../src/components/ui";

export default function Connect() {
  const [address, setAddress] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const connect = useConnection((s) => s.connect);

  const pair = async () => {
    const cleanAddress = address.trim().replace(/^https?:\/\//, "");
    const cleanToken = token.trim().toUpperCase();
    if (!cleanAddress || !cleanToken) {
      Alert.alert("Missing info", "Type the address AND the token shown on the PC.");
      return;
    }
    setBusy(true);
    try {
      // Temporarily connect to verify, then persist on success
      useConnection.getState().connect(cleanAddress, cleanToken);
      const status = await bridge.status();
      useConnection.getState().connect(cleanAddress, cleanToken);
      Alert.alert("Paired!", `Connected to VOXEL v${status.version} on your PC.`);
      router.back();
    } catch (e) {
      useConnection.getState().disconnect();
      Alert.alert(
        "Could not pair",
        `${e instanceof Error ? e.message : String(e)}\n\nCheck that:\n• the bridge is enabled on the PC\n• the address is the PC's local IP\n• both devices are on the same network`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Card>
        <Text style={styles.title}>Pair with your PC</Text>
        <Text style={styles.hint}>
          On the computer: VOXEL → Settings → Mobile → enable the bridge.
          Copy the address and the token shown there.
        </Text>

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="192.168.0.20:3717"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Token</Text>
        <TextInput
          style={[styles.input, { letterSpacing: 4 }]}
          placeholder="XXXXXXXX"
          placeholderTextColor={colors.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          value={token}
          onChangeText={setToken}
        />

        <VButton onPress={() => void pair()} disabled={busy}>
          {busy ? "Verifying…" : "Pair with PC"}
        </VButton>
      </Card>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { color: colors.text, fontSize: 17, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  label: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 14,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
