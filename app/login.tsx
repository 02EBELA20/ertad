import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { toE164 } from '@/lib/phone';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { FormScreen } from '@/components/FormScreen';
import { colors } from '@/theme/colors';
import { ka } from '@/i18n/ka';

const RESEND_SECONDS = 60;

export default function LoginScreen() {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState(''); // normalized E.164
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(target: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: target });
    setBusy(false);
    if (err) {
      setError(`${ka.auth.sendFailed}: ${err.message}`);
      return false;
    }
    setCooldown(RESEND_SECONDS);
    return true;
  }

  async function onSendCode() {
    const normalized = toE164(phoneInput);
    if (!normalized) {
      setError(ka.auth.badPhone);
      return;
    }
    setPhone(normalized);
    if (await sendCode(normalized)) {
      setCode('');
      setStep('code');
    }
  }

  async function onVerify() {
    const token = code.replace(/\D/g, '');
    if (token.length !== 6) {
      setError(ka.auth.badCode);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    setBusy(false);
    if (err) setError(`${ka.auth.verifyFailed} (${err.message})`);
    // on success the session arrives via onAuthStateChange and the layout switches screens
  }

  return (
    <FormScreen>
      <View style={styles.header}>
        <AppText weight="bold" style={styles.title}>
          {ka.auth.title}
        </AppText>
        <AppText muted>{ka.auth.subtitle}</AppText>
      </View>

      {step === 'phone' ? (
        <View style={styles.form}>
          <AppInput
            label={ka.auth.phoneLabel}
            hint={ka.auth.phoneHint}
            placeholder={ka.auth.phonePlaceholder}
            value={phoneInput}
            onChangeText={setPhoneInput}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            autoFocus
          />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <AppButton title={ka.auth.sendCode} onPress={onSendCode} loading={busy} />
        </View>
      ) : (
        <View style={styles.form}>
          <AppText muted>{ka.auth.codeSentTo(phone)}</AppText>
          <AppInput
            label={ka.auth.codeLabel}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            autoFocus
          />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <AppButton title={ka.auth.verify} onPress={onVerify} loading={busy} />
          <AppButton
            variant="secondary"
            title={cooldown > 0 ? ka.auth.resendIn(cooldown) : ka.auth.resend}
            onPress={() => sendCode(phone)}
            disabled={cooldown > 0 || busy}
          />
          <AppButton
            variant="ghost"
            title={ka.auth.changePhone}
            onPress={() => {
              setStep('phone');
              setError(null);
            }}
          />
        </View>
      )}

      <AppText muted style={styles.note}>
        {ka.auth.adultNote}
      </AppText>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  title: { fontSize: 32, lineHeight: 44 },
  form: { gap: 16 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  note: { fontSize: 13, lineHeight: 18, marginTop: 'auto' },
});
