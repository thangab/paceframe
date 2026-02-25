import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LayoutPreview } from '@/components/preview/panel/LayoutPreview';
import { isSameSunsetPrimaryGradient } from '@/components/preview/panel/utils';
import { FONT_PRESETS, TEMPLATES } from '@/lib/previewConfig';
import type { FieldId, StatsLayout } from '@/types/preview';
import type { HeaderFieldId, StyleLayerId } from '@/components/preview/panel/types';

type Props = {
  styles: any;
  colors: any;
  quickTemplateMode: boolean;
  templateOptions: { id: string; name: string; premium?: boolean }[];
  isPremium: boolean;
  selectedTemplateId?: string;
  onSelectTemplate?: (templateId: string) => void;
  template: StatsLayout;
  onSelectLayout: (t: StatsLayout) => void;
  effectiveVisible: Record<FieldId, boolean>;
  supportsFullStatsPreview: boolean;
  statsFieldAvailability: Record<FieldId, boolean>;
  supportsPrimaryLayer: boolean;
  primaryField: FieldId;
  onSetPrimaryField: (field: FieldId) => void;
  onToggleField: (field: FieldId, value: boolean) => void;
  hasLapPaceLayer: boolean;
  hasHeartRateLayer: boolean;
  showChartAxes: boolean;
  onSetShowChartAxes: (value: boolean) => void;
  showChartGrid: boolean;
  onSetShowChartGrid: (value: boolean) => void;
  paceChartOrientation: 'horizontal' | 'vertical';
  onSetPaceChartOrientation: (value: 'horizontal' | 'vertical') => void;
  paceChartFill: 'gradient' | 'plain';
  onSetPaceChartFill: (value: 'gradient' | 'plain') => void;
  headerVisible: Record<HeaderFieldId, boolean>;
  onToggleHeaderField: (field: HeaderFieldId, value: boolean) => void;
  selectedFontId: string;
  onSelectFont: (fontId: string) => void;
  styleLayerButtons: { id: StyleLayerId; label: string }[];
  selectedStyleLayer: StyleLayerId;
  setSelectedStyleLayer: (id: StyleLayerId) => void;
  layerStyleMap: Record<StyleLayerId, { color: string; opacity: number }>;
  selectedLayerStyle: { color: string; opacity: number } | undefined;
  isSunsetPrimaryStyleSelected: boolean;
  sunsetPrimaryGradientPresets: [string, string, string][];
  sunsetPrimaryGradient: [string, string, string];
  onSetSunsetPrimaryGradient: (gradient: [string, string, string]) => void;
  setStylePickerOpen: (open: boolean) => void;
  colorPresets: string[];
  onSetLayerStyleColor: (layerId: StyleLayerId, color: string) => void;
};

