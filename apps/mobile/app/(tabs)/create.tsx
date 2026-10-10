/**
 * Create — AI chat on the phone; the PC does the work (briefing §56).
 * Messages stream through the PC's configured provider — the key never
 * leaves the desktop.
 */

import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { bridge } from "../../src/lib/bridge";
import { useConnection } from "../../src/lib/store";
import { colors } from "../../src/theme";
import { Card, VButton } from "../../src/components/ui";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export default function Create() {
  const connection = useConnection((s) => s.connection);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const prompt = draft.trim();
    if (!prompt || busy) return;
    setDraft("");
    const history = [...turns, { role: "user" as const, content: prompt }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const answer = await bridge.ask(
        history.map((t) => ({ role: t.role, content: t.content })),
      );
      setTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: answer.text };
        return next;
      });
    } catch (e) {
      setTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: `⚠ ${e instanceof Error ? e.message : String(e)}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  if (!connection) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Connect to a PC first to use the AI.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {turns.length === 0 && (
          <Card>
            <Text style={styles.title}>Create with VOXEL AI</Text>
            <Text style={styles.hint}>
              Describe what you want — a mod, a datapack, a shader tweak, a
              server style. The request streams to your PC's configured AI
              and the answer appears here while the Nexus tools on the
              desktop can apply it to real project files.
            </Text>
          </Card>
        )}
        {turns.map((turn, index) => (
          <Card
            key={index}
            style={{
              alignSelf: turn.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              backgroundColor: turn.role === "user" ? colors.violetSoft : colors.surface,
            }}
          >
            <Text style={turn.role === "user" ? styles.userText : styles.aiText}>
              {turn.content || (busy ? "…" : "")}
            </Text>
          </Card>
        ))}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="e.g. create a prison rank system…"
          placeholderTextColor={colors.faint}
          value={draft}
          onChangeText={setDraft}
          editable={!busy}
          multiline
        />
        <VButton onPress={() => void send()} disabled={busy}>
          {busy ? "…" : "Send"}
        </VButton>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: colors.text, fontSize: 16, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  userText: { color: colors.text, fontSize: 13.5, lineHeight: 19 },
  aiText: { color: colors.text, fontSize: 13.5, lineHeight: 19 },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    maxHeight: 110,
  },
});
