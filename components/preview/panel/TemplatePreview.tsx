import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { STORY_HEIGHT, STORY_WIDTH } from '@/lib/previewConfig';
import type { ThemeColors } from '@/constants/theme';
import type {
  PreviewTemplateDefinition,
  PreviewTemplateTextElement,
} from '@/types/preview';

type Props = {
  template: PreviewTemplateDefinition;
  colors: ThemeColors;
};

const PREVIEW_WIDTH = 108;
const PREVIEW_HEIGHT = 72;

const SAMPLE_VALUES: Record<string, string> = {
  activityName: 'Morning Run',
  avgHr: '156',
  calories: '462',
  cadence: '168',
  date: '05/31/2026',
  distance: '10.3 km',
  elev: '42 m',
  location: 'Bangkok',
  pace: '4:52 /km',
  time: '50:20',
};

function resolvePreviewText(text: string) {
  return text
    .replace(/\[\[|\]\]/g, '')
    .replace(/\{([a-zA-Z]+)\}/g, (_, key: string) => SAMPLE_VALUES[key] ?? key);
}

function getTextAlign(item: PreviewTemplateTextElement) {
  return item.textAlign ?? item.align ?? 'left';
}

export function TemplatePreview({ template, colors }: Props) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = Math.min(PREVIEW_WIDTH / STORY_WIDTH, PREVIEW_HEIGHT / STORY_HEIGHT);
  const translateX = (PREVIEW_WIDTH - STORY_WIDTH * scale) / 2;
  const scaledOriginOffsetX = (STORY_WIDTH * (1 - scale)) / 2;
  const scaledOriginOffsetY = (STORY_HEIGHT * (1 - scale)) / 2;

  return (
    <View style={styles.previewFrame}>
      <View
        style={[
          styles.story,
          {
            left: translateX - scaledOriginOffsetX,
            top: -scaledOriginOffsetY,
            transform: [{ scale }],
          },
        ]}
      >
        {template.backgroundMediaFrame ? (
          <View
            style={[
              styles.mediaFrame,
              {
                left: template.backgroundMediaFrame.x ?? 0,
                top: template.backgroundMediaFrame.y ?? 0,
                width: template.backgroundMediaFrame.width,
                height: template.backgroundMediaFrame.height,
              },
            ]}
          />
        ) : null}

        {template.fixedImageElements?.map((item) => {
          const source = item.asset
            ? item.asset
            : item.uri
              ? { uri: item.uri }
              : null;
          if (!source) return null;

          return (
            <Image
              key={item.id}
              source={source}
              resizeMode="stretch"
              style={[
                styles.fixedImage,
                {
                  left: item.x,
                  top: item.y,
                  width: item.width,
                  height: item.height,
                  opacity: item.opacity ?? 1,
                  transform: [{ rotate: `${item.rotationDeg ?? 0}deg` }],
                },
              ]}
            />
          );
        })}

        {template.showRoute ? <View style={styles.routePreview} /> : null}

        {template.fixedChartElements?.map((item) => (
          <View
            key={item.id}
            style={[
              styles.chartPreview,
              {
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                opacity: item.opacity ?? 0.75,
                borderColor: item.color ?? '#FFFFFF',
              },
            ]}
          />
        ))}

        {template.fixedTextElements?.map((item) => (
          <Text
            key={item.id}
            numberOfLines={3}
            style={[
              styles.fixedText,
              {
                left: item.x,
                top: item.y,
                width: item.width ?? STORY_WIDTH - item.x,
                color: item.color ?? '#FFFFFF',
                backgroundColor:
                  item.backgroundColor === 'transparent'
                    ? 'transparent'
                    : item.backgroundColor,
                borderColor: item.borderColor ?? 'transparent',
                borderWidth: item.borderWidth ?? 0,
                borderRadius: item.borderRadius ?? 0,
                opacity: item.opacity ?? 1,
                paddingHorizontal: item.paddingX ?? 0,
                paddingVertical: item.paddingY ?? 0,
                fontFamily: item.fontFamily,
                fontSize: item.fontSize ?? 18,
                fontWeight: item.fontWeight ?? '700',
                letterSpacing: item.letterSpacing ?? 0,
                lineHeight: item.lineHeight,
                textAlign: getTextAlign(item),
                textTransform: item.uppercase ? 'uppercase' : 'none',
                textShadowColor: item.glowColor ?? 'transparent',
                textShadowRadius: item.glowRadius ?? 0,
                textShadowOffset: {
                  width: item.glowOffsetX ?? 0,
                  height: item.glowOffsetY ?? 0,
                },
              },
            ]}
          >
            {resolvePreviewText(item.text)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    previewFrame: {
      width: '100%',
      height: PREVIEW_HEIGHT,
      overflow: 'hidden',
      backgroundColor: colors.layoutPreviewSurfaceBg,
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    story: {
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
      position: 'absolute',
      backgroundColor: '#111827',
      overflow: 'hidden',
    },
    mediaFrame: {
      position: 'absolute',
      backgroundColor: '#8EA7B5',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.55)',
    },
    fixedImage: {
      position: 'absolute',
    },
    fixedText: {
      position: 'absolute',
      includeFontPadding: false,
    },
    routePreview: {
      position: 'absolute',
      left: 170,
      top: 460,
      width: 130,
      height: 46,
      borderTopWidth: 7,
      borderRightWidth: 7,
      borderColor: '#FFFFFF',
      borderTopLeftRadius: 32,
      borderBottomRightRadius: 24,
      opacity: 0.8,
      transform: [{ rotate: '-14deg' }],
    },
    chartPreview: {
      position: 'absolute',
      borderBottomWidth: 5,
      borderLeftWidth: 3,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
  });
}
