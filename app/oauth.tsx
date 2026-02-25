import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { exchangeCodeWithSupabase } from '@/lib/strava';
import { STRAVA_REDIRECT_URI } from '@/lib/stravaOAuth';
import { useAuthStore } from '@/store/authStore';

function isStaleOAuthCodeError(message: string) {
  return /(invalid_grant|authorization code|invalid code|expired code|bad request)/i.test(
    message,
  );
}

function normalizeScopeSet(rawScope: string | undefined) {
  if (!rawScope) return null;
  return new Set(
    rawScope
      .split(/[,\s]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Authorization timed out. Please try again.'));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export default function OAuthCallbackScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const login = useAuthStore((s) => s.login);
  const tokens = useAuthStore((s) => s.tokens);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const {
    code: rawCode,
    error: rawError,
    error_description: rawErrorDescription,
    scope: rawScope,
  } = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
    scope?: string | string[];
  }>();
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  const oauthError = Array.isArray(rawError) ? rawError[0] : rawError;
  const oauthErrorDescription = Array.isArray(rawErrorDescription)
    ? rawErrorDescription[0]
    : rawErrorDescription;
  const scope = Array.isArray(rawScope) ? rawScope[0] : rawScope;
  const handledCodeRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetAndReplace(path: '/activities' | '/login') {
    if (router.canGoBack()) {
      router.dismissAll();
    }
    router.replace(path);
  }

  useEffect(() => {
    if (!isHydrated) return;

    if (tokens?.accessToken) {
      resetAndReplace('/activities');
      return;
    }

    if (oauthError) {
      if (/access_denied/i.test(oauthError)) {
        setError(
          'Strava authorization was cancelled. Please allow activity access to continue.',
        );
        return;
      }
      setError(
        oauthErrorDescription
          ? `${oauthError}: ${oauthErrorDescription}`
          : oauthError,
      );
      return;
    }

    const grantedScopes = normalizeScopeSet(scope);
    if (grantedScopes) {
      const hasActivityScope =
        grantedScopes.has('activity:read') ||
        grantedScopes.has('activity:read_all');
      if (!hasActivityScope) {
        setError(
          'Strava connected, but activity permission is missing. Please authorize activity access and try again.',
        );
        return;
      }
    }

    if (!code || typeof code !== 'string') {
      resetAndReplace('/login');
      return;
    }
    if (handledCodeRef.current === code) return;
    handledCodeRef.current = code;

    let cancelled = false;
    void (async () => {
      try {
        const tokens = await withTimeout(
          exchangeCodeWithSupabase({
            code,
            redirectUri: STRAVA_REDIRECT_URI,
          }),
          12000,
        );
        if (cancelled) return;
        await login(tokens);
        resetAndReplace('/activities');
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Login failed.';
        if (isStaleOAuthCodeError(message)) {
          resetAndReplace('/login');
          return;
        }
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    code,
    isHydrated,
    login,
    oauthError,
    oauthErrorDescription,
    scope,
    tokens?.accessToken,
  ]);

  if (!error) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.loader}
        />
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.errorTitle}>Connection failed</Text>
      <Text style={styles.errorText}>{error}</Text>
      <PrimaryButton
        label="Back to login"
        onPress={() => resetAndReplace('/login')}
      />
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
