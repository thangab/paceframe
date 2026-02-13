import { Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/constants/theme';

const BUTTON_LABEL_COLOR = '#111500';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  icon,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={BUTTON_LABEL_COLOR}
          style={styles.icon}
        />
      ) : null}
      <Text style={styles.label}>{label}</Text>
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
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: BUTTON_LABEL_COLOR,
    fontWeight: '700',
    fontSize: 16,
  },
  icon: {
    marginRight: 8,
  },
});
