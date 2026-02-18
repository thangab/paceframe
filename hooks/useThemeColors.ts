import { useMemo } from 'react';
import { darkColors, lightColors } from '@/constants/theme';
import { useThemeStore } from '@/store/themeStore';

export function useThemeColors() {
  const mode = useThemeStore((s) => s.mode);

  return useMemo(() => (mode === 'dark' ? darkColors : lightColors), [mode]);
}
