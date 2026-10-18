import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

type IconName = ComponentProps<typeof Ionicons>['name'];

const tab = (title: string, icon: IconName, iconActive: IconName) => ({
  title,
  tabBarIcon: ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? iconActive : icon} size={size} color={color as string} />
  ),
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: 'NotoSansGeorgian_500Medium', fontSize: 12 },
      }}
    >
      <Tabs.Screen name="index" options={tab(ka.tabs.home, 'home-outline', 'home')} />
      <Tabs.Screen name="board" options={tab(ka.tabs.board, 'albums-outline', 'albums')} />
      <Tabs.Screen name="chat" options={tab(ka.tabs.chat, 'chatbubbles-outline', 'chatbubbles')} />
      <Tabs.Screen name="profile" options={tab(ka.tabs.profile, 'person-outline', 'person')} />
    </Tabs>
  );
}
