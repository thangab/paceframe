import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function IndexScreen() {
  const tokens = useAuthStore((s) => s.tokens);

  if (tokens) {
    return <Redirect href="/activities" />;
  }

  return <Redirect href="/login" />;
}
