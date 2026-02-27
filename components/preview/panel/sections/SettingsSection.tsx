import { Pressable, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  createDistanceUnitOptions,
  createElevationUnitOptions,
  createThemeModeOptions,
} from '@/components/preview/panel/data';
import type { DistanceUnit, ElevationUnit } from '@/lib/format';
import type { AppThemeMode } from '@/store/themeStore';

type Props = {
  styles: any;
  themeMode: AppThemeMode;
  setThemeMode: (mode: AppThemeMode) => Promise<void>;
  distanceUnit: DistanceUnit;
  onSetDistanceUnit: (unit: DistanceUnit) => void;
  elevationUnit: ElevationUnit;
  onSetElevationUnit: (unit: ElevationUnit) => void;
  message: string | null;
  appCacheUsageLabel?: string;
  onClearAppCache?: () => void;
  supportsFullStatsPreview: boolean;
  isPremium: boolean;
  onOpenPaywall: () => void;
  onCloseHelpPopover?: () => void;
  compactNote: boolean;
};

export function SettingsSection({
  styles,
  themeMode,
  setThemeMode,
  distanceUnit,
  onSetDistanceUnit,
  elevationUnit,
  onSetElevationUnit,
  message,
  appCacheUsageLabel,
  onClearAppCache,
  supportsFullStatsPreview,
  isPremium,
  onOpenPaywall,
  onCloseHelpPopover,
  compactNote,
}: Props) {
  return (
    <View style={styles.controls}>
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.themeModeRow}>
        {createThemeModeOptions().map((item) => {
          const selected = item.id === themeMode;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                void setThemeMode(item.id);
              }}
              style={[
                styles.themeModeChip,
                selected && styles.themeModeChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.themeModeChipText,
                  selected && styles.themeModeChipTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.sectionTitle}>Distance Unit</Text>
      <View style={styles.mediaPickRow}>
        {createDistanceUnitOptions().map((item) => {
          const selected = item.id === distanceUnit;
          return (
            <Pressable
              key={item.id}
              style={[
                styles.chip,
                selected && styles.chipSelected,
                styles.unitChip,
              ]}
              onPress={() => onSetDistanceUnit(item.id)}
            >
              <Text style={styles.chipText}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.sectionTitle}>Elevation Unit</Text>
      <View style={styles.mediaPickRow}>
        {createElevationUnitOptions().map((item) => {
          const selected = item.id === elevationUnit;
          return (
            <Pressable
              key={item.id}
              style={[
                styles.chip,
                selected && styles.chipSelected,
                styles.unitChip,
              ]}
              onPress={() => onSetElevationUnit(item.id)}
            >
              <Text style={styles.chipText}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.note}>
        {compactNote
          ? 'Pinch/rotate/drag blocks. Center and rotation guides appear during move.'
          : 'Pinch/rotate/drag blocks. Center and rotation guides appear during move. Tap stats to switch template. Tap route to switch map/trace.'}
      </Text>
      {message ? <Text style={styles.note}>{message}</Text> : null}
      {appCacheUsageLabel ? (
        <Text style={styles.note}>{appCacheUsageLabel}</Text>
      ) : null}
      {onClearAppCache ? (
        <PrimaryButton
          label="Clear cache"
          icon="broom"
          onPress={onClearAppCache}
          variant="secondary"
          colorScheme="panel"
        />
      ) : null}
      {!supportsFullStatsPreview ? (
        <Text style={styles.note}>
          For this activity type, preview shows Time only.
        </Text>
      ) : null}
      {!isPremium ? (
        <PrimaryButton
          label="Unlock Premium Layouts"
          onPress={() => {
            onCloseHelpPopover?.();
            onOpenPaywall();
          }}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}
