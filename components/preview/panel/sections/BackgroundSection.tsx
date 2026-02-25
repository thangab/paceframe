import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';

type Props = {
  styles: any;
  colors: any;
  activityPhotoUri?: string | null;
  onUseActivityPhotoBackground: () => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onGenerateGradient: () => void;
  onClearBackground: () => void;
  busy: boolean;
  isExtracting: boolean;
  allowVideoBackground: boolean;
  quickTemplateMode: boolean;
  isSquareFormat: boolean;
};

export function BackgroundSection({
  styles,
  colors,
  activityPhotoUri,
  onUseActivityPhotoBackground,
  onPickImage,
  onPickVideo,
  onGenerateGradient,
  onClearBackground,
  busy,
  isExtracting,
  allowVideoBackground,
  quickTemplateMode,
  isSquareFormat,
}: Props) {
  return (
    <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.activityPhotoTitle}>Activity photo</Text>
                <Text style={styles.activityPhotoSubtitle}>Use as background</Text>
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
              label={isExtracting ? 'Extracting...' : 'Image'}
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
  );
}
