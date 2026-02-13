import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { radius, spacing } from '@/constants/theme';
import type { DistanceUnit } from '@/lib/format';
import { FONT_PRESETS, TEMPLATES } from '@/lib/previewConfig';
import type {
  FieldId,
  LayerId,
  RouteMode,
  StatsTemplate,
} from '@/types/preview';

export type PreviewPanelTab = 'background' | 'stats' | 'layers' | 'help';

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
  onAddImageOverlay: () => void;
  isSquareFormat: boolean;
  onToggleSquareFormat: () => void;
  layerEntries: [LayerId, string][];
  routeMode: RouteMode;
  visibleLayers: Partial<Record<LayerId, boolean>>;
  selectedLayer: LayerId;
  setSelectedLayer: (layer: LayerId) => void;
  onToggleLayer: (layer: LayerId, value: boolean) => void;
  onMoveLayer: (layer: LayerId, direction: 'up' | 'down') => void;
  onRemoveLayer: (layer: LayerId) => void;
  template: StatsTemplate;
  onSelectTemplate: (t: StatsTemplate) => void;
  selectedFontId: string;
  onSelectFont: (fontId: string) => void;
  effectiveVisible: Record<FieldId, boolean>;
  supportsFullStatsPreview: boolean;
  onToggleField: (field: FieldId, value: boolean) => void;
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
  onAddImageOverlay,
  isSquareFormat,
  onToggleSquareFormat,
  layerEntries,
  routeMode,
  visibleLayers,
  selectedLayer,
  setSelectedLayer,
  onToggleLayer,
  onMoveLayer,
  onRemoveLayer,
  template,
  onSelectTemplate,
  selectedFontId,
  onSelectFont,
  effectiveVisible,
  supportsFullStatsPreview,
  onToggleField,
  distanceUnit,
  onSetDistanceUnit,
  isPremium,
  message,
  onOpenPaywall,
}: Props) {
  return (
    <View style={styles.panelShell}>
      {panelOpen ? (
        <View style={styles.panelBody}>
          {activePanel === 'background' ? (
            <View style={styles.controls}>
              <View style={styles.mediaPickRow}>
                <View style={styles.mediaPickCell}>
                  <PrimaryButton
                    label={
                      isExtracting ? 'Processing image...' : 'Choose image'
                    }
                    onPress={onPickImage}
                    variant="secondary"
                    disabled={busy || isExtracting}
                  />
                </View>
                <View style={styles.mediaPickCell}>
                  <PrimaryButton
                    label="Choose video"
                    onPress={onPickVideo}
                    variant="secondary"
                    disabled={busy}
                  />
                </View>
              </View>
              <View style={styles.mediaPickRow}>
                <View style={styles.mediaPickCell}>
                  <PrimaryButton
                    label="Clear background"
                    onPress={onClearBackground}
                    variant="secondary"
                    disabled={busy}
                  />
                </View>
                <View style={styles.mediaPickCell}>
                  <PrimaryButton
                    label="Add image overlay"
                    onPress={onAddImageOverlay}
                    variant="secondary"
                    disabled={busy}
                  />
                </View>
              </View>
              <PrimaryButton
                label={isSquareFormat ? 'Passer en Story (9:16)' : 'Redimensionner en carré (1:1)'}
                onPress={onToggleSquareFormat}
                variant="secondary"
                disabled={busy}
              />
            </View>
          ) : null}

          {activePanel === 'layers' ? (
            <ScrollView
              style={styles.panelScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.controls}>
                {layerEntries.map(([id, label]) => {
                  const isRouteLayer = id === 'route';
                  const switchValue = isRouteLayer
                    ? routeMode !== 'off' && Boolean(visibleLayers.route)
                    : Boolean(visibleLayers[id]);
                  const isImageLayer = id.startsWith('image:');
                  return (
                    <View key={id} style={styles.layerRow}>
                      <Pressable
                        onPress={() => setSelectedLayer(id)}
                        style={[
                          styles.layerNameBtn,
                          selectedLayer === id && styles.layerNameBtnSelected,
                        ]}
                      >
                        <Text style={styles.controlLabel}>{label}</Text>
                      </Pressable>
                      <Switch
                        value={switchValue}
                        onValueChange={(value) => onToggleLayer(id, value)}
                      />
                      <Pressable
                        style={styles.layerAction}
                        onPress={() => onMoveLayer(id, 'up')}
                        hitSlop={10}
                      >
                        <Text style={styles.layerActionText}>↑</Text>
                      </Pressable>
                      <Pressable
                        style={styles.layerAction}
                        onPress={() => onMoveLayer(id, 'down')}
                        hitSlop={10}
                      >
                        <Text style={styles.layerActionText}>↓</Text>
                      </Pressable>
                      {isImageLayer ? (
                        <Pressable
                          style={styles.layerDelete}
                          onPress={() => onRemoveLayer(id)}
                          hitSlop={10}
                        >
                          <Text style={styles.layerDeleteText}>✕</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}

          {activePanel === 'stats' ? (
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
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => onSelectTemplate(item)}
                      >
                        <Text style={styles.chipText}>{item.name}</Text>
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

                <Text style={styles.sectionTitle}>Visible Infos</Text>
                <View style={styles.controls}>
                  {(
                    [
                      ['time', 'Time'],
                      ['pace', 'Pace'],
                      ['elev', 'Elevation gain'],
                    ] as [FieldId, string][]
                  ).map(([id, label]) => (
                    <View key={id} style={styles.switchRow}>
                      <Text style={styles.controlLabel}>{label}</Text>
                      <Switch
                        value={effectiveVisible[id]}
                        disabled={
                          !supportsFullStatsPreview || id === 'distance'
                        }
                        onValueChange={(value) => onToggleField(id, value)}
                      />
                    </View>
                  ))}
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
        {(
          [
            { id: 'background', label: 'Media', type: 'panel' },
            { id: 'stats', label: 'Data', type: 'panel' },
            { id: 'layers', label: 'Layers', type: 'panel' },
            { id: 'help', label: 'Help', type: 'panel' },
          ] as {
            id: PreviewPanelTab;
            label: string;
            type: 'panel';
          }[]
        ).map((tab) => {
          const selected = activePanel === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                if (panelOpen && activePanel === tab.id) {
                  setPanelOpen(false);
                  return;
                }
                if (!panelOpen) {
                  setPanelOpen(true);
                }
                setActivePanel(tab.id as PreviewPanelTab);
              }}
              style={[styles.panelTab, selected && styles.panelTabSelected]}
            >
              <Text
                style={[
                  styles.panelTabText,
                  selected && styles.panelTabTextSelected,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: '#F3F4F6',
    fontWeight: '800',
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
    fontWeight: '700',
  },
  chipSub: {
    color: '#A0A8B8',
    fontSize: 12,
    marginTop: 2,
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 8,
  },
  panelTab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#242935',
  },
  panelTabSelected: {
    backgroundColor: '#D9F04A',
  },
  panelTabText: {
    color: '#E5E7EB',
    fontWeight: '700',
  },
  panelTabTextSelected: {
    color: '#111827',
    fontWeight: '800',
  },
  mediaPickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  mediaPickCell: {
    flex: 1,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  layerNameBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2F3644',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: '#202632',
  },
  layerNameBtnSelected: {
    borderColor: '#D9F04A',
    borderWidth: 2,
  },
  layerAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2F3644',
    borderRadius: 8,
    backgroundColor: '#202632',
  },
  layerActionText: {
    color: '#F3F4F6',
    fontWeight: '800',
  },
  layerDelete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  layerDeleteText: {
    color: '#DC2626',
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2F3644',
    backgroundColor: '#202632',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  controlLabel: {
    color: '#F3F4F6',
    fontWeight: '700',
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
