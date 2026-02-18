import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { radius, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconElement?: ReactNode;
  colorScheme?: 'default' | 'panel';
  iconPosition?: 'left' | 'top';
  compact?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  icon,
  iconElement,
  colorScheme = 'default',
  iconPosition = 'left',
  compact = false,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPanelScheme = colorScheme === 'panel';
  const labelColor =
    variant === 'primary'
      ? colors.primaryText
      : variant === 'danger'
        ? colors.onDanger
        : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.buttonCompact : null,
        iconPosition === 'top' ? styles.buttonVertical : null,
        styles[variant],
        isPanelScheme && variant === 'secondary' && styles.secondaryPanel,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {iconElement ? (
        <View
          style={[
            iconPosition === 'top' ? styles.iconTop : styles.iconLeft,
            compact ? styles.iconCompact : null,
          ]}
        >
          {iconElement}
        </View>
      ) : null}
      {!iconElement && icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={compact ? 14 : 16}
          color={labelColor}
          style={[
            iconPosition === 'top' ? styles.iconTop : styles.iconLeft,
            compact ? styles.iconCompact : null,
          ]}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          compact ? styles.labelCompact : null,
          { color: labelColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      minHeight: 52,
      borderRadius: radius.lg + 2,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.md + 2,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    buttonCompact: {
      minHeight: 44,
      paddingVertical: 8,
      paddingHorizontal: 6,
    },
    buttonVertical: {
      flexDirection: 'column',
    },
    primary: {
      backgroundColor: colors.primary,
      borderWidth: 0,
      shadowColor: colors.text,
      shadowOpacity: 0.16,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    secondaryPanel: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
    },
    danger: {
      backgroundColor: colors.danger,
      borderWidth: 0,
      shadowColor: colors.danger,
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    pressed: {
      opacity: 0.96,
      transform: [{ scale: 0.985 }],
    },
    disabled: {
      opacity: 0.55,
    },
    label: {
      fontWeight: '800',
      fontSize: 15,
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    labelCompact: {
      fontSize: 11,
      lineHeight: 13,
    },
    iconLeft: {
      marginRight: 8,
    },
    iconTop: {
      marginBottom: 4,
    },
    iconCompact: {
      marginRight: 0,
    },
  });
}
