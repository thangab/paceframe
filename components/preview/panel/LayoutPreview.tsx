import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatsLayerContent } from '@/components/StatsLayerContent';
import { type ThemeColors } from '@/constants/theme';
import { FONT_PRESETS } from '@/lib/previewConfig';
import type { StatsLayout } from '@/types/preview';
import { getLayoutPreviewHeight } from '@/components/preview/panel/utils';

type Props = {
  template: StatsLayout;
  colors: ThemeColors;
};

export function LayoutPreview({ template, colors }: Props) {
  const styles = useMemo(() => createStyles(colors), [colors]);
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
  });
}
