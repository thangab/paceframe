import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatsLayerContent } from '@/components/StatsLayerContent';
import { colors, spacing } from '@/constants/theme';
import type { DistanceUnit } from '@/lib/format';
import { FONT_PRESETS, TEMPLATES } from '@/lib/previewConfig';
import type {
  FieldId,
  LayerId,
  RouteMode,
  StatsTemplate,
} from '@/types/preview';

export type PreviewPanelTab =
  | 'background'
  | 'content'
  | 'style'
  | 'data'
  | 'help';
type HeaderFieldId = 'title' | 'date' | 'location';

type Props = {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  activePanel: PreviewPanelTab;
  setActivePanel: (panel: PreviewPanelTab) => void;
  busy: boolean;
  isExtracting: boolean;
  onPickImage: () => void;
  onPickVideo: () => void;
  onClearBackground: () => void;
  onGenerateGradient: () => void;
  onAddImageOverlay: () => void;
  isSquareFormat: boolean;
  layerEntries: { id: LayerId; label: string; isBehind: boolean }[];
  routeMode: RouteMode;
  visibleLayers: Partial<Record<LayerId, boolean>>;
  selectedLayer: LayerId;
  setSelectedLayer: (layer: LayerId) => void;
  onToggleLayer: (layer: LayerId, value: boolean) => void;
  onReorderLayers: (
    entries: { id: LayerId; label: string; isBehind: boolean }[],
  ) => void;
  onSetLayerBehindSubject: (layer: LayerId, value: boolean) => void;
  onRemoveLayer: (layer: LayerId) => void;
  template: StatsTemplate;
  onSelectTemplate: (t: StatsTemplate) => void;
  selectedFontId: string;
  onSelectFont: (fontId: string) => void;
  effectiveVisible: Record<FieldId, boolean>;
  supportsFullStatsPreview: boolean;
  onToggleField: (field: FieldId, value: boolean) => void;
  headerVisible: Record<HeaderFieldId, boolean>;
  onToggleHeaderField: (field: HeaderFieldId, value: boolean) => void;
  distanceUnit: DistanceUnit;
  onSetDistanceUnit: (unit: DistanceUnit) => void;
  isPremium: boolean;
  message: string | null;
  onOpenPaywall: () => void;
};

