import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { FormScreen } from '@/components/FormScreen';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

export default function OnboardingScreen() {
  const { session, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    const displayName = name.trim();
    const cityName = city.trim();

    if (displayName.length < 2) return setError(ka.onboarding.needName);
    if (cityName.length < 2) return setError(ka.onboarding.needCity);
    if (!adult) return setError(ka.onboarding.needAdult);
    if (!session) return;

    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('profiles').insert({
      id: session.user.id,
      display_name: displayName,
      city: cityName,
    });
    // 23505 = profile already exists (e.g. double tap): just reload it
    if (err && err.code !== '23505') {
      setBusy(false);
      setError(`${ka.onboarding.saveFailed}: ${err.message}`);
      return;
    }
    await refreshProfile();
    setBusy(false);
  }

  return (
    <FormScreen>
      <View style={styles.header}>
        <AppText weight="bold" style={styles.title}>
          {ka.onboarding.title}
        </AppText>
        <AppText muted>{ka.onboarding.subtitle}</AppText>
      </View>

      <View style={styles.form}>
        <AppInput
          label={ka.onboarding.nameLabel}
          placeholder={ka.onboarding.namePlaceholder}
          value={name}
          onChangeText={setName}
          autoComplete="given-name"
          maxLength={60}
        />
        <AppInput
          label={ka.onboarding.cityLabel}
          placeholder={ka.onboarding.cityPlaceholder}
          value={city}
          onChangeText={setCity}
          maxLength={80}
        />

        <Pressable
          onPress={() => setAdult((v) => !v)}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: adult }}
        >
          <Ionicons
            name={adult ? 'checkbox' : 'square-outline'}
            size={26}
            color={adult ? colors.accent : colors.textMuted}
          />
          <AppText style={styles.checkText}>{ka.onboarding.adultConfirm}</AppText>
        </Pressable>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <AppButton title={ka.onboarding.submit} onPress={onSubmit} loading={busy} />
        <AppButton variant="ghost" title={ka.profile.signOut} onPress={signOut} />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  title: { fontSize: 32, lineHeight: 44 },
  form: { gap: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  checkText: { flex: 1 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
});
