import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EffectsSection } from '@/components/preview/panel/sections/EffectsSection';
import { BackgroundSection } from '@/components/preview/panel/sections/BackgroundSection';
import { ContentSection } from '@/components/preview/panel/sections/ContentSection';
import { DesignSection } from '@/components/preview/panel/sections/DesignSection';
import { ColorPickerPopover } from '@/components/preview/panel/sections/ColorPickerPopover';
import {
  buildColorGrid,
  buildColorPresets,
  buildMainTabs,
  buildStyleLayerButtons,
  splitEffectPresets,
} from '@/components/preview/panel/data';
import type {
  HeaderFieldId,
  PreviewPanelTab,
  StyleLayerId,
  VisualEffectPreset,
} from '@/components/preview/panel/types';
import {
  clamp,
  hsvToHex,
} from '@/components/preview/panel/utils';
import { layout, spacing, type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import type {
  BackgroundGradient,
  ChartDisplayVersion,
  ChartFillStyle,
  ChartOrientation,
  FieldId,
  LayerId,
  RouteMode,
  StatsLayout,
} from '@/types/preview';

export type { PreviewPanelTab } from '@/components/preview/panel/types';

type Props = {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  activePanel: PreviewPanelTab;
  setActivePanel: (panel: PreviewPanelTab) => void;
  busy: boolean;
  isExtracting: boolean;
  onTakePhoto: () => void;
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
  layerStyleMap: Record<StyleLayerId, { color: string; opacity: number }>;
  onSetLayerStyleColor: (layerId: StyleLayerId, color: string) => void;
  onSetLayerStyleOpacity: (layerId: StyleLayerId, opacity: number) => void;
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
  onQuickExport: () => void;
  quickExportBusy?: boolean;
  quickTemplateMode?: boolean;
  allowVideoBackground?: boolean;
  showBackgroundTab?: boolean;
  hasLapPaceLayer: boolean;
  hasHeartRateLayer: boolean;
  paceChartVersion: ChartDisplayVersion;
  onSetPaceChartVersion: (value: ChartDisplayVersion) => void;
  hrChartVersion: ChartDisplayVersion;
  onSetHrChartVersion: (value: ChartDisplayVersion) => void;
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
  onTakePhoto,
  onPickImage,
  onPickVideo,
  activityPhotoUri,
  onUseActivityPhotoBackground,
  onClearBackground,
  onGenerateGradient,
  currentBackgroundGradient: _currentBackgroundGradient,
  gradientPresets: _gradientPresets,
  onApplyGradientPreset: _onApplyGradientPreset,
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
  maxOptionalMetrics: _maxOptionalMetrics,
  selectedOptionalMetrics: _selectedOptionalMetrics,
  onToggleField,
  headerVisible,
  onToggleHeaderField,
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
  onQuickExport,
  quickExportBusy = false,
  quickTemplateMode = false,
  allowVideoBackground = true,
  showBackgroundTab = true,
  hasLapPaceLayer,
  hasHeartRateLayer,
  paceChartVersion,
  onSetPaceChartVersion,
  hrChartVersion,
  onSetHrChartVersion,
  paceChartOrientation,
  onSetPaceChartOrientation,
  paceChartFill,
  onSetPaceChartFill,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isCompactViewport = screenHeight < 740 || screenWidth < 390;
  const floatingBottomOffset = isCompactViewport
    ? 5
    : layout.floatingBottomOffset;
  const [selectedStyleLayer, setSelectedStyleLayer] =
    useState<StyleLayerId>('meta');
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const styleLayerButtons = buildStyleLayerButtons({
    hasLapPaceLayer,
    hasHeartRateLayer,
    supportsPrimaryLayer,
    showPrimaryLayer: visibleLayers.primary,
  });
  const colorPresets = buildColorPresets(colors.primary);
  const selectedLayerStyle = layerStyleMap[selectedStyleLayer];
  const isSunsetPrimaryStyleSelected =
    selectedStyleLayer === 'primary' && template.layout === 'sunset-hero';
  const [opacityTrackWidth, setOpacityTrackWidth] = useState(0);
  const [renderPanelBody, setRenderPanelBody] = useState(panelOpen);
  const panelBodyAnim = useRef(new Animated.Value(panelOpen ? 1 : 0)).current;
  const popoverAnim = useRef(new Animated.Value(0)).current;
  const colorGrid = buildColorGrid(hsvToHex);
  const { filterEffects, blurEffects } = splitEffectPresets(visualEffectPresets);

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

  const mainTabs = buildMainTabs({
    quickTemplateMode,
    effectsEnabled,
    showBackgroundTab,
  });
  const [orderedLayerEntries, setOrderedLayerEntries] = useState(layerEntries);
  const [draggingLayerId, setDraggingLayerId] = useState<LayerId | null>(null);

  useEffect(() => {
    setOrderedLayerEntries(layerEntries);
  }, [layerEntries]);

  function onPressTab(tabId: PreviewPanelTab, disabled?: boolean) {
    if (disabled) return;
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
    <View style={[styles.panelShell, { bottom: floatingBottomOffset }]}>
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
            <BackgroundSection
              styles={styles}
              colors={colors}
              activityPhotoUri={activityPhotoUri}
              onUseActivityPhotoBackground={onUseActivityPhotoBackground}
              onTakePhoto={onTakePhoto}
              onPickImage={onPickImage}
              onPickVideo={onPickVideo}
              onGenerateGradient={onGenerateGradient}
              onClearBackground={onClearBackground}
              busy={busy}
              isExtracting={isExtracting}
              allowVideoBackground={allowVideoBackground}
              quickTemplateMode={quickTemplateMode}
              isSquareFormat={isSquareFormat}
            />
          ) : null}

          {activePanel === 'content' ? (
            <ContentSection
              styles={styles}
              colors={colors}
              orderedLayerEntries={orderedLayerEntries}
              setDraggingLayerId={setDraggingLayerId}
              setOrderedLayerEntries={setOrderedLayerEntries}
              onReorderLayers={onReorderLayers}
              routeMode={routeMode}
              visibleLayers={visibleLayers}
              selectedLayer={selectedLayer}
              draggingLayerId={draggingLayerId}
              onToggleLayer={onToggleLayer}
              setSelectedLayer={setSelectedLayer}
              onSetLayerBehindSubject={onSetLayerBehindSubject}
              onRemoveLayer={onRemoveLayer}
              onAddImageOverlay={onAddImageOverlay}
              onCreateSticker={onCreateSticker}
              busy={busy}
            />
          ) : null}

          {activePanel === 'design' ? (
            <DesignSection
              styles={styles}
              colors={colors}
              quickTemplateMode={quickTemplateMode}
              templateOptions={templateOptions}
              isPremium={isPremium}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={onSelectTemplate}
              template={template}
              onSelectLayout={onSelectLayout}
              effectiveVisible={effectiveVisible}
              supportsFullStatsPreview={supportsFullStatsPreview}
              statsFieldAvailability={statsFieldAvailability}
              supportsPrimaryLayer={supportsPrimaryLayer}
              primaryField={primaryField}
              onSetPrimaryField={onSetPrimaryField}
              onToggleField={onToggleField}
              hasLapPaceLayer={hasLapPaceLayer}
              hasHeartRateLayer={hasHeartRateLayer}
              paceChartVersion={paceChartVersion}
              onSetPaceChartVersion={onSetPaceChartVersion}
              hrChartVersion={hrChartVersion}
              onSetHrChartVersion={onSetHrChartVersion}
              paceChartOrientation={paceChartOrientation}
              onSetPaceChartOrientation={onSetPaceChartOrientation}
              paceChartFill={paceChartFill}
              onSetPaceChartFill={onSetPaceChartFill}
              headerVisible={headerVisible}
              onToggleHeaderField={onToggleHeaderField}
              selectedFontId={selectedFontId}
              onSelectFont={onSelectFont}
              styleLayerButtons={styleLayerButtons}
              selectedStyleLayer={selectedStyleLayer}
              setSelectedStyleLayer={setSelectedStyleLayer}
              layerStyleMap={layerStyleMap}
              selectedLayerStyle={selectedLayerStyle}
              isSunsetPrimaryStyleSelected={isSunsetPrimaryStyleSelected}
              sunsetPrimaryGradientPresets={sunsetPrimaryGradientPresets}
              sunsetPrimaryGradient={sunsetPrimaryGradient}
              onSetSunsetPrimaryGradient={onSetSunsetPrimaryGradient}
              setStylePickerOpen={setStylePickerOpen}
              colorPresets={colorPresets}
              onSetLayerStyleColor={onSetLayerStyleColor}
            />
          ) : null}

          {activePanel === 'effects' ? (
            <EffectsSection
              styles={styles}
              filterEffects={filterEffects}
              blurEffects={blurEffects}
              selectedFilterEffectId={selectedFilterEffectId}
              selectedBlurEffectId={selectedBlurEffectId}
              onSetFilterEffect={onSetFilterEffect}
              onSetBlurEffect={onSetBlurEffect}
              hasSubjectFree={hasSubjectFree}
            />
          ) : null}

        </Animated.View>
      ) : null}

      <ColorPickerPopover
        visible={panelOpen && activePanel === 'design' && stylePickerOpen}
        styles={styles}
        colors={colors}
        popoverAnim={popoverAnim}
        setStylePickerOpen={setStylePickerOpen}
        colorGrid={colorGrid}
        selectedLayerStyle={selectedLayerStyle}
        selectedStyleLayer={selectedStyleLayer}
        onSetLayerStyleColor={onSetLayerStyleColor}
        handleOpacityTrackLayout={handleOpacityTrackLayout}
        opacityResponderPanHandlers={opacityResponder.panHandlers}
        opacityTrackWidth={opacityTrackWidth}
        opacityHandleLeft={opacityHandleLeft}
      />

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
    cameraBtn: {
      minWidth: 92,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    cameraBtnFullWidth: {
      flex: 1,
      minWidth: 0,
      minHeight: 68,
    },
    cameraBtnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.985 }],
    },
    cameraBtnDisabled: {
      opacity: 0.55,
    },
    cameraBtnIcon: {
      marginBottom: 4,
    },
    cameraBtnText: {
      color: colors.text,
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
      fontSize: 9,
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
    unitChip: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
    },
  });
}
