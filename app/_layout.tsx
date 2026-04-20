import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { ActivityIndicator, LogBox, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Monoton_400Regular } from '@expo-google-fonts/monoton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useThemeStore } from '@/store/themeStore';

if (__DEV__) {
  LogBox.ignoreLogs([
    'Sending `onAnimatedValueUpdate` with no listeners registered.',
  ]);
}

export default function RootLayout() {
  useAppBootstrap();
  usePushNotifications();
  const [fontsLoaded] = useFonts({
    Monoton: Monoton_400Regular,
    DCCCloud: require('../assets/fonts/DCC-Cloud.otf'),
    Autography: require('../assets/fonts/Autography.otf'),
    ...MaterialCommunityIcons.font,
  });
  const colors = useThemeColors();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isThemeHydrated = useThemeStore((s) => s.isHydrated);
  const isPreferencesHydrated = usePreferencesStore((s) => s.isHydrated);
  const styles = createStyles(colors);
  const statusBarStyle = useThemeStore((s) =>
    s.mode === 'dark' ? 'light' : 'dark',
  );

  if (!isHydrated || !isThemeHydrated || !isPreferencesHydrated || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <StatusBar style={statusBarStyle} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={statusBarStyle} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="activities" options={{ title: 'Activities' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="preview" options={{ title: 'Preview' }} />
        <Stack.Screen name="paywall" options={{ title: 'PaceFrame Premium' }} />
        <Stack.Screen name="oauth" options={{ headerShown: false }} />
        <Stack.Screen name="app/oauth" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
  });
}
