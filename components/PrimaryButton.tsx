import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { colors, radius, spacing } from '@/constants/theme';

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
  const isPanelScheme = colorScheme === 'panel';
  const labelColor =
    variant === 'primary'
      ? '#111500'
      : variant === 'danger'
        ? '#FFFFFF'
        : isPanelScheme
          ? '#E5E7EB'
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

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonCompact: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  buttonVertical: {
    flexDirection: 'column',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryPanel: {
    backgroundColor: '#242935',
    borderColor: '#2F3644',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontWeight: '400',
    fontSize: 16,
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
