import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { LayerId, RouteMode } from '@/types/preview';

type LayerEntry = { id: LayerId; label: string; isBehind: boolean };

type Props = {
  styles: any;
  colors: any;
  orderedLayerEntries: LayerEntry[];
  setDraggingLayerId: (id: LayerId | null) => void;
  setOrderedLayerEntries: (entries: LayerEntry[]) => void;
  onReorderLayers: (entries: LayerEntry[]) => void;
  routeMode: RouteMode;
  visibleLayers: Partial<Record<LayerId, boolean>>;
  selectedLayer: LayerId | null;
  draggingLayerId: LayerId | null;
  onToggleLayer: (layer: LayerId, value: boolean) => void;
  setSelectedLayer: (layer: LayerId) => void;
  onSetLayerBehindSubject: (layer: LayerId, value: boolean) => void;
  onRemoveLayer: (layer: LayerId) => void;
  onAddImageOverlay: () => void;
  onCreateSticker: () => void;
  busy: boolean;
};

export function ContentSection({
  styles,
  colors,
  orderedLayerEntries,
  setDraggingLayerId,
  setOrderedLayerEntries,
  onReorderLayers,
  routeMode,
  visibleLayers,
  selectedLayer,
  draggingLayerId,
  onToggleLayer,
  setSelectedLayer,
  onSetLayerBehindSubject,
  onRemoveLayer,
  onAddImageOverlay,
  onCreateSticker,
  busy,
}: Props) {
  return (
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
            <Text style={styles.orderHint}>Front {'>'} Back (drag)</Text>
            <Text style={styles.orderLegend}>
              Eye = visible • Front/Behind = subject depth • Handle = drag
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.layerRowSpacer} />}
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
                (isActive || draggingLayerId === id) && styles.layerRowCardDragging,
              ]}
            >
              <Pressable
                onPress={() => onToggleLayer(id, !switchValue)}
                style={styles.layerVisibilityBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={switchValue ? 'Hide layer' : 'Show layer'}
              >
                <MaterialCommunityIcons
                  name={switchValue ? 'eye' : 'eye-off'}
                  size={20}
                  color={switchValue ? colors.text : colors.textSubtle}
                />
              </Pressable>
              <Pressable onPress={() => setSelectedLayer(id)} style={styles.layerMainBtn}>
                <View style={styles.layerMainTextWrap}>
                  <Text style={styles.controlLabel}>{label}</Text>
                  <Text style={styles.orderPositionText}>#{index}</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.behindToggleBtn, isBehind && styles.behindToggleBtnActive]}
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
  );
}
