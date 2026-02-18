export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryText: string;
  accent: string;
  border: string;
  borderStrong: string;
  success: string;
  danger: string;
  dangerSurface: string;
  dangerBorder: string;
  dangerText: string;
  panelSurface: string;
  panelSurfaceOverlay: string;
  panelSurfaceAlt: string;
  panelBorder: string;
  panelText: string;
  panelTextMuted: string;
};

export const lightColors: ThemeColors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F7',
  surfaceStrong: '#E4EAF2',
  text: '#111827',
  textMuted: '#5C6675',
  textSubtle: '#8A94A5',
  primary: '#D4FF54',
  primaryText: '#111500',
  accent: '#2563EB',
  border: '#D3DBE5',
  borderStrong: '#C2CBD8',
  success: '#059669',
  danger: '#DC2626',
  dangerSurface: '#FEEAEA',
  dangerBorder: '#F3B7B7',
  dangerText: '#9F2727',
  panelSurface: '#242935',
  panelSurfaceOverlay: 'rgba(255, 255, 255, 0.92)',
  panelSurfaceAlt: '#202632',
  panelBorder: '#2F3644',
  panelText: '#E5E7EB',
  panelTextMuted: '#9CA3AF',
};

export const darkColors: ThemeColors = {
  background: '#0B1220',
  surface: '#131B2E',
  surfaceAlt: '#1A2438',
  surfaceStrong: '#243047',
  text: '#E6EDF8',
  textMuted: '#A2AFC4',
  textSubtle: '#7C8AA1',
  primary: '#D4FF54',
  primaryText: '#111500',
  accent: '#60A5FA',
  border: '#2E3A52',
  borderStrong: '#3C4A64',
  success: '#34D399',
  danger: '#F87171',
  dangerSurface: '#3A1F24',
  dangerBorder: '#7F1D1D',
  dangerText: '#FCA5A5',
  panelSurface: '#1A2438',
  panelSurfaceOverlay: 'rgba(11, 18, 32, 0.92)',
  panelSurfaceAlt: '#111827',
  panelBorder: '#2F3A50',
  panelText: '#E5E7EB',
  panelTextMuted: '#9CA3AF',
};

// Backward compatibility for files not yet migrated to dynamic theming.
export const colors = lightColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
};
