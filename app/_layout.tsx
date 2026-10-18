import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  NotoSansGeorgian_400Regular,
  NotoSansGeorgian_500Medium,
  NotoSansGeorgian_700Bold,
} from '@expo-google-fonts/noto-sans-georgian';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading, profileError, session, profile, refreshProfile, signOut } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  if (profileError) {
    return (
      <View style={styles.errorWrap}>
        <AppText style={styles.errorText}>{ka.loadFailed}</AppText>
        <AppButton title={ka.retry} onPress={refreshProfile} />
        <AppButton variant="ghost" title={ka.profile.signOut} onPress={signOut} />
      </View>
    );
  }

  const signedIn = !!session;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !profile}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !!profile}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="become-specialist" />
        <Stack.Screen name="professionals" />
        <Stack.Screen name="provider/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    NotoSansGeorgian_400Regular,
    NotoSansGeorgian_500Medium,
    NotoSansGeorgian_700Bold,
  });

  if (!loaded && !error) return null;

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  errorText: { textAlign: 'center' },
});
