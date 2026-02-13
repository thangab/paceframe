import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/authStore';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  useAppBootstrap();
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'PaceFrame' }} />
        <Stack.Screen
          name="activities"
          options={{ title: 'Choose Activity' }}
        />
        <Stack.Screen name="preview" options={{ title: 'Preview' }} />
        <Stack.Screen name="paywall" options={{ title: 'PaceFrame Premium' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
