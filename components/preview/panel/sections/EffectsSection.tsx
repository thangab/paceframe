import { Pressable, ScrollView, Text, View } from 'react-native';
import type { VisualEffectPreset } from '@/components/preview/panel/types';

type Props = {
  styles: any;
  filterEffects: VisualEffectPreset[];
  blurEffects: VisualEffectPreset[];
  selectedFilterEffectId: string;
  selectedBlurEffectId: string;
  onSetFilterEffect: (effectId: string) => void;
  onSetBlurEffect: (effectId: string) => void;
  hasSubjectFree: boolean;
};

function EffectsRow({
  styles,
  effects,
  selectedId,
  onSelect,
}: {
  styles: any;
  effects: VisualEffectPreset[];
  selectedId: string;
  onSelect: (effectId: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.effectsList}
    >
      {effects.map((effect) => {
        const selected = effect.id === selectedId;
        return (
          <Pressable
            key={effect.id}
            onPress={() => onSelect(effect.id)}
            style={({ pressed }) => [
              styles.effectCard,
              selected && styles.effectCardSelected,
              pressed && styles.effectCardPressed,
            ]}
          >
            <Text style={styles.effectTitle}>{effect.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function EffectsSection({
  styles,
  filterEffects,
  blurEffects,
  selectedFilterEffectId,
  selectedBlurEffectId,
  onSetFilterEffect,
  onSetBlurEffect,
  hasSubjectFree,
}: Props) {
  return (
    <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.controls}>
        <Text style={styles.sectionTitle}>Filters</Text>
        <EffectsRow
          styles={styles}
          effects={filterEffects}
          selectedId={selectedFilterEffectId}
          onSelect={onSetFilterEffect}
        />
      </View>
      {hasSubjectFree ? (
        <View style={[styles.controls, styles.effectsSectionSpacing]}>
          <Text style={styles.sectionTitle}>Blur</Text>
          <EffectsRow
            styles={styles}
            effects={blurEffects}
            selectedId={selectedBlurEffectId}
            onSelect={onSetBlurEffect}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}
