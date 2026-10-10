/**
 * Servers — the PC's servers with live start/stop and a live-console
 * drilldown. Every action hits the same Rust commands the desktop uses.
 */

import { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { bridge, BridgeServer } from "../../src/lib/bridge";
import { useConnection } from "../../src/lib/store";
import { colors } from "../../src/theme";
import { Badge, Card, StatusDot, VButton } from "../../src/components/ui";

export default function Servers() {
  const connection = useConnection((s) => s.connection);
  const [servers, setServers] = useState<BridgeServer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!connection) return;
    try {
      const list = await bridge.servers();
      setServers(list.servers);
    } catch (e) {
      Alert.alert("Could not load servers", e instanceof Error ? e.message : String(e));
    }
  }, [connection]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, [load]);

  const toggle = async (server: BridgeServer) => {
    setBusy(server.slug);
    try {
      if (server.running) {
        await bridge.stopServer(server.slug);
      } else {
        await bridge.startServer(server.slug, server.ramMb);
      }
    } catch (e) {
      Alert.alert("Action failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      void load();
    }
  };

  if (!connection) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Connect to a PC first.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.violet}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      {servers.map((server) => (
        <Card key={server.slug}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <StatusDot on={server.running} />
            <Text style={styles.name}>{server.name}</Text>
            <Badge tone={server.running ? "green" : "default"}>
              {server.running ? "online" : "offline"}
            </Badge>
          </View>
          <Text style={styles.hint}>
            {server.software} · MC {server.minecraftVersion} · :{server.port}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <VButton
              tone={server.running ? "danger" : "primary"}
              disabled={busy === server.slug}
              onPress={() => void toggle(server)}
            >
              {busy === server.slug
                ? "…"
                : server.running
                  ? "Stop"
                  : "Start"}
            </VButton>
            <VButton
              tone="secondary"
              disabled={!server.running}
              onPress={() => router.push(`/console/${server.slug}`)}
            >
              Console
            </VButton>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700", flex: 1 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
