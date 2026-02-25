import { Animated, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { StyleLayerId } from '@/components/preview/panel/types';

type Props = {
  visible: boolean;
  styles: any;
  colors: any;
  popoverAnim: Animated.Value;
  setStylePickerOpen: (open: boolean) => void;
  colorGrid: string[][];
  selectedLayerStyle: { color: string; opacity: number } | undefined;
  selectedStyleLayer: StyleLayerId;
  onSetLayerStyleColor: (layerId: StyleLayerId, color: string) => void;
  handleOpacityTrackLayout: (event: any) => void;
  opacityResponderPanHandlers: any;
  opacityTrackWidth: number;
  opacityHandleLeft: number;
};

export function ColorPickerPopover({
  visible,
  styles,
  colors,
  popoverAnim,
  setStylePickerOpen,
  colorGrid,
  selectedLayerStyle,
  selectedStyleLayer,
  onSetLayerStyleColor,
  handleOpacityTrackLayout,
  opacityResponderPanHandlers,
  opacityTrackWidth,
  opacityHandleLeft,
}: Props) {
  if (!visible) return null;

  return (
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
            <Text style={styles.stylePickerSubtitle}>Pick a color, then tune opacity.</Text>
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
                    onPress={() => onSetLayerStyleColor(selectedStyleLayer, color)}
                    style={({ pressed }) => [
                      styles.colorGridCell,
                      { backgroundColor: color },
                      pressed && styles.colorGridCellPressed,
                    ]}
                  >
                    {selected ? <View style={styles.colorGridCellSelectionRing} /> : null}
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
            {...opacityResponderPanHandlers}
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
            <View style={[styles.opacitySliderTint, { opacity: 1 }]}> 
              <LinearGradient
                colors={['rgba(255,255,255,0)', selectedLayerStyle?.color ?? colors.solidWhite]}
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
                    left: Math.max(
                      0,
                      Math.min(Math.max(0, opacityTrackWidth - 24), opacityHandleLeft - 12),
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
  );
}
