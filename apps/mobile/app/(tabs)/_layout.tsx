import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../src/theme";

function Glyph({ children, active }: { children: string; active: boolean }) {
  return (
    <Text style={{ fontSize: 17, color: active ? colors.violet : colors.muted }}>
      {children}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: "#07080d",
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.violet,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <Glyph active={focused}>◇</Glyph>,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ focused }) => <Glyph active={focused}>✦</Glyph>,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ focused }) => <Glyph active={focused}>▤</Glyph>,
        }}
      />
      <Tabs.Screen
        name="servers"
        options={{
          title: "Servers",
          tabBarIcon: ({ focused }) => <Glyph active={focused}>◍</Glyph>,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <Glyph active={focused}>⋯</Glyph>,
        }}
      />
    </Tabs>
  );
}
