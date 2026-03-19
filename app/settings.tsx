import { ReactNode, useCallback, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router, useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { radius, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resetActivityLoadState } from '@/lib/activityLoadState';
import {
  buildGarminOAuthStartUrl,
  GARMIN_APP_OAUTH_REDIRECT_URI,
} from '@/lib/garminOAuth';
import { importActivitiesFromHealthKit } from '@/lib/healthkit';
import { getMockTokens } from '@/lib/strava';
import { buildStravaMobileAuthorizeUrl } from '@/lib/stravaOAuth';
import { useActivityStore } from '@/store/activityStore';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useThemeStore } from '@/store/themeStore';

type ConnectionStatus = 'connected' | 'available' | 'disconnected';
type ConnectionAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};
type PreferenceOption = {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export default function SettingsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const connections = useAuthStore((s) => s.connections);
  const activeProvider = useAuthStore((s) => s.activeProvider);
  const logout = useAuthStore((s) => s.logout);
  const disconnect = useAuthStore((s) => s.disconnect);
  const login = useAuthStore((s) => s.login);
  const setActiveProvider = useAuthStore((s) => s.setActiveProvider);
  const clearActivities = useActivityStore((s) => s.clearActivities);
  const setActivities = useActivityStore((s) => s.setActivities);
  const source = useActivityStore((s) => s.source);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const stravaClientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID?.trim();
  const distanceUnit = usePreferencesStore((s) => s.distanceUnit);
  const elevationUnit = usePreferencesStore((s) => s.elevationUnit);
  const setDistanceUnit = usePreferencesStore((s) => s.setDistanceUnit);
  const setElevationUnit = usePreferencesStore((s) => s.setElevationUnit);
  const [appCacheUsageLabel, setAppCacheUsageLabel] = useState('Cache: --');
  const [message, setMessage] = useState<string | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isConnectingStrava, setIsConnectingStrava] = useState(false);
  const [isConnectingGarmin, setIsConnectingGarmin] = useState(false);
  const [isImportingHealth, setIsImportingHealth] = useState(false);
  const isGarminConnected = Boolean(connections.garmin?.accessToken);
  const isStravaConnected =
    Boolean(connections.strava?.accessToken) &&
    !(connections.strava?.accessToken?.startsWith('mock-') ?? false);
  const isHealthImported = source === 'healthkit';
  const isStravaActive = activeProvider === 'strava' && source !== 'healthkit';
  const isGarminActive = activeProvider === 'garmin' && source !== 'healthkit';
  const isHealthActive = source === 'healthkit';
  const themeOptions: PreferenceOption[] = [
    {
      id: 'light',
      label: 'Light',
      description: 'Bright interface with stronger daylight contrast.',
      icon: 'white-balance-sunny',
    },
    {
      id: 'dark',
      label: 'Dark',
      description: 'Lower glare for editing and browsing at night.',
      icon: 'weather-night',
    },
  ];
  const unitOptions: PreferenceOption[] = [
    {
      id: 'metric',
      label: 'Metric',
      description: 'Distance in km, elevation in m.',
      icon: 'map-marker-distance',
    },
    {
      id: 'imperial',
      label: 'Imperial',
      description: 'Distance in mi, elevation in ft.',
      icon: 'ruler-square',
    },
  ];

  const directorySizeBytes = useCallback(
    async (dirUri: string): Promise<number> => {
      try {
        const entries = await FileSystem.readDirectoryAsync(dirUri);
        let total = 0;
        for (const name of entries) {
          const child = `${dirUri}${name}`;
          const info = await FileSystem.getInfoAsync(child);
          if (!info.exists) continue;
          if (info.isDirectory) {
            total += await directorySizeBytes(`${child}/`);
          } else if (typeof info.size === 'number') {
            total += info.size;
          }
        }
        return total;
      } catch {
        return 0;
      }
    },
    [],
  );

  const refreshAppCacheUsage = useCallback(async () => {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      setAppCacheUsageLabel('Cache: unavailable');
      return;
    }

    const bytes = await directorySizeBytes(cacheDir);
    const mb = bytes / (1024 * 1024);
    setAppCacheUsageLabel(`Cache: ${mb.toFixed(mb >= 100 ? 0 : 1)} MB`);
  }, [directorySizeBytes]);

  async function clearDirectory(dirUri: string) {
    const entries = await FileSystem.readDirectoryAsync(dirUri);
    for (const name of entries) {
      const child = `${dirUri}${name}`;
      const info = await FileSystem.getInfoAsync(child);
      if (!info.exists) continue;
      if (info.isDirectory) {
        await clearDirectory(`${child}/`);
      }
      await FileSystem.deleteAsync(child, { idempotent: true });
    }
  }

  async function clearAppCache() {
    if (isClearingCache) return;
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      setMessage('Cache unavailable.');
      return;
    }

    try {
      setIsClearingCache(true);
      setMessage('Clearing cache...');
      await clearDirectory(cacheDir);
      await refreshAppCacheUsage();
      setMessage('Cache cleared.');
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `Could not clear cache (${err.message}).`
          : 'Could not clear cache.',
      );
    } finally {
      setIsClearingCache(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void refreshAppCacheUsage();
    }, [refreshAppCacheUsage]),
  );

  const resetAndReplace = useCallback((path: '/activities' | '/login') => {
    if (router.canGoBack()) {
      router.dismissAll();
    }
    router.replace(path);
  }, []);

  async function performLogout() {
    await logout();
    clearActivities();
    resetActivityLoadState();
    resetAndReplace('/login');
  }

  async function activateProvider(provider: 'strava' | 'garmin' | 'mock') {
    await setActiveProvider(provider);
    clearActivities();
    resetActivityLoadState();
    resetAndReplace('/activities');
  }

  function handleLogout() {
    Alert.alert('Logout', 'Do you want to log out of PaceFrame?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          void performLogout();
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This will remove your local PaceFrame session and clear loaded activities on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void performLogout();
          },
        },
      ],
    );
  }

  async function handleStravaConnect() {
    if (isConnectingStrava) return;
    if (isStravaConnected) {
      setMessage('Strava is already connected.');
      return;
    }
    if (!stravaClientId) {
      setMessage('Missing EXPO_PUBLIC_STRAVA_CLIENT_ID in .env');
      return;
    }
    if (!/^\d+$/.test(stravaClientId)) {
      setMessage(
        `Invalid EXPO_PUBLIC_STRAVA_CLIENT_ID: "${stravaClientId}". Expected numeric Strava Client ID.`,
      );
      return;
    }

    try {
      setIsConnectingStrava(true);
      setMessage(null);
      const authUrl = buildStravaMobileAuthorizeUrl({
        clientId: stravaClientId,
      });
      await Linking.openURL(authUrl);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Strava connection failed.',
      );
    } finally {
      setIsConnectingStrava(false);
    }
  }

  async function handleGarminConnect() {
    if (isConnectingGarmin) return;
    if (isGarminConnected) {
      setMessage('Garmin is already connected.');
      return;
    }

    try {
      setIsConnectingGarmin(true);
      setMessage(null);
      const { authUrl } = await buildGarminOAuthStartUrl();
      await Linking.openURL(authUrl);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Garmin login failed.');
    } finally {
      setIsConnectingGarmin(false);
    }
  }

  async function handleHealthConnect() {
    if (isImportingHealth) return;
    if (isHealthImported) {
      setMessage('Apple Health is already imported.');
      return;
    }
    if (Platform.OS !== 'ios') {
      setMessage('Apple Health import is available on iPhone only.');
      return;
    }

    try {
      setIsImportingHealth(true);
      setMessage(null);
      const activities = await importActivitiesFromHealthKit();
      if (activities.length === 0) {
        setMessage('No HealthKit workouts found.');
        return;
      }
      setActivities(activities, 'healthkit');
      await login(getMockTokens());
      resetActivityLoadState();
      resetAndReplace('/activities');
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'HealthKit import failed.',
      );
    } finally {
      setIsImportingHealth(false);
    }
  }

  function reconnectStrava() {
    if (!stravaClientId) {
      setMessage('Missing EXPO_PUBLIC_STRAVA_CLIENT_ID in .env');
      return;
    }
    if (!/^\d+$/.test(stravaClientId)) {
      setMessage(
        `Invalid EXPO_PUBLIC_STRAVA_CLIENT_ID: "${stravaClientId}". Expected numeric Strava Client ID.`,
      );
      return;
    }
    Alert.alert(
      'Reconnect Strava',
      'This will replace the current active connection with Strava.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reconnect',
          onPress: () => {
            void (async () => {
              try {
                setIsConnectingStrava(true);
                setMessage(null);
                const authUrl = buildStravaMobileAuthorizeUrl({
                  clientId: stravaClientId,
                });
                await Linking.openURL(authUrl);
              } catch (err) {
                setMessage(
                  err instanceof Error
                    ? err.message
                    : 'Strava reconnection failed.',
                );
              } finally {
                setIsConnectingStrava(false);
              }
            })();
          },
        },
      ],
    );
  }

  function reconnectGarmin() {
    Alert.alert(
      'Reconnect Garmin',
      'This will replace the current active connection with Garmin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reconnect',
          onPress: () => {
            void (async () => {
              try {
                setIsConnectingGarmin(true);
                setMessage(null);
                const { authUrl } = await buildGarminOAuthStartUrl();
                await Linking.openURL(authUrl);
              } catch (err) {
                setMessage(
                  err instanceof Error ? err.message : 'Garmin login failed.',
                );
              } finally {
                setIsConnectingGarmin(false);
              }
            })();
          },
        },
      ],
    );
  }

  function reconnectHealth() {
    Alert.alert(
      'Reconnect Apple Health',
      'This will re-import your Apple Health workouts and replace the current active connection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reconnect',
          onPress: () => {
            void handleHealthReconnect();
          },
        },
      ],
    );
  }

  async function handleHealthReconnect() {
    if (isImportingHealth) return;
    if (Platform.OS !== 'ios') {
      setMessage('Apple Health import is available on iPhone only.');
      return;
    }

    try {
      setIsImportingHealth(true);
      setMessage(null);
      const activities = await importActivitiesFromHealthKit();
      if (activities.length === 0) {
        setMessage('No HealthKit workouts found.');
        return;
      }
      setActivities(activities, 'healthkit');
      await login(getMockTokens());
      resetActivityLoadState();
      resetAndReplace('/activities');
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'HealthKit import failed.',
      );
    } finally {
      setIsImportingHealth(false);
    }
  }

  function disconnectProvider(connectionName: 'Strava' | 'Garmin' | 'Apple Health') {
    if (connectionName === 'Apple Health') {
      Alert.alert(
        'Disconnect Apple Health',
        'This will clear imported Apple Health activities from this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => {
              clearActivities();
              resetActivityLoadState();
              setMessage('Apple Health disconnected.');
            },
          },
        ],
      );
      return;
    }

    const provider = connectionName === 'Strava' ? 'strava' : 'garmin';
    const wasActive = activeProvider === provider && source !== 'healthkit';

    Alert.alert(
      `Disconnect ${connectionName}`,
      `This will remove the saved ${connectionName} connection from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await disconnect(provider);
              setMessage(`${connectionName} disconnected.`);
              if (wasActive) {
                clearActivities();
                resetActivityLoadState();
                resetAndReplace('/activities');
              }
            })();
          },
        },
      ],
    );
  }

  const stravaActions: ConnectionAction[] = isStravaConnected
    ? [
        ...(isStravaActive
          ? []
          : [
              {
                label: 'Use',
                onPress: () => {
                  void activateProvider('strava');
                },
                variant: 'secondary' as const,
                disabled: isConnectingStrava,
              },
            ]),
        {
          label: 'Disconnect',
          onPress: () => disconnectProvider('Strava'),
          variant: 'secondary',
          disabled: isConnectingStrava,
        },
        {
          label: 'Reconnect',
          onPress: reconnectStrava,
          disabled: isConnectingStrava,
        },
      ]
    : [
        {
          label: 'Connect',
          onPress: handleStravaConnect,
          disabled: isConnectingStrava,
        },
      ];

  const garminActions: ConnectionAction[] = isGarminConnected
    ? [
        ...(isGarminActive
          ? []
          : [
              {
                label: 'Use',
                onPress: () => {
                  void activateProvider('garmin');
                },
                variant: 'secondary' as const,
                disabled: isConnectingGarmin,
              },
            ]),
        {
          label: 'Disconnect',
          onPress: () => disconnectProvider('Garmin'),
          variant: 'secondary',
          disabled: isConnectingGarmin,
        },
        {
          label: 'Reconnect',
          onPress: reconnectGarmin,
          disabled: isConnectingGarmin,
        },
      ]
    : [
        {
          label: 'Connect',
          onPress: handleGarminConnect,
          disabled: isConnectingGarmin,
        },
      ];

  const healthActions: ConnectionAction[] =
    Platform.OS !== 'ios'
      ? []
      : isHealthImported
        ? [
            ...(isHealthActive
              ? []
              : [
                  {
                    label: 'Use',
                    onPress: () => {
                      resetAndReplace('/activities');
                    },
                    variant: 'secondary' as const,
                    disabled: isImportingHealth,
                  },
                ]),
            {
              label: 'Disconnect',
              onPress: () => disconnectProvider('Apple Health'),
              variant: 'secondary',
              disabled: isImportingHealth,
            },
            {
              label: 'Reconnect',
              onPress: reconnectHealth,
              disabled: isImportingHealth,
            },
          ]
        : [
            {
              label: 'Connect',
              onPress: handleHealthConnect,
              disabled: isImportingHealth,
            },
          ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Manage your preferences, storage, and connected services.
        </Text>
      </View>

      <SectionCard title="Theme">
        <View style={styles.preferenceGrid}>
          {themeOptions.map((item) => {
            const selected = item.id === themeMode;
            return (
              <PreferenceCard
                key={item.id}
                label={item.label}
                description={item.description}
                icon={item.icon}
                selected={selected}
                onPress={() => {
                  void setThemeMode(item.id as 'light' | 'dark');
                }}
              />
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Units">
        <View style={styles.preferenceGrid}>
          {unitOptions.map((item) => {
            const selected =
              item.id === 'metric'
                ? distanceUnit === 'km' && elevationUnit === 'm'
                : distanceUnit === 'mi' && elevationUnit === 'ft';
            return (
              <PreferenceCard
                key={item.id}
                label={item.label}
                description={item.description}
                icon={item.icon}
                selected={selected}
                onPress={() => {
                  if (item.id === 'metric') {
                    void Promise.all([
                      setDistanceUnit('km'),
                      setElevationUnit('m'),
                    ]);
                    return;
                  }
                  void Promise.all([
                    setDistanceUnit('mi'),
                    setElevationUnit('ft'),
                  ]);
                }}
              />
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Connections">
        <ConnectionRow
          icon="run"
          label="Strava"
          status={isStravaConnected ? 'connected' : 'disconnected'}
          detail={
            isStravaConnected
              ? isStravaActive
                ? 'Connected and currently active.'
                : 'Connected and ready to use.'
              : 'Not connected.'
          }
          actions={stravaActions}
        />
        <ConnectionRow
          icon="watch-variant"
          label="Garmin"
          status={isGarminConnected ? 'connected' : 'disconnected'}
          detail={
            isGarminConnected
              ? isGarminActive
                ? 'Connected and currently active.'
                : 'Connected and ready to use.'
              : 'Not connected.'
          }
          actions={garminActions}
        />
        <ConnectionRow
          icon="heart-pulse"
          label="Apple Health"
          status={
            Platform.OS !== 'ios'
              ? 'disconnected'
              : isHealthImported
                ? 'connected'
                : 'available'
          }
          detail={
            Platform.OS !== 'ios'
              ? 'Available on iPhone only.'
              : isHealthImported
                ? isHealthActive
                  ? 'Imported and currently active on this device.'
                  : 'Imported on this device.'
                : 'Available to import on iPhone.'
          }
          actions={healthActions}
        />
      </SectionCard>

      <SectionCard title="Storage">
        <Text style={styles.note}>{appCacheUsageLabel}</Text>
        {message ? <Text style={styles.note}>{message}</Text> : null}
        <PrimaryButton
          label="Clear cache"
          icon="broom"
          onPress={() => {
            void clearAppCache();
          }}
          disabled={isClearingCache}
          variant="secondary"
        />
      </SectionCard>

      {!isPremium ? (
        <View style={styles.actions}>
          <PrimaryButton
            label="Unlock Premium Layouts"
            onPress={() => router.push('/paywall')}
            variant="secondary"
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          label="Logout"
          icon="logout"
          onPress={handleLogout}
          variant="secondary"
        />
      </View>

      {isGarminConnected || isStravaConnected ? (
        <View style={styles.deleteWrap}>
          <PrimaryButton
            label="Delete account"
            icon="delete-outline"
            onPress={handleDeleteAccount}
            variant="danger"
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PreferenceCard({
  label,
  description,
  icon,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.preferenceCard,
        selected ? styles.preferenceCardSelected : null,
        pressed ? styles.preferenceCardPressed : null,
      ]}
    >
      <View style={styles.preferenceCardHeader}>
        <View
          style={[
            styles.preferenceIconWrap,
            selected ? styles.preferenceIconWrapSelected : null,
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={selected ? colors.primaryText : colors.text}
          />
        </View>
        {selected ? (
          <View style={styles.preferenceCheck}>
            <MaterialCommunityIcons
              name="check"
              size={14}
              color={colors.primaryText}
            />
          </View>
        ) : null}
      </View>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <Text style={styles.preferenceDescription}>{description}</Text>
    </Pressable>
  );
}

function ConnectionRow({
  icon,
  label,
  detail,
  status,
  actions,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  detail: string;
  status: ConnectionStatus;
  actions: ConnectionAction[];
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusColor =
    status === 'connected'
      ? colors.success
      : status === 'available'
        ? colors.accent
        : colors.textSubtle;
  const statusText =
    status === 'connected'
      ? 'Connected'
      : status === 'available'
        ? 'Available'
        : 'Not connected';

  return (
    <View style={styles.connectionCard}>
      <View style={styles.connectionRow}>
        <View style={styles.connectionIcon}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.text} />
        </View>
        <View style={styles.connectionCopy}>
          <Text style={styles.connectionLabel}>{label}</Text>
          <Text style={styles.connectionDetail}>{detail}</Text>
        </View>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>

      {actions.length > 0 ? (
        <View style={styles.connectionActions}>
          {actions.map((action) => (
            <View key={`${label}-${action.label}`} style={styles.connectionAction}>
              <PrimaryButton
                label={action.label}
                onPress={action.onPress}
                variant={action.variant ?? 'primary'}
                compact
                disabled={action.disabled}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xl + spacing.lg,
      gap: spacing.md,
    },
    hero: {
      gap: 6,
      paddingTop: spacing.sm,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
    },
    sectionCard: {
      gap: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.md,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    preferenceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    preferenceCard: {
      flexBasis: '48%',
      flexGrow: 1,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      padding: spacing.sm + 2,
      gap: spacing.xs,
    },
    preferenceCardSelected: {
      borderColor: colors.primaryBorderOnLight,
      backgroundColor: `${colors.primary}20`,
      shadowColor: colors.text,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    preferenceCardPressed: {
      transform: [{ scale: 0.985 }],
      opacity: 0.96,
    },
    preferenceCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    preferenceIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    preferenceIconWrapSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primaryBorderOnLight,
    },
    preferenceCheck: {
      width: 24,
      height: 24,
      borderRadius: 999,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    preferenceLabel: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    preferenceDescription: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    note: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    connectionCard: {
      gap: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      padding: spacing.sm,
    },
    connectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs / 2,
    },
    connectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectionCopy: {
      flex: 1,
      gap: 2,
    },
    connectionLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    connectionDetail: {
      color: colors.textMuted,
      fontSize: 12,
    },
    connectionStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    connectionActions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    connectionAction: {
      flex: 1,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
    },
    actions: {
      marginTop: spacing.xs,
    },
    deleteWrap: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
    },
  });
}
