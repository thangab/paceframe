import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { exchangeCodeWithSupabase } from '@/lib/strava';
import { useAuthStore } from '@/store/authStore';

export default function OAuthCallbackScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const login = useAuthStore((s) => s.login);
  const tokens = useAuthStore((s) => s.tokens);
  const { code: rawCode } = useLocalSearchParams<{
    code?: string | string[];
  }>();
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  const handledCodeRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Must stay aligned with redirect_uri sent to Strava in login.tsx.
  const redirectUri = 'paceframe://app/oauth';

  useEffect(() => {
    if (tokens?.accessToken) {
      router.replace('/activities');
      return;
    }

    if (!code || typeof code !== 'string') {
      setError('Missing authorization code from Strava.');
      return;
    }
    if (handledCodeRef.current === code) return;
    handledCodeRef.current = code;

    let cancelled = false;
    void (async () => {
      try {
        const tokens = await exchangeCodeWithSupabase({ code, redirectUri });
        if (cancelled) return;
        await login(tokens);
        router.replace('/activities');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Login failed.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, login, tokens?.accessToken]);

  if (!error) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.loader}
        />
        <Text style={styles.title}>Connexion Strava...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.errorTitle}>Connexion impossible</Text>
      <Text style={styles.errorText}>{error}</Text>
      <PrimaryButton label="Retour au login" onPress={() => router.replace('/login')} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 16,
      color: colors.text,
    },
    loader: {
      transform: [{ scale: 1.35 }],
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.danger,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
