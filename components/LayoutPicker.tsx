import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { templates } from '@/lib/layouts';
import { colors, radius, spacing } from '@/constants/theme';

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
  return (
    <View>
      <Text style={styles.label}>Layout</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {templates.map((template, idx) => {
          const isLocked = !isPremium && idx > 0;
          return (
            <Pressable
              key={template.id}
              onPress={() => (isLocked ? onPremiumLayoutPress() : onSelect(template.id))}
              style={[
                styles.card,
                { backgroundColor: template.backgroundBottom },
                selectedLayoutId === template.id && styles.selected,
              ]}
            >
              <Text style={styles.name}>{template.name}</Text>
              {isLocked ? <Text style={styles.lock}>Premium</Text> : <Text style={styles.lock}>Free</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
