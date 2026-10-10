/**
 * Live console — real server stdout streamed from the PC over SSE, with a
 * world-safe Stop button (the same stdin `stop` the desktop uses).
 */

import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { bridge } from "../../src/lib/bridge";
import { colors } from "../../src/theme";
import { VButton } from "../../src/components/ui";

export default function ConsoleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    let cursor = 0;
    setConnected(true);
    const poll = async () => {
      try {
        const tail = await bridge.consoleTail(slug, cursor);
        if (cancelled) return;
        cursor = tail.total;
        if (tail.lines.length > 0) {
          setLines((prev) => [...prev, ...tail.lines].slice(-400));
        }
        setConnected(true);
      } catch (e) {
        if (!cancelled) setConnected(false);
      }
    };
    void poll();
    const interval = setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [slug]);

  const stop = async () => {
    if (!slug) return;
    try {
      await bridge.stopServer(slug);
    } catch (e) {
      Alert.alert("Stop failed", e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: "#04060c" }}
        contentContainerStyle={{ padding: 12, gap: 2 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {lines.length === 0 && (
          <Text style={styles.wait}>
            {connected ? "Waiting for console output…" : "Console stream ended."}
          </Text>
        )}
        {lines.map((line, index) => (
          <Text key={index} style={styles.line} selectable>
            {line}
          </Text>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.hint}>{slug} · live from PC</Text>
        <VButton tone="danger" onPress={() => void stop()}>
          Stop server
        </VButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  line: { color: colors.muted, fontFamily: "monospace", fontSize: 11, lineHeight: 16 },
  wait: { color: colors.faint, fontSize: 12, fontStyle: "italic" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  hint: { color: colors.muted, fontSize: 12, flex: 1 },
});
