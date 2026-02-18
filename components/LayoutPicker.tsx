import { useMemo } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { templates } from '@/lib/layouts';
import { radius, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  selectedLayoutId: string;
  isPremium: boolean;
  onSelect: (templateId: string) => void;
  onPremiumLayoutPress: () => void;
};

export function LayoutPicker({
  selectedLayoutId,
  isPremium,
  onSelect,
  onPremiumLayoutPress,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View>
      <Text style={styles.label}>Layout</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {templates.map((template, idx) => {
          const isLocked = !isPremium && idx > 0;
          return (
            <Pressable
              key={template.id}
              onPress={() =>
                isLocked ? onPremiumLayoutPress() : onSelect(template.id)
              }
              style={[
                styles.card,
                { backgroundColor: template.backgroundBottom },
                selectedLayoutId === template.id && styles.selected,
              ]}
            >
              <Text style={styles.name}>{template.name}</Text>
              <Text style={styles.lock}>{isLocked ? 'Premium' : 'Free'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: spacing.sm,
      fontSize: 16,
    },
    scroll: {
      gap: spacing.sm,
    },
    card: {
      width: 120,
      height: 90,
      borderRadius: radius.md,
      padding: spacing.sm,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    selected: {
      borderColor: colors.accent,
      borderWidth: 2,
    },
    name: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
    lock: {
      color: '#fff',
      fontSize: 12,
      opacity: 0.9,
    },
  });
}
