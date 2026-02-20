import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatsLayerContent } from '@/components/StatsLayerContent';
import { layout, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { DistanceUnit, ElevationUnit } from '@/lib/format';
import { FONT_PRESETS, TEMPLATES } from '@/lib/previewConfig';
import { useThemeStore, type AppThemeMode } from '@/store/themeStore';
import type {
  BackgroundGradient,
  ChartFillStyle,
  ChartOrientation,
  FieldId,
  LayerId,
  RouteMode,
  StatsLayout,
  StatsLayoutKind,
} from '@/types/preview';

export type PreviewPanelTab =
  | 'background'
  | 'content'
  | 'design'
  | 'effects'
  | 'help';
type HeaderFieldId = 'title' | 'date' | 'location';
type VisualEffectPreset = {
  id: string;
  label: string;
  description?: string;
  backgroundOverlayColor: string;
  backgroundOverlayOpacity: number;
  subjectOverlayColor: string;
  subjectOverlayOpacity: number;
};
type StyleLayerId =
  | 'meta'
  | 'stats'
  | 'route'
  | 'primary'
  | 'chartPace'
  | 'chartHr';

type Props = {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  activePanel: PreviewPanelTab;
  setActivePanel: (panel: PreviewPanelTab) => void;
  busy: boolean;
  isExtracting: boolean;
  onPickImage: () => void;
  onPickVideo: () => void;
  activityPhotoUri?: string | null;
  onUseActivityPhotoBackground: () => void;
  onClearBackground: () => void;
  onGenerateGradient: () => void;
  currentBackgroundGradient?: BackgroundGradient | null;
  gradientPresets: BackgroundGradient[];
  onApplyGradientPreset: (gradient: BackgroundGradient) => void;
  onAddImageOverlay: () => void;
  onCreateSticker: () => void;
  isSquareFormat: boolean;
  layerEntries: { id: LayerId; label: string; isBehind: boolean }[];
  routeMode: RouteMode;
  visibleLayers: Partial<Record<LayerId, boolean>>;
  selectedLayer: LayerId | null;
  setSelectedLayer: (layer: LayerId) => void;
  onToggleLayer: (layer: LayerId, value: boolean) => void;
  onReorderLayers: (
    entries: { id: LayerId; label: string; isBehind: boolean }[],
  ) => void;
  onSetLayerBehindSubject: (layer: LayerId, value: boolean) => void;
  onRemoveLayer: (layer: LayerId) => void;
  template: StatsLayout;
  onSelectLayout: (t: StatsLayout) => void;
  templateOptions?: { id: string; name: string; premium?: boolean }[];
  selectedTemplateId?: string;
  onSelectTemplate?: (templateId: string) => void;
  selectedFontId: string;
  onSelectFont: (fontId: string) => void;
  effectiveVisible: Record<FieldId, boolean>;
  supportsFullStatsPreview: boolean;
  statsFieldAvailability: Record<FieldId, boolean>;
  supportsPrimaryLayer: boolean;
  primaryField: FieldId;
  onSetPrimaryField: (field: FieldId) => void;
  maxOptionalMetrics: number;
  selectedOptionalMetrics: number;
  onToggleField: (field: FieldId, value: boolean) => void;
  headerVisible: Record<HeaderFieldId, boolean>;
  onToggleHeaderField: (field: HeaderFieldId, value: boolean) => void;
  distanceUnit: DistanceUnit;
  onSetDistanceUnit: (unit: DistanceUnit) => void;
  elevationUnit: ElevationUnit;
  onSetElevationUnit: (unit: ElevationUnit) => void;
  layerStyleMap: Record<StyleLayerId, { color: string; opacity: number }>;
  onSetLayerStyleColor: (
    layerId: StyleLayerId,
    color: string,
  ) => void;
  onSetLayerStyleOpacity: (
    layerId: StyleLayerId,
    opacity: number,
  ) => void;
  sunsetPrimaryGradient: [string, string, string];
  sunsetPrimaryGradientPresets: [string, string, string][];
  onSetSunsetPrimaryGradient: (gradient: [string, string, string]) => void;
  visualEffectPresets: VisualEffectPreset[];
  selectedFilterEffectId: string;
  selectedBlurEffectId: string;
  onSetFilterEffect: (effectId: string) => void;
  onSetBlurEffect: (effectId: string) => void;
  hasSubjectFree: boolean;
  effectsEnabled: boolean;
  isPremium: boolean;
  message: string | null;
  appCacheUsageLabel?: string;
  onClearAppCache?: () => void;
  onOpenPaywall: () => void;
  onQuickExport: () => void;
  quickExportBusy?: boolean;
  helpPopoverOpen?: boolean;
  onCloseHelpPopover?: () => void;
  quickTemplateMode?: boolean;
  allowVideoBackground?: boolean;
  showBackgroundTab?: boolean;
  hasLapPaceLayer: boolean;
  hasHeartRateLayer: boolean;
  showChartAxes: boolean;
  onSetShowChartAxes: (value: boolean) => void;
  showChartGrid: boolean;
  onSetShowChartGrid: (value: boolean) => void;
  paceChartOrientation: ChartOrientation;
  onSetPaceChartOrientation: (value: ChartOrientation) => void;
  paceChartFill: ChartFillStyle;
  onSetPaceChartFill: (value: ChartFillStyle) => void;
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
  activityPhotoUri,
  onUseActivityPhotoBackground,
  onClearBackground,
  onGenerateGradient,
  currentBackgroundGradient,
  gradientPresets,
  onApplyGradientPreset,
  onAddImageOverlay,
  onCreateSticker,
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
  onSelectLayout,
  templateOptions = [],
  selectedTemplateId,
  onSelectTemplate,
  selectedFontId,
  onSelectFont,
  effectiveVisible,
  supportsFullStatsPreview,
  statsFieldAvailability,
  supportsPrimaryLayer,
  primaryField,
  onSetPrimaryField,
  maxOptionalMetrics,
  selectedOptionalMetrics,
  onToggleField,
  headerVisible,
  onToggleHeaderField,
  distanceUnit,
  onSetDistanceUnit,
  elevationUnit,
  onSetElevationUnit,
  layerStyleMap,
  onSetLayerStyleColor,
  onSetLayerStyleOpacity,
  sunsetPrimaryGradient,
  sunsetPrimaryGradientPresets,
  onSetSunsetPrimaryGradient,
  visualEffectPresets,
  selectedFilterEffectId,
  selectedBlurEffectId,
  onSetFilterEffect,
  onSetBlurEffect,
  hasSubjectFree,
  effectsEnabled,
  isPremium,
  message,
  appCacheUsageLabel,
  onClearAppCache,
  onOpenPaywall,
  onQuickExport,
  quickExportBusy = false,
  helpPopoverOpen = false,
  onCloseHelpPopover,
  quickTemplateMode = false,
  allowVideoBackground = true,
  showBackgroundTab = true,
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
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const [selectedStyleLayer, setSelectedStyleLayer] =
    useState<StyleLayerId>('meta');
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const styleLayerButtons: { id: StyleLayerId; label: string }[] = [
    { id: 'meta', label: 'Header' },
    { id: 'stats', label: 'Stats' },
    { id: 'route', label: 'Route' },
    ...(hasLapPaceLayer ? [{ id: 'chartPace' as const, label: 'Pace Chart' }] : []),
    ...(hasHeartRateLayer ? [{ id: 'chartHr' as const, label: 'HR Chart' }] : []),
    ...(supportsPrimaryLayer && visibleLayers.primary
      ? [{ id: 'primary' as const, label: 'Primary' }]
      : []),
  ];
  const colorPresets = [
    '#FFFFFF',
    '#F8FAFC',
    '#E2E8F0',
    '#94A3B8',
    '#64748B',
    '#334155',
    '#111827',
    '#000000',
    '#FEE2E2',
    '#FCA5A5',
    '#EF4444',
    '#B91C1C',
    '#7F1D1D',
    '#FFEDD5',
    '#FDBA74',
    '#F97316',
    '#C2410C',
    '#9A3412',
    '#FEF3C7',
    '#FCD34D',
    '#EAB308',
    '#CA8A04',
    '#854D0E',
    '#ECFCCB',
    '#86EFAC',
    '#22C55E',
    '#15803D',
    '#14532D',
    '#CCFBF1',
    '#5EEAD4',
    '#14B8A6',
    '#0F766E',
    '#134E4A',
    '#DBEAFE',
    '#93C5FD',
    '#60A5FA',
    '#2563EB',
    '#1E3A8A',
    '#E0E7FF',
    '#A5B4FC',
    '#6366F1',
    '#4F46E5',
    '#312E81',
    '#F3E8FF',
    '#D8B4FE',
    '#A855F7',
    '#7E22CE',
    '#581C87',
    '#FCE7F3',
    '#F9A8D4',
    '#EC4899',
    '#BE185D',
    colors.primary,
  ];
  const selectedLayerStyle = layerStyleMap[selectedStyleLayer];
  const isSunsetPrimaryStyleSelected =
    selectedStyleLayer === 'primary' && template.layout === 'sunset-hero';
  const [opacityTrackWidth, setOpacityTrackWidth] = useState(0);
  const [renderPanelBody, setRenderPanelBody] = useState(panelOpen);
  const panelBodyAnim = useRef(new Animated.Value(panelOpen ? 1 : 0)).current;
  const popoverAnim = useRef(new Animated.Value(0)).current;
  const helpPopoverAnim = useRef(new Animated.Value(0)).current;
  const gridHues = [200, 220, 250, 280, 330, 8, 22, 38, 48, 62, 75, 95];
  const grayscaleRow = gridHues.map((_, index) => {
    const value = 100 - (index / (gridHues.length - 1)) * 100;
    return hsvToHex(0, 0, value);
  });
  const gridToneRows = [
    { s: 100, v: 26 },
    { s: 98, v: 38 },
    { s: 96, v: 52 },
    { s: 92, v: 64 },
    { s: 90, v: 78 },
    { s: 72, v: 92 },
    { s: 52, v: 90 },
    { s: 36, v: 88 },
    { s: 18, v: 86 },
  ];
  const colorGrid = [
    grayscaleRow,
    ...gridToneRows.map((tone) =>
      gridHues.map((hue) => hsvToHex(hue, tone.s, tone.v)),
    ),
  ];
  const blurEffectIds = [
    'background-blur',
    'background-radial-blur',
    'background-motion-blur',
  ];
  const noBlurEffect: VisualEffectPreset = {
    id: 'none',
    label: 'No Blur',
    description: 'Disable blur',
    backgroundOverlayColor: '#000000',
    backgroundOverlayOpacity: 0,
    subjectOverlayColor: '#000000',
    subjectOverlayOpacity: 0,
  };
  const filterEffects = visualEffectPresets.filter(
    (effect) => !blurEffectIds.includes(effect.id),
  );
  const blurEffects = [
    noBlurEffect,
    ...visualEffectPresets.filter((effect) => blurEffectIds.includes(effect.id)),
  ];

  function handleOpacityTrackLayout(event: LayoutChangeEvent) {
    setOpacityTrackWidth(event.nativeEvent.layout.width);
  }

  function applyOpacityAtPosition(x: number) {
    if (!opacityTrackWidth) return;
    const clampedX = clamp(x, 0, opacityTrackWidth);
    onSetLayerStyleOpacity(
      selectedStyleLayer,
      Number((clampedX / opacityTrackWidth).toFixed(2)),
    );
  }

  const opacityResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      applyOpacityAtPosition(event.nativeEvent.locationX);
    },
    onPanResponderMove: (event) => {
      applyOpacityAtPosition(event.nativeEvent.locationX);
    },
  });
  const opacityHandleLeft = opacityTrackWidth
    ? (selectedLayerStyle?.opacity ?? 1) * opacityTrackWidth
    : 0;

  useEffect(() => {
    if (
      selectedStyleLayer === 'primary' &&
      !(supportsPrimaryLayer && visibleLayers.primary)
    ) {
      setSelectedStyleLayer('meta');
    }
    if (selectedStyleLayer === 'chartPace' && !hasLapPaceLayer) {
      setSelectedStyleLayer('meta');
    }
    if (selectedStyleLayer === 'chartHr' && !hasHeartRateLayer) {
      setSelectedStyleLayer('meta');
    }
  }, [
    hasHeartRateLayer,
    hasLapPaceLayer,
    selectedStyleLayer,
    supportsPrimaryLayer,
    visibleLayers.primary,
  ]);

  useEffect(() => {
    panelBodyAnim.stopAnimation();
    if (panelOpen) {
      setRenderPanelBody(true);
      Animated.timing(panelBodyAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(panelBodyAnim, {
      toValue: 0,
      duration: 190,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setRenderPanelBody(false);
      }
    });
  }, [panelBodyAnim, panelOpen]);

  useEffect(() => {
    if (!panelOpen || activePanel !== 'design') {
      setStylePickerOpen(false);
    }
  }, [activePanel, panelOpen]);

  useEffect(() => {
    const show = panelOpen && activePanel === 'design' && stylePickerOpen;
    Animated.spring(popoverAnim, {
      toValue: show ? 1 : 0,
      tension: 70,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [activePanel, panelOpen, popoverAnim, stylePickerOpen]);

  useEffect(() => {
    Animated.spring(helpPopoverAnim, {
      toValue: helpPopoverOpen ? 1 : 0,
      tension: 70,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [helpPopoverAnim, helpPopoverOpen]);

  const defaultTabs = [
    { id: 'background', label: 'Background', icon: 'image-area-close' },
    { id: 'content', label: 'Content', icon: 'layers-outline' },
    { id: 'design', label: 'Design', icon: 'palette-outline' },
    {
      id: 'effects',
      label: 'Effects',
      icon: 'image-filter-center-focus',
      disabled: !effectsEnabled,
    },
  ] as const;
  const quickTemplateTabs = [
    { id: 'background', label: 'Background', icon: 'image-area-close' },
    { id: 'design', label: 'Templates', icon: 'view-grid-outline' },
  ] as const;
  const tabsSource = quickTemplateMode ? quickTemplateTabs : defaultTabs;
  const mainTabs: {
    id: PreviewPanelTab;
    label: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    disabled?: boolean;
  }[] = tabsSource.map((tab) =>
    !showBackgroundTab && tab.id === 'background'
      ? { ...tab, disabled: true }
      : tab,
  );
  const [orderedLayerEntries, setOrderedLayerEntries] = useState(layerEntries);
  const [draggingLayerId, setDraggingLayerId] = useState<LayerId | null>(null);

  useEffect(() => {
    setOrderedLayerEntries(layerEntries);
  }, [layerEntries]);

  function onPressTab(tabId: PreviewPanelTab, disabled?: boolean) {
    if (disabled) return;
    onCloseHelpPopover?.();
    if (panelOpen && activePanel === tabId) {
      setPanelOpen(false);
      return;
    }
    if (!panelOpen) {
      setPanelOpen(true);
    }
    setActivePanel(tabId);
  }

  function renderEffectsRow(
    effects: VisualEffectPreset[],
    selectedId: string,
    onSelect: (effectId: string) => void,
  ) {
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

  return (
    <View style={styles.panelShell}>
      {renderPanelBody ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.panelBackdropLayer,
            {
              opacity: panelBodyAnim,
              transform: [
                {
                  translateY: panelBodyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[colors.glassSurfaceStart, colors.glassSurfaceEnd]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.panelGlassBg}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              colors.glassHighlight,
              'rgba(255,255,255,0.28)',
              'rgba(255,255,255,0.05)',
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.panelGlassSheen}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(8,11,18,0.06)',
              'rgba(8,11,18,0.18)',
              'rgba(8,11,18,0.28)',
            ]}
            start={{ x: 0.5, y: 0.3 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.panelGlassDepth}
          />
          <View pointerEvents="none" style={styles.panelGlassHighlight} />
        </Animated.View>
      ) : null}
      {renderPanelBody ? (
        <Animated.View
          pointerEvents={panelOpen ? 'auto' : 'none'}
          style={[
            styles.panelBody,
            {
              opacity: panelBodyAnim,
              transform: [
                {
                  translateY: panelBodyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
                {
                  scale: panelBodyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {activePanel === 'background' ? (
            <ScrollView
              style={styles.panelScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.controls}>
                <Text style={styles.sectionTitle}>Background</Text>
                <View style={styles.activityPhotoRow}>
                  {activityPhotoUri ? (
                    <Pressable
                      onPress={onUseActivityPhotoBackground}
                      style={({ pressed }) => [
                        styles.activityPhotoCard,
                        pressed ? styles.activityPhotoCardPressed : null,
                      ]}
                      disabled={busy}
                    >
                      <Image
                        source={{ uri: activityPhotoUri }}
                        style={styles.activityPhotoThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.activityPhotoCopy}>
                        <Text style={styles.activityPhotoTitle}>
                          Activity photo
                        </Text>
                        <Text style={styles.activityPhotoSubtitle}>
                          Use as background
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name="image-sync-outline"
                        size={18}
                        color={colors.text}
                      />
                    </Pressable>
                  ) : null}
                  <Pressable
                    disabled
                    style={[
                      styles.premiumBtn,
                      !activityPhotoUri && styles.premiumBtnFullWidth,
                      styles.premiumBtnDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Premium"
                  >
                    <MaterialCommunityIcons
                      name="crown-outline"
                      size={14}
                      color={colors.textMuted}
                      style={styles.premiumBtnIcon}
                    />
                    <Text style={styles.premiumBtnText}>Premium</Text>
                  </Pressable>
                </View>
                <View style={styles.backgroundActionsRow}>
                  <View style={styles.backgroundActionCell}>
                    <PrimaryButton
                      label={isExtracting ? 'Extract' : 'Image'}
                      icon="image-outline"
                      onPress={onPickImage}
                      variant="secondary"
                      colorScheme="panel"
                      iconPosition="top"
                      compact
                      disabled={busy || isExtracting}
                    />
                  </View>
                  {allowVideoBackground ? (
                    <View style={styles.backgroundActionCell}>
                      <PrimaryButton
                        label="Video"
                        icon="video-outline"
                        onPress={onPickVideo}
                        variant="secondary"
                        colorScheme="panel"
                        iconPosition="top"
                        compact
                        disabled={busy || isSquareFormat}
                      />
                    </View>
                  ) : null}
                  {!quickTemplateMode ? (
                    <View style={styles.backgroundActionCell}>
                      <PrimaryButton
                        label="Gradient"
                        icon="gradient-horizontal"
                        onPress={onGenerateGradient}
                        variant="secondary"
                        colorScheme="panel"
                        iconPosition="top"
                        compact
                        disabled={busy}
                      />
                    </View>
                  ) : null}
                  <View style={styles.backgroundActionCell}>
                    <PrimaryButton
                      label="Transparent"
                      icon="dots-square"
                      onPress={onClearBackground}
                      variant="secondary"
                      colorScheme="panel"
                      iconPosition="top"
                      compact
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
                    <View style={styles.overlayActionsRow}>
                      <View style={styles.overlayActionCell}>
                        <PrimaryButton
                          label="Add image"
                          icon="image-plus"
                          onPress={onAddImageOverlay}
                          variant="secondary"
                          colorScheme="panel"
                          iconPosition="top"
                          compact
                          disabled={busy}
                        />
                      </View>
                      <View style={styles.overlayActionCell}>
                        <PrimaryButton
                          label="Create sticker"
                          icon="content-cut"
                          onPress={onCreateSticker}
                          variant="secondary"
                          colorScheme="panel"
                          iconPosition="top"
                          compact
                          disabled={busy}
                        />
                      </View>
                    </View>
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
                          color={switchValue ? colors.text : colors.textSubtle}
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
                            color={colors.danger}
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
                          color={colors.textSubtle}
                        />
                      </Pressable>
                    </View>
                  );
                }}
              />
            </View>
          ) : null}

          {activePanel === 'design' ? (
            <ScrollView
              style={styles.panelScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.controls}>
                <Text style={styles.sectionTitle}>
                  {quickTemplateMode ? 'Templates' : 'Layouts'}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
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
                            <View
                              style={[
                                styles.templateCard,
                                selected && styles.templateCardSelected,
                              ]}
                            >
                              <View style={styles.templateModeIconWrap}>
                                <MaterialCommunityIcons
                                  name="view-grid-outline"
                                  size={20}
                                  color={colors.text}
                                />
                              </View>
                              {isLocked ? (
                                <Text style={styles.templatePremiumBadge}>
                                  Premium
                                </Text>
                              ) : null}
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
                            <View
                              style={[
                                styles.templateCard,
                                selected && styles.templateCardSelected,
                              ]}
                            >
                              <LayoutLayoutPreview template={item} styles={styles} />
                              {isLocked ? (
                                <Text style={styles.templatePremiumBadge}>
                                  Premium
                                </Text>
                              ) : null}
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
                    const disabled =
                      !statsFieldAvailability[id] || !supportsFullStatsPreview;
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
                            style={[
                              styles.statsPillText,
                              selected && styles.statsPillTextSelected,
                            ]}
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

                    {(hasLapPaceLayer || hasHeartRateLayer) ? (
                      <>
                        <Text style={styles.sectionTitle}>Chart Axes</Text>
                        <View style={styles.mediaPickRow}>
                          <Pressable
                            style={[
                              styles.chip,
                              showChartAxes && styles.chipSelected,
                              styles.unitChip,
                            ]}
                            onPress={() => onSetShowChartAxes(true)}
                          >
                            <Text style={styles.chipText}>Show X/Y</Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.chip,
                              !showChartAxes && styles.chipSelected,
                              styles.unitChip,
                            ]}
                            onPress={() => onSetShowChartAxes(false)}
                          >
                            <Text style={styles.chipText}>Hide X/Y</Text>
                          </Pressable>
                        </View>
                        <Text style={styles.sectionTitle}>Chart Grid</Text>
                        <View style={styles.mediaPickRow}>
                          <Pressable
                            style={[
                              styles.chip,
                              showChartGrid && styles.chipSelected,
                              styles.unitChip,
                            ]}
                            onPress={() => onSetShowChartGrid(true)}
                          >
                            <Text style={styles.chipText}>Show Grid</Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.chip,
                              !showChartGrid && styles.chipSelected,
                              styles.unitChip,
                            ]}
                            onPress={() => onSetShowChartGrid(false)}
                          >
                            <Text style={styles.chipText}>Hide Grid</Text>
                          </Pressable>
                        </View>
                        {hasLapPaceLayer ? (
                          <>
                            <Text style={styles.sectionTitle}>
                              Pace Chart Direction
                            </Text>
                            <View style={styles.mediaPickRow}>
                              <Pressable
                                style={[
                                  styles.chip,
                                  paceChartOrientation === 'vertical' &&
                                    styles.chipSelected,
                                  styles.unitChip,
                                ]}
                                onPress={() =>
                                  onSetPaceChartOrientation('vertical')
                                }
                              >
                                <Text style={styles.chipText}>Vertical</Text>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.chip,
                                  paceChartOrientation === 'horizontal' &&
                                    styles.chipSelected,
                                  styles.unitChip,
                                ]}
                                onPress={() =>
                                  onSetPaceChartOrientation('horizontal')
                                }
                              >
                                <Text style={styles.chipText}>Horizontal</Text>
                              </Pressable>
                            </View>
                            <Text style={styles.sectionTitle}>
                              Pace Chart Fill
                            </Text>
                            <View style={styles.mediaPickRow}>
                              <Pressable
                                style={[
                                  styles.chip,
                                  paceChartFill === 'gradient' &&
                                    styles.chipSelected,
                                  styles.unitChip,
                                ]}
                                onPress={() => onSetPaceChartFill('gradient')}
                              >
                                <Text style={styles.chipText}>Gradient</Text>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.chip,
                                  paceChartFill === 'plain' &&
                                    styles.chipSelected,
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
                        style={[
                          styles.statsPill,
                          selected && styles.statsPillSelected,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color={selected ? colors.primaryText : colors.textSubtle}
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

                    <Text style={styles.sectionTitle}>Colors</Text>
                    <View style={styles.styleLayerButtonsRow}>
                  {styleLayerButtons.map((item) => {
                    const selected = item.id === selectedStyleLayer;
                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.styleLayerButton,
                          selected && styles.styleLayerButtonSelected,
                        ]}
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
                        <View
                          key={`preview-row-${row}`}
                          style={styles.opacityCheckerRow}
                        >
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
                          backgroundColor:
                            selectedLayerStyle?.color ?? colors.solidWhite,
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
                              isSelected &&
                                styles.sunsetGradientPresetCardSelected,
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
                          selectedLayerStyle?.color === color &&
                            styles.colorSwatchSelected,
                        ]}
                        onPress={() =>
                          onSetLayerStyleColor(selectedStyleLayer, color)
                        }
                      />
                      ))}
                  </ScrollView>
                    </View>

                  </>
                ) : null}
              </View>
            </ScrollView>
          ) : null}

          {activePanel === 'effects' ? (
            <ScrollView
              style={styles.panelScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.controls}>
                <Text style={styles.sectionTitle}>Filters</Text>
                {renderEffectsRow(
                  filterEffects,
                  selectedFilterEffectId,
                  onSetFilterEffect,
                )}
              </View>
              {hasSubjectFree ? (
                <View style={[styles.controls, styles.effectsSectionSpacing]}>
                  <Text style={styles.sectionTitle}>Blur</Text>
                  {renderEffectsRow(
                    blurEffects,
                    selectedBlurEffectId,
                    onSetBlurEffect,
                  )}
                </View>
              ) : null}
            </ScrollView>
          ) : null}

          {activePanel === 'help' ? (
            <ScrollView
              style={styles.panelScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.helpContent}
            >
              <View style={styles.controls}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.themeModeRow}>
                  {(
                    [
                      { id: 'light', label: 'Light' },
                      { id: 'dark', label: 'Dark' },
                    ] as { id: AppThemeMode; label: string }[]
                  ).map((item) => {
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
                <Text style={styles.sectionTitle}>Elevation Unit</Text>
                <View style={styles.mediaPickRow}>
                  {(
                    [
                      { id: 'm', label: 'Meters' },
                      { id: 'ft', label: 'Feet' },
                    ] as { id: ElevationUnit; label: string }[]
                  ).map((item) => {
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
                  Pinch/rotate/drag blocks. Center and rotation guides appear
                  during move. Tap stats to switch template. Tap route to switch
                  map/trace.
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
                    onPress={onOpenPaywall}
                    variant="secondary"
                  />
                ) : null}
              </View>
            </ScrollView>
          ) : null}
        </Animated.View>
      ) : null}

      {panelOpen && activePanel === 'design' && stylePickerOpen ? (
        <Animated.View
          style={[
            styles.stylePickerPopover,
            {
              opacity: popoverAnim,
              transform: [
                {
                  translateY: popoverAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
                {
                  scale: popoverAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.stylePickerCard}>
            <View style={styles.stylePickerHeaderRow}>
              <View style={styles.stylePickerTitleWrap}>
                <Text style={styles.stylePickerTitle}>Color Grid</Text>
                <Text style={styles.stylePickerSubtitle}>
                  Pick a color, then tune opacity.
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setStylePickerOpen(false);
                }}
                style={({ pressed }) => [
                  styles.stylePickerCloseBtn,
                  pressed && styles.stylePickerCloseBtnPressed,
                ]}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.colorGrid}>
              {colorGrid.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.colorGridRow}>
                  {row.map((color) => {
                    const selected = selectedLayerStyle?.color === color;
                    return (
                      <Pressable
                        key={`${rowIndex}-${color}`}
                        onPress={() =>
                          onSetLayerStyleColor(selectedStyleLayer, color)
                        }
                        style={({ pressed }) => [
                          styles.colorGridCell,
                          { backgroundColor: color },
                          pressed && styles.colorGridCellPressed,
                        ]}
                      >
                        {selected ? (
                          <View style={styles.colorGridCellSelectionRing} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <Text style={styles.opacityTitle}>Opacity</Text>
            <View style={styles.opacityControlRow}>
              <View
                style={styles.opacitySliderTrack}
                onLayout={handleOpacityTrackLayout}
                {...opacityResponder.panHandlers}
              >
                {Array.from({ length: 2 }).map((_, row) => (
                  <View key={`chip-row-${row}`} style={styles.opacityCheckerRow}>
                    {Array.from({ length: 22 }).map((__, col) => (
                      <View
                        key={`chip-${row}-${col}`}
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
                <View
                  style={[
                    styles.opacitySliderTint,
                    {
                      opacity: 1,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0)',
                      selectedLayerStyle?.color ?? colors.solidWhite,
                    ]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.opacitySliderGradient}
                  />
                </View>
                {opacityTrackWidth ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.opacitySliderHandle,
                      {
                        left: clamp(
                          opacityHandleLeft - 12,
                          0,
                          Math.max(0, opacityTrackWidth - 24),
                        ),
                      },
                    ]}
                  />
                ) : null}
              </View>
              <Text style={styles.opacityValueBadge}>
                {Math.round((selectedLayerStyle?.opacity ?? 1) * 100)}%
              </Text>
            </View>
            <Text style={styles.opacityHelpText}>Drag left or right</Text>
          </View>
        </Animated.View>
      ) : null}

      <Modal
        visible={helpPopoverOpen}
        transparent
        animationType="none"
        onRequestClose={() => onCloseHelpPopover?.()}
      >
        <View style={styles.helpModalRoot}>
          <Pressable
            style={styles.helpModalBackdrop}
            onPress={() => onCloseHelpPopover?.()}
          />
          <Animated.View
            style={[
              styles.helpPopoverTop,
              { top: insets.top + 54 },
              {
                opacity: helpPopoverAnim,
                transform: [
                  {
                    translateY: helpPopoverAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: helpPopoverAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.stylePickerCard, styles.helpPopoverCard]}>
              <View style={styles.stylePickerHeaderRow}>
                <View style={styles.stylePickerTitleWrap}>
                  <Text style={styles.stylePickerTitle}>Settings</Text>
                  <Text style={styles.stylePickerSubtitle}>
                    Quick settings
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    onCloseHelpPopover?.();
                  }}
                  style={({ pressed }) => [
                    styles.stylePickerCloseBtn,
                    pressed && styles.stylePickerCloseBtnPressed,
                  ]}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>

              <Text style={styles.sectionTitle}>Settings</Text>
              <View style={styles.themeModeRow}>
                {(
                  [
                    { id: 'light', label: 'Light' },
                    { id: 'dark', label: 'Dark' },
                  ] as { id: AppThemeMode; label: string }[]
                ).map((item) => {
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
              <Text style={styles.sectionTitle}>Elevation Unit</Text>
              <View style={styles.mediaPickRow}>
                {(
                  [
                    { id: 'm', label: 'Meters' },
                    { id: 'ft', label: 'Feet' },
                  ] as { id: ElevationUnit; label: string }[]
                ).map((item) => {
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
                Pinch/rotate/drag blocks. Center and rotation guides appear
                during move.
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
          </Animated.View>
        </View>
      </Modal>

      <View style={styles.panelTabs}>
        <View style={styles.mainTabsRow}>
          <LinearGradient
            pointerEvents="none"
            colors={[colors.glassSurfaceStart, colors.glassSurfaceEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainTabsGlassBg}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.mainTabsGlassSheen}
          />
          {mainTabs.map((tab) => {
            const selected = activePanel === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => onPressTab(tab.id, tab.disabled)}
                disabled={tab.disabled}
                style={[
                  styles.panelTab,
                  selected && styles.panelTabSelected,
                  tab.disabled && styles.panelTabDisabled,
                ]}
              >
                <View style={styles.panelTabContent}>
                  <MaterialCommunityIcons
                    name={tab.icon}
                    size={14}
                    color={
                      tab.disabled
                        ? colors.textSubtle
                        : selected
                          ? colors.text
                          : colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.panelTabText,
                      selected && styles.panelTabTextSelected,
                      tab.disabled && styles.panelTabTextDisabled,
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
          onPress={onQuickExport}
          disabled={quickExportBusy}
          style={[
            styles.helpFab,
            styles.helpFabExport,
            quickExportBusy ? styles.helpFabDisabled : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Export"
        >
          <LinearGradient
            pointerEvents="none"
            colors={[colors.glassSurfaceStart, colors.glassSurfaceEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.helpFabGlassBg}
          />
          <MaterialCommunityIcons
            name={quickExportBusy ? 'dots-horizontal' : 'export-variant'}
            size={20}
            color={colors.primaryText}
          />
        </Pressable>
      </View>
    </View>
  );
}

function isSameSunsetPrimaryGradient(
  a: [string, string, string],
  b: [string, string, string],
) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function LayoutLayoutPreview({
  template,
  styles,
}: {
  template: StatsLayout;
  styles: ReturnType<typeof createStyles>;
}) {
  const rawWidth = template.width;
  const rawHeight = getLayoutPreviewHeight(template.layout);
  const scale = Math.min(92 / rawWidth, 52 / rawHeight);
  const previewLayerTextColor =
    template.layout === 'split-bold' ? 'rgba(255,255,255,0.6)' : undefined;

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
              layerTextColor={previewLayerTextColor}
              visible={{
                distance: true,
                time: true,
                pace: true,
                elev: true,
                cadence: false,
                calories: false,
                avgHr: false,
              }}
              distanceText="10.3 km"
              durationText="50:20"
              paceText="4:52 /km"
              elevText="42 m"
              cadenceText="168 spm"
              caloriesText="462"
              avgHeartRateText="156 bpm"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function getLayoutPreviewHeight(layout: StatsLayoutKind) {
  switch (layout) {
    case 'hero':
    case 'glass-row':
    case 'sunset-hero':
    case 'morning-glass':
      return 190;
    case 'split-bold':
      return 228;
    case 'vertical':
    case 'soft-stack':
      return 244;
    case 'compact':
    case 'pill-inline':
      return 132;
    case 'columns':
    case 'card-columns':
      return 146;
    case 'grid-2x2':
    case 'panel-grid':
    default:
      return 186;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hsvToHex(h: number, s: number, v: number) {
  const normalizedHue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const c = value * sat;
  const x = c * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
  const m = value - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (normalizedHue < 60) {
    r = c;
    g = x;
  } else if (normalizedHue < 120) {
    r = x;
    g = c;
  } else if (normalizedHue < 180) {
    g = c;
    b = x;
  } else if (normalizedHue < 240) {
    g = x;
    b = c;
  } else if (normalizedHue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sectionTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 14,
      letterSpacing: 0.2,
    },
    chipRow: {
      gap: spacing.sm,
    },
    chip: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: 116,
    },
    chipSelected: {
      borderColor: colors.primaryBorderOnLight,
      borderWidth: 2,
      backgroundColor: colors.surfaceAlt,
    },
    chipText: {
      color: colors.text,
      fontWeight: '700',
    },
  chipSub: {
    color: colors.primaryText,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    alignSelf: 'center',
  },
    templateCard: {
      width: 108,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 0,
      overflow: 'hidden',
      position: 'relative',
      shadowColor: colors.text,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    templateModeIconWrap: {
      width: '100%',
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
  templateItem: {
    alignItems: 'center',
  },
  templateCardName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 4,
  },
  templatePremiumBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    color: colors.primaryText,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  templateCardSelected: {
    borderColor: colors.primaryBorderOnLight,
    borderWidth: 2,
  },
  previewFrame: {
    height: 54,
    borderRadius: 10,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: colors.layoutPreviewFrameBg,
    padding: 2,
    overflow: 'hidden',
  },
  previewSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.layoutPreviewSurfaceBg,
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
  effectsSectionSpacing: {
    marginTop: spacing.sm,
  },
  activityPhotoRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  activityPhotoCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityPhotoCardPressed: {
    opacity: 0.88,
  },
  activityPhotoThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  activityPhotoCopy: {
    flex: 1,
  },
  activityPhotoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  activityPhotoSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  premiumBtn: {
    minWidth: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  premiumBtnFullWidth: {
    flex: 1,
    minWidth: 0,
    minHeight: 68,
  },
  premiumBtnDisabled: {
    opacity: 0.62,
  },
  premiumBtnIcon: {
    marginBottom: 4,
  },
  premiumBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
    panelShell: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: layout.floatingBottomOffset,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: spacing.sm,
      overflow: 'visible',
      shadowColor: colors.glassShadow,
      shadowOpacity: 0.24,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
      elevation: 8,
    },
    panelGlassBg: {
      ...StyleSheet.absoluteFillObject,
    },
    panelBackdropLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    panelGlassSheen: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.56,
    },
    panelGlassDepth: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.24,
    },
    panelGlassHighlight: {
      position: 'absolute',
      left: 14,
      right: 14,
      top: 0,
      height: 1,
      backgroundColor: colors.glassHighlight,
      opacity: 0.9,
    },
    panelBody: {
      minHeight: 196,
      maxHeight: 240,
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
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 5,
    position: 'relative',
  },
  mainTabsGlassBg: {
    ...StyleSheet.absoluteFillObject,
  },
  mainTabsGlassSheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
    panelTab: {
      flex: 1,
      height: 50,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: 'transparent',
    },
  panelTabContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
    panelTabSelected: {
      backgroundColor: colors.surface,
      borderColor: colors.borderStrong,
      shadowColor: colors.glassShadow,
      shadowOpacity: 0.1,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
  panelTabDisabled: {
    opacity: 0.5,
  },
  panelTabText: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 11,
  },
  panelTabTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  panelTabTextDisabled: {
    color: colors.textSubtle,
  },
    helpFab: {
      width: 50,
      height: 50,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 0,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.glassStroke,
      position: 'relative',
    },
    helpFabGlassBg: {
      ...StyleSheet.absoluteFillObject,
    },
    helpFabIdle: {
      backgroundColor: 'transparent',
    },
    helpFabSelected: {
      backgroundColor: colors.surface,
      borderColor: colors.borderStrong,
    },
    helpFabExport: {
      backgroundColor: colors.primary,
      borderColor: colors.primaryBorderOnLight,
    },
    helpFabDisabled: {
      opacity: 0.6,
    },
  effectsList: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  effectCard: {
    width: 116,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  effectCardSelected: {
    borderColor: colors.primaryBorderOnLight,
    borderWidth: 2,
  },
  effectCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  effectPreview: {
    width: '100%',
    aspectRatio: 1.33,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceStrong,
  },
  effectPreviewBg: {
    ...StyleSheet.absoluteFillObject,
  },
  effectPreviewDepth: {
    ...StyleSheet.absoluteFillObject,
  },
  effectPreviewBgOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  effectPreviewSubject: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 10,
    top: 18,
    borderRadius: 9,
  },
  effectPreviewSubjectOverlay: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 10,
    top: 18,
    borderRadius: 9,
  },
  effectPreviewStats: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 6,
    gap: 4,
  },
  effectPreviewStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  effectPreviewStatLineLg: {
    alignSelf: 'center',
    width: '62%',
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  effectPreviewStatLineSm: {
    width: 18,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  effectTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
    paddingHorizontal: 1,
  },
  mediaPickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  backgroundActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  gradientPresetRow: {
    gap: 8,
    paddingBottom: 2,
  },
  gradientPresetCard: {
    width: 74,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  gradientPresetCardSelected: {
    borderColor: colors.primaryBorderOnLight,
    borderWidth: 2,
  },
  gradientPresetFill: {
    flex: 1,
  },
  sunsetGradientPresetRow: {
    gap: 8,
    paddingBottom: 2,
  },
  sunsetGradientPresetCard: {
    width: 58,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  sunsetGradientPresetCardSelected: {
    borderColor: colors.primaryBorderOnLight,
    borderWidth: 2,
  },
  sunsetGradientPresetFill: {
    flex: 1,
  },
  backgroundActionCell: {
    flex: 1,
    minWidth: 0,
  },
  orderHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: -2,
  },
  orderLegend: {
    color: colors.textMuted,
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
  helpContent: {
    paddingBottom: 8,
  },
  overlayActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  overlayActionCell: {
    flex: 1,
    minWidth: 0,
  },
  layerRowSpacer: {
    height: 6,
  },
    layerRowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 12,
    },
    layerRowCardSelected: {
      borderColor: colors.primaryBorderOnLight,
      borderWidth: 2,
    },
  layerRowCardDragging: {
    opacity: 0.75,
  },
  layerVisibilityBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
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
    color: colors.textMuted,
    fontSize: 11,
  },
  behindToggleBtn: {
    minWidth: 62,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  behindToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBorderOnLight,
  },
  behindToggleText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  behindToggleTextActive: {
    color: colors.primaryText,
  },
  layerHandleBtn: {
    width: 46,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerDelete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 8,
    backgroundColor: colors.dangerSurface,
  },
    statsPillsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      rowGap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 8,
    },
    statsPill: {
      minWidth: 98,
      flexGrow: 1,
      flexBasis: '31%',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceAlt,
      paddingVertical: 9,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
  statsPillMain: {
    flex: 1,
    minWidth: 0,
  },
  statsControlRow: {
    width: '48%',
    minWidth: 0,
    flexGrow: 0,
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  statsPrimaryBtn: {
    width: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsPrimaryBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBorderOnLight,
  },
  statsPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBorderOnLight,
  },
  statsPillDisabled: {
    opacity: 0.45,
  },
  statsPillText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  statsPillTextSelected: {
    color: colors.primaryText,
  },
  chartCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chartTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  chartToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chartToggleBtn: {
    minWidth: 26,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  chartToggleBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBorderOnLight,
  },
  chartToggleText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  chartToggleTextSelected: {
    color: colors.primaryText,
  },
  chartRows: {
    gap: 6,
  },
  chartRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartRowLabel: {
    width: 22,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  chartRowTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  chartRowFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  chartRowValue: {
    width: 56,
    textAlign: 'right',
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  verticalBarsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minHeight: 104,
    paddingTop: 6,
  },
  verticalBarItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    gap: 4,
  },
  verticalBarTrack: {
    width: '100%',
    maxWidth: 28,
    height: 90,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  verticalBarFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  verticalBarLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  chartFallbackText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  chartBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  areaChartWrap: {
    height: 106,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  areaColumn: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  areaColumnFill: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  areaChartAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  areaAxisLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  styleLayerButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  styleLayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 78,
  },
  styleLayerButtonSelected: {
    borderColor: colors.primaryBorderOnLight,
    backgroundColor: colors.primary,
  },
  styleLayerButtonDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  styleLayerButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  styleLayerButtonTextSelected: {
    color: colors.primaryText,
  },
  stylePickerPopover: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 76,
    zIndex: 40,
  },
    helpModalRoot: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    helpModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.16)',
    },
    helpPopoverTop: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
    },
    stylePickerCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
      shadowColor: colors.text,
      shadowOpacity: 0.22,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    helpPopoverCard: {
      backgroundColor: colors.panelSurfaceOverlay,
      borderColor: colors.glassStroke,
    },
  stylePickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stylePickerTitleWrap: {
    flex: 1,
    gap: 1,
  },
  stylePickerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stylePickerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  stylePickerCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stylePickerCloseBtnPressed: {
    opacity: 0.65,
  },
  stylePickerHint: {
    color: colors.textMuted,
    fontSize: 11,
  },
  colorGrid: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorGridRow: {
    flexDirection: 'row',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  colorGridCell: {
    flex: 1,
    aspectRatio: 1,
    position: 'relative',
    marginRight: -StyleSheet.hairlineWidth,
  },
  colorGridCellSelectionRing: {
    position: 'absolute',
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 2,
  },
  colorGridCellPressed: {
    opacity: 0.8,
  },
  opacityTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  opacityControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  opacitySliderTrack: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  opacitySliderTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  opacitySliderGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  opacityCheckerRow: {
    flex: 1,
    flexDirection: 'row',
  },
  opacityCheckerCell: {
    flex: 1,
  },
  opacityCheckerCellDark: {
    backgroundColor: colors.borderStrong,
  },
  opacityCheckerCellLight: {
    backgroundColor: colors.surface,
  },
  opacityValueBadge: {
    width: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    textAlign: 'right',
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    paddingRight: 8,
  },
  opacitySliderHandle: {
    position: 'absolute',
    top: 2,
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.text,
    shadowColor: colors.text,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  opacityHelpText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: -2,
  },
  stylePickerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stylePickerPreviewSwatch: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stylePickerPreviewSwatchChecker: {
    ...StyleSheet.absoluteFillObject,
  },
  stylePickerPreviewSwatchTint: {
    ...StyleSheet.absoluteFillObject,
  },
  stylePickerMetaText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  styleControlsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 6,
    minWidth: 0,
  },
  quickColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  openPickerButton: {
    minWidth: 108,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  openPickerButtonPressed: {
    opacity: 0.72,
  },
  openPickerButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: colors.surface,
  },
  controlLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  note: {
    color: colors.textMuted,
  },
  themeModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeModeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  themeModeChipSelected: {
    borderColor: colors.primaryBorderOnLight,
    backgroundColor: colors.primary,
  },
  themeModeChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  themeModeChipTextSelected: {
    color: colors.primaryText,
  },
    unitChip: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
    },
  });
}
