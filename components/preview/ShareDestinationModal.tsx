import { useMemo } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export type ShareExportAsset = {
  uri?: string;
  previewUri: string;
  type: 'image' | 'video';
  mimeType?: string;
  transparent?: boolean;
};

export type ShareDestinationId =
  | 'copy'
  | 'download'
  | 'share';

const SHARE_DESTINATIONS: {
  id: ShareDestinationId;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: 'copy', label: 'Copy', icon: 'content-copy' },
  { id: 'download', label: 'Save', icon: 'download' },
  { id: 'share', label: 'Share', icon: 'send' },
];

type Props = {
  asset: ShareExportAsset | null;
  busy: boolean;
  previewAspectRatio: number;
  toastMessage?: string | null;
  onClose: () => void;
  onSelectDestination: (destination: ShareDestinationId) => void;
};

export function ShareDestinationModal({
  asset,
  busy,
  previewAspectRatio,
  toastMessage = null,
  onClose,
  onSelectDestination,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const previewWidth = Math.min(screenWidth * 0.58, 270);
  const previewHeight = previewWidth * previewAspectRatio;

  return (
    <Modal
      visible={Boolean(asset)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close share options"
        >
          <MaterialCommunityIcons
            name="close"
            size={34}
            color={colors.solidWhite}
          />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Choose where to share</Text>
          <Text style={styles.subtitle}>
            {asset?.type === 'video'
              ? 'Videos are optimized for high-quality playback on Instagram.'
              : 'Exports are optimized for high-quality sharing on Instagram.'}
          </Text>
        </View>

        {asset ? (
          <Image
            source={{ uri: asset.previewUri }}
            resizeMode="cover"
            style={[
              styles.preview,
              {
                width: previewWidth,
                height: previewHeight,
              },
            ]}
          />
        ) : null}

        {toastMessage ? (
          <View pointerEvents="none" style={styles.toast}>
            <MaterialCommunityIcons
              name="check-circle"
              size={18}
              color={colors.solidWhite}
            />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}

        <View style={styles.destinationDock}>
          <View style={styles.destinationRow}>
            {SHARE_DESTINATIONS.map((destination) => {
              return (
                <Pressable
                  key={destination.id}
                  onPress={() => onSelectDestination(destination.id)}
                  disabled={busy}
                  style={styles.destination}
                  accessibilityRole="button"
                  accessibilityLabel={destination.label}
                >
                  <View style={styles.destinationIcon}>
                    <MaterialCommunityIcons
                      name={destination.icon}
                      size={34}
                      color={colors.solidWhite}
                    />
                  </View>
                  <Text style={styles.destinationLabel}>
                    {destination.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#101826',
      paddingTop: Platform.OS === 'ios' ? 46 : 26,
      paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    closeButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 54 : 32,
      left: 28,
      zIndex: 2,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      paddingHorizontal: 32,
      marginTop: 82,
      marginBottom: 42,
    },
    title: {
      color: colors.solidWhite,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '900',
      textAlign: 'center',
    },
    subtitle: {
      color: 'rgba(255,255,255,0.84)',
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '500',
      textAlign: 'center',
      marginTop: 18,
      maxWidth: 330,
    },
    preview: {
      alignSelf: 'center',
      borderRadius: 28,
      backgroundColor: '#172235',
    },
    toast: {
      position: 'absolute',
      left: 28,
      right: 28,
      bottom: Platform.OS === 'ios' ? 164 : 148,
      zIndex: 3,
      minHeight: 46,
      borderRadius: 23,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    toastText: {
      color: colors.solidWhite,
      fontSize: 15,
      lineHeight: 19,
      fontWeight: '800',
      textAlign: 'center',
    },
    destinationDock: {
      marginTop: 'auto',
      paddingTop: 22,
      paddingHorizontal: 28,
    },
    destinationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    destination: {
      flex: 1,
      alignItems: 'center',
      gap: 10,
    },
    destinationIcon: {
      width: 76,
      height: 76,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#223047',
    },
    destinationLabel: {
      color: colors.solidWhite,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
      textAlign: 'center',
    },
  });
}