export function DesignSection({
  styles,
  colors,
  quickTemplateMode,
  templateOptions,
  isPremium,
  selectedTemplateId,
  onSelectTemplate,
  template,
  onSelectLayout,
  effectiveVisible,
  supportsFullStatsPreview,
  statsFieldAvailability,
  supportsPrimaryLayer,
  primaryField,
  onSetPrimaryField,
  onToggleField,
  hasLapPaceLayer,
  hasHeartRateLayer,
  showChartAxes,
  onSetShowChartAxes,
  showChartGrid,
  onSetShowChartGrid,
  paceChartOrientation,
  onSetPaceChartOrientation,
  paceChartFill,
  onSetPaceChartFill,
  headerVisible,
  onToggleHeaderField,
  selectedFontId,
  onSelectFont,
  styleLayerButtons,
  selectedStyleLayer,
  setSelectedStyleLayer,
  layerStyleMap,
  selectedLayerStyle,
  isSunsetPrimaryStyleSelected,
  sunsetPrimaryGradientPresets,
  sunsetPrimaryGradient,
  onSetSunsetPrimaryGradient,
  setStylePickerOpen,
  colorPresets,
  onSetLayerStyleColor,
}: Props) {
  return (
    <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.controls}>
        <Text style={styles.sectionTitle}>{quickTemplateMode ? 'Templates' : 'Layouts'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {quickTemplateMode
            ? templateOptions.map((item) => {
                const isLocked = item.premium && !isPremium;
                const selected = item.id === selectedTemplateId;
                return (
                  <Pressable
                    key={item.id}
                    style={styles.templateItem}
                    onPress={() => onSelectTemplate?.(item.id)}
                    accessibilityLabel={item.name}
                  >
                    <View style={[styles.templateCard, selected && styles.templateCardSelected]}>
                      <View style={styles.templateModeIconWrap}>
                        <MaterialCommunityIcons
                          name="view-grid-outline"
                          size={20}
                          color={colors.text}
                        />
                      </View>
                      {isLocked ? <Text style={styles.templatePremiumBadge}>Premium</Text> : null}
                    </View>
                    <Text style={styles.templateCardName}>{item.name}</Text>
                  </Pressable>
                );
              })
            : TEMPLATES.map((item) => {
                const isLocked = item.premium && !isPremium;
                const selected = item.id === template.id;
                return (
                  <Pressable
                    key={item.id}
                    style={styles.templateItem}
                    onPress={() => onSelectLayout(item)}
                    accessibilityLabel={item.name}
                  >
                    <View style={[styles.templateCard, selected && styles.templateCardSelected]}>
                      <LayoutPreview template={item} colors={colors} />
                      {isLocked ? <Text style={styles.templatePremiumBadge}>Premium</Text> : null}
                    </View>
                    <Text style={styles.templateCardName}>{item.name}</Text>
                  </Pressable>
                );
              })}
        </ScrollView>
        {quickTemplateMode ? (
          <Text style={styles.stylePickerHint}>
            Template mode: only template + background image are editable.
          </Text>
        ) : null}

        {!quickTemplateMode ? (
          <>
            <Text style={styles.sectionTitle}>Stats Infos</Text>
            <View style={styles.statsPillsWrap}>
              {(
                [
                  ['distance', 'Distance'],
                  ['time', 'Time'],
                  ['pace', 'Pace'],
                  ['elev', 'Elev'],
                  ['cadence', 'Cadence'],
                  ['calories', 'Calories'],
                  ['avgHr', 'Avg HR'],
                ] as [FieldId, string][]
              ).map(([id, label]) => {
                const selected = effectiveVisible[id];
                const disabled = !statsFieldAvailability[id] || !supportsFullStatsPreview;
                const primaryDisabled = disabled || !selected;
                const isPrimary = supportsPrimaryLayer && id === primaryField;
                return (
                  <View key={id} style={styles.statsControlRow}>
                    <Pressable
                      disabled={disabled}
                      onPress={() => onToggleField(id, !selected)}
                      style={[
                        styles.statsPill,
                        styles.statsPillMain,
                        selected && styles.statsPillSelected,
                        disabled && styles.statsPillDisabled,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color={selected ? colors.primaryText : colors.textSubtle}
                      />
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[styles.statsPillText, selected && styles.statsPillTextSelected]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                    {supportsPrimaryLayer ? (
                      <Pressable
                        disabled={primaryDisabled}
                        onPress={() => onSetPrimaryField(id)}
                        style={[
                          styles.statsPrimaryBtn,
                          isPrimary && styles.statsPrimaryBtnSelected,
                          primaryDisabled && styles.statsPillDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Set ${label} as primary`}
                      >
                        <MaterialCommunityIcons
                          name={isPrimary ? 'star' : 'star-outline'}
                          size={13}
                          color={isPrimary ? colors.primaryText : colors.textSubtle}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {hasLapPaceLayer || hasHeartRateLayer ? (
              <>
                <Text style={styles.sectionTitle}>Chart Axes</Text>
                <View style={styles.mediaPickRow}>
                  <Pressable
                    style={[styles.chip, showChartAxes && styles.chipSelected, styles.unitChip]}
                    onPress={() => onSetShowChartAxes(true)}
                  >
                    <Text style={styles.chipText}>Show X/Y</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.chip, !showChartAxes && styles.chipSelected, styles.unitChip]}
                    onPress={() => onSetShowChartAxes(false)}
                  >
                    <Text style={styles.chipText}>Hide X/Y</Text>
                  </Pressable>
                </View>
                <Text style={styles.sectionTitle}>Chart Grid</Text>
                <View style={styles.mediaPickRow}>
                  <Pressable
                    style={[styles.chip, showChartGrid && styles.chipSelected, styles.unitChip]}
                    onPress={() => onSetShowChartGrid(true)}
                  >
                    <Text style={styles.chipText}>Show Grid</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.chip, !showChartGrid && styles.chipSelected, styles.unitChip]}
                    onPress={() => onSetShowChartGrid(false)}
                  >
                    <Text style={styles.chipText}>Hide Grid</Text>
                  </Pressable>
                </View>
                {hasLapPaceLayer ? (
                  <>
                    <Text style={styles.sectionTitle}>Pace Chart Direction</Text>
                    <View style={styles.mediaPickRow}>
                      <Pressable
                        style={[
                          styles.chip,
                          paceChartOrientation === 'vertical' && styles.chipSelected,
                          styles.unitChip,
                        ]}
                        onPress={() => onSetPaceChartOrientation('vertical')}
                      >
                        <Text style={styles.chipText}>Vertical</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.chip,
                          paceChartOrientation === 'horizontal' && styles.chipSelected,
                          styles.unitChip,
                        ]}
                        onPress={() => onSetPaceChartOrientation('horizontal')}
                      >
                        <Text style={styles.chipText}>Horizontal</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.sectionTitle}>Pace Chart Fill</Text>
                    <View style={styles.mediaPickRow}>
                      <Pressable
                        style={[
                          styles.chip,
                          paceChartFill === 'gradient' && styles.chipSelected,
                          styles.unitChip,
                        ]}
                        onPress={() => onSetPaceChartFill('gradient')}
                      >
                        <Text style={styles.chipText}>Gradient</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.chip,
                          paceChartFill === 'plain' && styles.chipSelected,
                          styles.unitChip,
                        ]}
                        onPress={() => onSetPaceChartFill('plain')}
                      >
                        <Text style={styles.chipText}>Plain</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Header infos</Text>
            <View style={styles.statsPillsWrap}>
              {(
                [
                  ['title', 'Title'],
                  ['date', 'Date'],
                  ['location', 'Location'],
                ] as [HeaderFieldId, string][]
              ).map(([id, label]) => {
                const selected = headerVisible[id];
                return (
                  <Pressable
                    key={id}
                    onPress={() => onToggleHeaderField(id, !selected)}
                    style={[styles.statsPill, selected && styles.statsPillSelected]}
                  >
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={selected ? colors.primaryText : colors.textSubtle}
                    />
                    <Text style={[styles.statsPillText, selected && styles.statsPillTextSelected]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Font</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {FONT_PRESETS.map((item) => {
                const selected = item.id === selectedFontId;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => onSelectFont(item.id)}
                  >
                    <Text style={[styles.chipText, { fontFamily: item.family }]}>{item.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Colors</Text>
            <View style={styles.styleLayerButtonsRow}>
              {styleLayerButtons.map((item) => {
                const selected = item.id === selectedStyleLayer;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.styleLayerButton, selected && styles.styleLayerButtonSelected]}
                    onPress={() => setSelectedStyleLayer(item.id)}
                  >
                    <View
                      style={[
                        styles.styleLayerButtonDot,
                        {
                          backgroundColor: layerStyleMap[item.id].color,
                          opacity: layerStyleMap[item.id].opacity,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.styleLayerButtonText,
                        selected && styles.styleLayerButtonTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.stylePickerHint}>
              Choose a layer, then pick a default color or open the picker.
            </Text>
            <View style={styles.stylePickerMetaRow}>
              <View style={styles.stylePickerPreviewSwatch}>
                <View style={styles.stylePickerPreviewSwatchChecker}>
                  {Array.from({ length: 2 }).map((_, row) => (
                    <View key={`preview-row-${row}`} style={styles.opacityCheckerRow}>
                      {Array.from({ length: 4 }).map((__, col) => (
                        <View
                          key={`preview-cell-${row}-${col}`}
                          style={[
                            styles.opacityCheckerCell,
                            (row + col) % 2 === 0
                              ? styles.opacityCheckerCellDark
                              : styles.opacityCheckerCellLight,
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
                <View
                  style={[
                    styles.stylePickerPreviewSwatchTint,
                    {
                      backgroundColor: selectedLayerStyle?.color ?? colors.solidWhite,
                      opacity: selectedLayerStyle?.opacity ?? 1,
                    },
                  ]}
                />
              </View>
              <Text style={styles.stylePickerMetaText}>
                {(selectedLayerStyle?.color ?? colors.solidWhite).toUpperCase()} •{' '}
                {Math.round((selectedLayerStyle?.opacity ?? 1) * 100)}%
              </Text>
            </View>
            {isSunsetPrimaryStyleSelected ? (
              <>
                <Text style={styles.sectionTitle}>Primary Gradient</Text>
                <Text style={styles.stylePickerHint}>
                  Sunset primary can stay gradient. Tap a preset.
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sunsetGradientPresetRow}
                >
                  {sunsetPrimaryGradientPresets.map((preset, index) => {
                    const isSelected = isSameSunsetPrimaryGradient(
                      sunsetPrimaryGradient,
                      preset,
                    );
                    return (
                      <Pressable
                        key={`sunset-primary-gradient-${index}`}
                        onPress={() => onSetSunsetPrimaryGradient(preset)}
                        style={[
                          styles.sunsetGradientPresetCard,
                          isSelected && styles.sunsetGradientPresetCardSelected,
                        ]}
                      >
                        <LinearGradient
                          colors={preset}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                          style={styles.sunsetGradientPresetFill}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
            <View style={styles.quickColorRow}>
              <Pressable
                onPress={() => setStylePickerOpen(true)}
                style={({ pressed }) => [
                  styles.openPickerButton,
                  pressed && styles.openPickerButtonPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="palette-outline"
                  size={14}
                  color={colors.text}
                />
                <Text style={styles.openPickerButtonText}>Color Picker</Text>
              </Pressable>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.styleControlsRow}
              >
                {colorPresets.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      selectedLayerStyle?.color === color && styles.colorSwatchSelected,
                    ]}
                    onPress={() => onSetLayerStyleColor(selectedStyleLayer, color)}
                  />
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