export function PreviewEditorPanel({
  panelOpen,
  setPanelOpen,
  activePanel,
  setActivePanel,
  busy,
  isExtracting,
  onPickImage,
  onPickVideo,
  onClearBackground,
  onGenerateGradient,
  onAddImageOverlay,
  isSquareFormat,
  layerEntries,
  routeMode,
  visibleLayers,
  selectedLayer,
  setSelectedLayer,
  onToggleLayer,
  onReorderLayers,
  onSetLayerBehindSubject,
  onRemoveLayer,
  template,
  onSelectTemplate,
  selectedFontId,
  onSelectFont,
  effectiveVisible,
  supportsFullStatsPreview,
  onToggleField,
  headerVisible,
  onToggleHeaderField,
  distanceUnit,
  onSetDistanceUnit,
  isPremium,
  message,
  onOpenPaywall,
}: Props) {
  const mainTabs = [
    { id: 'background', label: 'Background', icon: 'image-area-close' },
    { id: 'content', label: 'Content', icon: 'layers-outline' },
    { id: 'style', label: 'Style', icon: 'palette-outline' },
    { id: 'data', label: 'Data', icon: 'chart-box-outline' },
  ] as {
    id: PreviewPanelTab;
    label: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
  }[];
  const [orderedLayerEntries, setOrderedLayerEntries] = useState(layerEntries);
  const [draggingLayerId, setDraggingLayerId] = useState<LayerId | null>(null);

  useEffect(() => {
    setOrderedLayerEntries(layerEntries);
  }, [layerEntries]);

  function onPressTab(tabId: PreviewPanelTab) {
    if (panelOpen && activePanel === tabId) {
      setPanelOpen(false);
      return;
    }
    if (!panelOpen) {
      setPanelOpen(true);
    }
    setActivePanel(tabId);
  }

  return (
    <View style={styles.panelShell}>
      {panelOpen ? (
        <View style={styles.panelBody}>
          {activePanel === 'background' ? (
            <ScrollView
              style={styles.panelScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.controls}>
                <Text style={styles.sectionTitle}>Background</Text>
                <View style={styles.mediaPickRow}>
                  <View style={styles.mediaPickCell}>
                    <PrimaryButton
                      label={isExtracting ? 'Processing image...' : 'Image'}
                      icon="image-outline"
                      onPress={onPickImage}
                      variant="secondary"
                      disabled={busy || isExtracting}
                    />
                  </View>
                  <View style={styles.mediaPickCell}>
                    <PrimaryButton
                      label="Video"
                      icon="video-outline"
                      onPress={onPickVideo}
                      variant="secondary"
                      disabled={busy || isSquareFormat}
                    />
                  </View>
                  <View style={styles.mediaPickCell}>
                    <PrimaryButton
                      label="Reset"
                      icon="dots-square"
                      onPress={onClearBackground}
                      variant="secondary"
                      disabled={busy}
                    />
                  </View>
                </View>
                <View style={styles.mediaPickRow}>
                  <View style={styles.mediaPickCell}>
                    <PrimaryButton
                      label="Gradient"
                      icon="gradient-horizontal"
                      onPress={onGenerateGradient}
                      variant="secondary"
                      disabled={busy}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
          ) : null}

          {activePanel === 'content' ? (
            <View style={styles.panelScroll}>
              <DraggableFlatList
                data={orderedLayerEntries}
                keyExtractor={(item) => item.id}
                containerStyle={styles.blocksList}
                contentContainerStyle={styles.blocksListContent}
                showsVerticalScrollIndicator={false}
                activationDistance={16}
                autoscrollThreshold={30}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                onDragBegin={(index) =>
                  setDraggingLayerId(orderedLayerEntries[index]?.id ?? null)
                }
                onDragEnd={({ data }) => {
                  setDraggingLayerId(null);
                  setOrderedLayerEntries(data);
                  onReorderLayers(data);
                }}
                ListHeaderComponent={
                  <View style={styles.blocksHeader}>
                    <Text style={styles.sectionTitle}>Blocks</Text>
                    <Text style={styles.orderHint}>
                      Front {'>'} Back (drag)
                    </Text>
                    <Text style={styles.orderLegend}>
                      Eye = visible • Front/Behind = subject depth • Handle =
                      drag
                    </Text>
                  </View>
                }
                ItemSeparatorComponent={() => (
                  <View style={styles.layerRowSpacer} />
                )}
                ListFooterComponent={
                  <View style={styles.blocksFooter}>
                    <Text style={styles.sectionTitle}>Overlay</Text>
                    <PrimaryButton
                      label="Add image overlay"
                      onPress={onAddImageOverlay}
                      variant="secondary"
                      disabled={busy}
                    />
                  </View>
                }
                renderItem={({ item, drag, isActive, getIndex }) => {
                  const { id, label, isBehind } = item;
                  const index = (getIndex?.() ?? 0) + 1;
                  const isRouteLayer = id === 'route';
                  const switchValue = isRouteLayer
                    ? routeMode !== 'off' && Boolean(visibleLayers.route)
                    : Boolean(visibleLayers[id]);
                  const isImageLayer = id.startsWith('image:');
                  return (
                    <View
                      style={[
                        styles.layerRowCard,
                        selectedLayer === id && styles.layerRowCardSelected,
                        (isActive || draggingLayerId === id) &&
                          styles.layerRowCardDragging,
                      ]}
                    >
                      <Pressable
                        onPress={() => onToggleLayer(id, !switchValue)}
                        style={styles.layerVisibilityBtn}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={
                          switchValue ? 'Hide layer' : 'Show layer'
                        }
                      >
                        <MaterialCommunityIcons
                          name={switchValue ? 'eye' : 'eye-off'}
                          size={20}
                          color={switchValue ? '#E5E7EB' : '#7B8495'}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => setSelectedLayer(id)}
                        style={styles.layerMainBtn}
                      >
                        <View style={styles.layerMainTextWrap}>
                          <Text style={styles.controlLabel}>{label}</Text>
                          <Text style={styles.orderPositionText}>#{index}</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.behindToggleBtn,
                          isBehind && styles.behindToggleBtnActive,
                        ]}
                        onPress={() => onSetLayerBehindSubject(id, !isBehind)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isBehind
                            ? 'Set layer in front of subject'
                            : 'Send layer behind subject'
                        }
                      >
                        <Text
                          style={[
                            styles.behindToggleText,
                            isBehind && styles.behindToggleTextActive,
                          ]}
                        >
                          {isBehind ? 'Behind' : 'Front'}
                        </Text>
                      </Pressable>
                      {isImageLayer ? (
                        <Pressable
                          style={styles.layerDelete}
                          onPress={() => onRemoveLayer(id)}
                          hitSlop={10}
                        >
                          <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={16}
                            color="#DC2626"
                          />
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={styles.layerHandleBtn}
                        onLongPress={drag}
                        delayLongPress={140}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons
                          name="drag-horizontal-variant"
                          size={20}
                          color="#94A3B8"
                        />
                      </Pressable>
                    </View>
                  );
                }}
              />
            </View>
          ) : null}

          {activePanel === 'style' ? (
            <ScrollView
              style={styles.panelScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.controls}>
                <Text style={styles.sectionTitle}>Templates</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {TEMPLATES.map((item) => {
                    const isLocked = item.premium && !isPremium;
                    const selected = item.id === template.id;
                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.templateCard,
                          selected && styles.templateCardSelected,
                        ]}
                        onPress={() => onSelectTemplate(item)}
                        accessibilityLabel={item.name}
                      >
                        <TemplateLayoutPreview template={item} />
                        {isLocked ? (
                          <Text style={styles.chipSub}>Premium</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={styles.sectionTitle}>Font</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {FONT_PRESETS.map((item) => {
                    const selected = item.id === selectedFontId;
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => onSelectFont(item.id)}
                      >
                        <Text
                          style={[styles.chipText, { fontFamily: item.family }]}
                        >
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>
          ) : null}

          {activePanel === 'data' ? (
            <ScrollView
              style={styles.panelScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.controls}>
                <Text style={styles.sectionTitle}>Stats Infos</Text>
                <View style={styles.statsPillsWrap}>
                  {(
                    [
                      ['time', 'Time'],
                      ['pace', 'Pace'],
                      ['elev', 'Elev'],
                    ] as [FieldId, string][]
                  ).map(([id, label]) => {
                    const selected = effectiveVisible[id];
                    const disabled = !supportsFullStatsPreview;
                    return (
                      <Pressable
                        key={id}
                        disabled={disabled}
                        onPress={() => onToggleField(id, !selected)}
                        style={[
                          styles.statsPill,
                          selected && styles.statsPillSelected,
                          disabled && styles.statsPillDisabled,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color={selected ? '#111500' : '#9CA3AF'}
                        />
                        <Text
                          style={[
                            styles.statsPillText,
                            selected && styles.statsPillTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

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
                        style={[
                          styles.statsPill,
                          selected && styles.statsPillSelected,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color={selected ? '#111500' : '#9CA3AF'}
                        />
                        <Text
                          style={[
                            styles.statsPillText,
                            selected && styles.statsPillTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.sectionTitle}>Unit</Text>
                <View style={styles.mediaPickRow}>
                  {(
                    [
                      { id: 'km', label: 'Kilometers' },
                      { id: 'mi', label: 'Miles' },
                    ] as { id: DistanceUnit; label: string }[]
                  ).map((item) => {
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
              </View>
            </ScrollView>
          ) : null}

          {activePanel === 'help' ? (
            <View style={styles.controls}>
              <Text style={styles.note}>
                Pinch/rotate/drag blocks. Center and rotation guides appear
                during move. Tap stats to switch template. Tap route to switch
                map/trace.
              </Text>
              {message ? <Text style={styles.note}>{message}</Text> : null}
              {!supportsFullStatsPreview ? (
                <Text style={styles.note}>
                  For this activity type, preview shows Time only.
                </Text>
              ) : null}
              {!isPremium ? (
                <PrimaryButton
                  label="Unlock Premium Templates"
                  onPress={onOpenPaywall}
                  variant="secondary"
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.panelTabs}>
        <View style={styles.mainTabsRow}>
          {mainTabs.map((tab) => {
            const selected = activePanel === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => onPressTab(tab.id)}
                style={[styles.panelTab, selected && styles.panelTabSelected]}
              >
                <View style={styles.panelTabContent}>
                  <MaterialCommunityIcons
                    name={tab.icon}
                    size={14}
                    color={selected ? '#111827' : '#E5E7EB'}
                  />
                  <Text
                    style={[
                      styles.panelTabText,
                      selected && styles.panelTabTextSelected,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => onPressTab('help')}
          style={[
            styles.helpFab,
            activePanel === 'help'
              ? styles.helpFabSelected
              : styles.helpFabIdle,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Help"
        >
          <MaterialCommunityIcons
            name="help-circle-outline"
            size={20}
            color={activePanel === 'help' ? '#111827' : '#E5E7EB'}
          />
        </Pressable>
      </View>
    </View>
  );
}

function TemplateLayoutPreview({ template }: { template: StatsTemplate }) {
  const rawWidth = template.width;
  const rawHeight = getTemplatePreviewHeight(template.layout);
  const scale = Math.min(92 / rawWidth, 52 / rawHeight);

  return (
    <View style={styles.previewFrame}>
      <View style={styles.previewSurface}>
        <View
          style={[
            styles.previewScaledWrap,
            {
              width: rawWidth,
              height: rawHeight,
              transform: [{ scale }],
            },
          ]}
        >
          <View
            style={[
              styles.previewStatsCard,
              {
                width: rawWidth,
                backgroundColor: template.backgroundColor,
                borderColor: template.borderColor,
                borderWidth: template.borderWidth,
                borderRadius: template.radius,
              },
            ]}
          >
            <StatsLayerContent
              template={template}
              fontPreset={FONT_PRESETS[0]}
              visible={{
                distance: true,
                time: true,
                pace: true,
                elev: true,
              }}
              distanceText="10.3 km"
              durationText="50:20"
              paceText="4:52 /km"
              elevText="42 m"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function getTemplatePreviewHeight(layout: StatsTemplate['layout']) {
  switch (layout) {
    case 'row':
      return 190;
    case 'stack':
      return 244;
    case 'inline':
      return 132;
    case 'right':
      return 146;
    case 'grid':
    default:
      return 186;
  }
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: '#F3F4F6',
    fontWeight: '400',
    fontSize: 14,
  },
  chipRow: {
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: '#232833',
    borderColor: '#2F3644',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 116,
  },
  chipSelected: {
    borderColor: '#D9F04A',
    borderWidth: 2,
  },
  chipText: {
    color: '#F3F4F6',
    fontWeight: '400',
  },
  chipSub: {
    color: '#D9F04A',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    alignSelf: 'center',
  },
  templateCard: {
    width: 108,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2F3644',
    backgroundColor: '#232833',
    padding: 0,
    overflow: 'hidden',
  },
  templateCardSelected: {
    borderColor: '#D9F04A',
    borderWidth: 2,
  },
  previewFrame: {
    height: 54,
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    padding: 1,
    overflow: 'hidden',
  },
  previewSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewScaledWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewStatsCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  controls: {
    gap: spacing.sm,
  },
  panelShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    backgroundColor: 'rgba(23, 26, 32, 0.82)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(39, 43, 53, 0.9)',
    paddingBottom: spacing.sm,
  },
  panelBody: {
    minHeight: 188,
    maxHeight: 230,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  panelScroll: {
    flex: 1,
  },
  panelTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 10,
  },
  mainTabsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  panelTab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#242935',
  },
  panelTabContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  panelTabSelected: {
    backgroundColor: '#D9F04A',
  },
  panelTabText: {
    color: '#E5E7EB',
    fontWeight: '400',
    fontSize: 12,
  },
  panelTabTextSelected: {
    color: '#111827',
    fontWeight: '400',
  },
  helpFab: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
  },
  helpFabIdle: {
    backgroundColor: '#242935',
    borderWidth: 1,
    borderColor: '#2F3644',
  },
  helpFabSelected: {
    backgroundColor: '#D9F04A',
  },
  mediaPickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  mediaPickCell: {
    flex: 1,
  },
  orderHint: {
    color: '#A0A8B8',
    fontSize: 11,
    marginTop: -2,
  },
  orderLegend: {
    color: '#A0A8B8',
    fontSize: 10,
    marginTop: -1,
    marginBottom: 2,
  },
  blocksList: {
    flex: 1,
  },
  blocksListContent: {
    paddingBottom: 4,
  },
  blocksHeader: {
    gap: 4,
    marginBottom: 6,
  },
  blocksFooter: {
    gap: 8,
    marginTop: 10,
  },
  layerRowSpacer: {
    height: 6,
  },
  layerRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2F3644',
    backgroundColor: '#202632',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  layerRowCardSelected: {
    borderColor: '#D9F04A',
  },
  layerRowCardDragging: {
    opacity: 0.75,
  },
  layerVisibilityBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2F3644',
    backgroundColor: '#242935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  layerMainTextWrap: {
    flex: 1,
  },
  orderPositionText: {
    color: '#A0A8B8',
    fontSize: 11,
  },
  behindToggleBtn: {
    minWidth: 62,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2F3644',
    backgroundColor: '#242935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  behindToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  behindToggleText: {
    color: '#DDE6F5',
    fontSize: 12,
    fontWeight: '400',
  },
  behindToggleTextActive: {
    color: '#111500',
  },
  layerHandleBtn: {
    width: 46,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F3644',
    backgroundColor: '#242935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerDelete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 8,
    backgroundColor: '#2A1F24',
  },
  statsPillsWrap: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2F3644',
    borderRadius: 12,
    backgroundColor: '#202632',
    padding: 8,
  },
  statsPill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A4356',
    backgroundColor: '#2A3140',
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statsPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statsPillDisabled: {
    opacity: 0.45,
  },
  statsPillText: {
    color: '#D1D5DB',
    fontWeight: '400',
    fontSize: 13,
  },
  statsPillTextSelected: {
    color: '#111500',
  },
  controlLabel: {
    color: '#F3F4F6',
    fontWeight: '400',
  },
  note: {
    color: '#A0A8B8',
  },
  unitChip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
});
