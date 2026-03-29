import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type {
  FontPreset,
  StatsLayout,
  StatsLayoutKind,
} from '@/types/preview';

export type Metric = {
  id: string;
  label: string;
  value: string;
};

export type CustomLayoutRenderProps = {
  template: StatsLayout;
  metrics: Metric[];
  fontPreset: FontPreset;
  isCompactViewport: boolean;
  layerTextColor?: string;
  textColorOverride: { color: string } | null;
  sunsetPrimaryGradient?: [string, string, string];
  primaryInSeparateLayer: boolean;
};

export type CustomPrimaryRenderProps = {
  template: StatsLayout;
  fontPreset: FontPreset;
  value: string;
  layerTextColor?: string;
  textColorOverride: { color: string } | null;
  sunsetPrimaryGradient?: [string, string, string];
};

type CustomRendererHelpers = {
  styles: any;
  ValueWithUnit: (props: any) => React.JSX.Element;
  GradientValueWithUnit: (props: any) => React.JSX.Element;
  InlineMetric: (props: any) => React.JSX.Element;
  SplitBoldPrimaryValue: (props: any) => React.JSX.Element;
  metricIcon: (metricId: string) => any;
  metricIconColor: (metricId: string) => string;
  splitBoldLabel: (metricId: string) => string;
  isDefaultSunsetHeroColor: (color: string) => boolean;
};

const CUSTOM_LAYOUT_RENDERERS: Partial<
  Record<
    StatsLayoutKind,
    (
      props: CustomLayoutRenderProps,
      helpers: CustomRendererHelpers,
    ) => React.JSX.Element
  >
> = {
  'sunset-hero': renderSunsetHeroLayout,
  'morning-glass': renderMorningGlassLayout,
  'split-bold': renderSplitBoldLayout,
  'mile-ring': renderMileRingLayout,
  'signal-board': renderSignalBoardLayout,
  'social-pill': renderSocialPillLayout,
};

const CUSTOM_PRIMARY_LAYOUT_RENDERERS: Partial<
  Record<
    StatsLayoutKind,
    (
      props: CustomPrimaryRenderProps,
      helpers: CustomRendererHelpers,
    ) => React.JSX.Element
  >
> = {
  'sunset-hero': renderSunsetHeroPrimary,
  'morning-glass': renderMorningGlassPrimary,
  'split-bold': renderSplitBoldPrimary,
  'social-pill': renderSocialPillPrimary,
};

export function renderCustomLayout(
  layout: StatsLayoutKind,
  props: CustomLayoutRenderProps,
  helpers: CustomRendererHelpers,
) {
  const renderer = CUSTOM_LAYOUT_RENDERERS[layout];
  return renderer ? renderer(props, helpers) : null;
}

export function renderCustomPrimary(
  layout: StatsLayoutKind,
  props: CustomPrimaryRenderProps,
  helpers: CustomRendererHelpers,
) {
  const renderer = CUSTOM_PRIMARY_LAYOUT_RENDERERS[layout];
  return renderer ? renderer(props, helpers) : null;
}

function renderSunsetHeroLayout(
  {
    metrics,
    fontPreset,
    isCompactViewport,
    textColorOverride,
    sunsetPrimaryGradient,
    primaryInSeparateLayer,
    layerTextColor,
  }: CustomLayoutRenderProps,
  {
    styles,
    ValueWithUnit,
    GradientValueWithUnit,
    isDefaultSunsetHeroColor,
  }: CustomRendererHelpers,
) {
  const useSunsetSolidPrimaryColor = layerTextColor
    ? !isDefaultSunsetHeroColor(layerTextColor)
    : false;
  return (
    <View style={styles.sunsetWrap}>
      {!primaryInSeparateLayer && metrics[0] ? (
        <View style={styles.morningDistanceWrap}>
          <GradientValueWithUnit
            value={metrics[0].value}
            fontPreset={fontPreset}
            valueStyleOverride={textColorOverride}
            disableGradient={useSunsetSolidPrimaryColor}
            gradientColors={sunsetPrimaryGradient}
          />
        </View>
      ) : null}

      <View style={styles.sunsetGrid}>
        {(primaryInSeparateLayer ? metrics : metrics.slice(1))
          .slice(0, 4)
          .map((metric) => (
            <View key={metric.id} style={styles.sunsetCard}>
              <Text
                style={[
                  styles.sunsetCardLabel,
                  textColorOverride,
                  { fontFamily: fontPreset.family },
                ]}
              >
                {metric.label.toUpperCase()}
              </Text>
              <ValueWithUnit
                value={metric.value}
                fontPreset={fontPreset}
                valueStyle={
                  isCompactViewport
                    ? styles.sunsetCardValueCompact
                    : styles.sunsetCardValueDesktop
                }
                unitStyle={
                  isCompactViewport
                    ? styles.sunsetCardUnitCompact
                    : styles.sunsetCardUnitDesktop
                }
                textStyleOverride={textColorOverride}
                unitStyleOverride={textColorOverride}
                numberOfLines={1}
                autoFit={isCompactViewport}
                minimumFontScale={isCompactViewport ? 0.74 : 0.96}
              />
            </View>
          ))}
      </View>
    </View>
  );
}

function renderMorningGlassLayout(
  {
    metrics,
    fontPreset,
    textColorOverride,
    primaryInSeparateLayer,
    layerTextColor,
  }: CustomLayoutRenderProps,
  {
    styles,
    InlineMetric,
    metricIcon,
    metricIconColor,
    ValueWithUnit,
  }: CustomRendererHelpers,
) {
  const source = primaryInSeparateLayer ? metrics : metrics.slice(1);
  const topRow = source.slice(0, Math.min(3, source.length));
  const bottomRow = source.slice(3, 6);
  return (
    <View
      style={[
        styles.morningWrap,
        primaryInSeparateLayer && styles.morningWrapSecondaryOnly,
      ]}
    >
      {!primaryInSeparateLayer && metrics[0] ? (
        <View style={styles.morningDistanceWrap}>
          <ValueWithUnit
            value={metrics[0].value}
            fontPreset={fontPreset}
            valueStyle={styles.morningDistanceValue}
            unitStyle={styles.morningDistanceUnit}
            textStyleOverride={textColorOverride}
            unitStyleOverride={textColorOverride}
            numberOfLines={1}
            autoFit
            minimumFontScale={0.78}
          />
        </View>
      ) : null}

      {topRow.length > 0 ? (
        <View style={styles.morningTopRow}>
          {topRow.map((metric) => (
            <View key={metric.id} style={styles.morningTopCard}>
              <InlineMetric
                icon={metricIcon(metric.id)}
                value={metric.value}
                fontPreset={fontPreset}
                iconColor={layerTextColor ?? metricIconColor(metric.id)}
                iconSize={22}
                textStyle={styles.morningCardValue}
                unitStyle={styles.morningCardUnit}
                textStyleOverride={textColorOverride}
                unitStyleOverride={textColorOverride}
              />
            </View>
          ))}
        </View>
      ) : null}

      {bottomRow.length > 0 ? (
        <View style={styles.morningBottomRow}>
          {bottomRow.map((metric) => (
            <View key={metric.id} style={styles.morningBottomCard}>
              <InlineMetric
                icon={metricIcon(metric.id)}
                value={metric.value}
                fontPreset={fontPreset}
                iconColor={layerTextColor ?? metricIconColor(metric.id)}
                iconSize={22}
                textStyle={styles.morningCardValue}
                unitStyle={styles.morningCardUnit}
                textStyleOverride={textColorOverride}
                unitStyleOverride={textColorOverride}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function renderSplitBoldLayout(
  {
    metrics,
    fontPreset,
    textColorOverride,
    primaryInSeparateLayer,
  }: CustomLayoutRenderProps,
  {
    styles,
    SplitBoldPrimaryValue,
    splitBoldLabel,
    ValueWithUnit,
  }: CustomRendererHelpers,
) {
  const secondary = primaryInSeparateLayer ? metrics : metrics.slice(1);
  return (
    <View
      style={[
        styles.splitBoldWrap,
        primaryInSeparateLayer && styles.splitBoldWrapSecondaryOnly,
      ]}
    >
      {!primaryInSeparateLayer ? (
        <View style={styles.splitBoldLeft}>
          <SplitBoldPrimaryValue
            value={metrics[0]?.value ?? '--'}
            fontPreset={fontPreset}
            textStyleOverride={textColorOverride}
          />
        </View>
      ) : null}
      <View style={styles.splitBoldRight}>
        {secondary.slice(0, 5).map((metric) => (
          <View key={metric.id} style={styles.splitBoldMetric}>
            <Text
              style={[
                styles.splitBoldMetricLabel,
                textColorOverride,
                { fontFamily: fontPreset.family },
              ]}
            >
              {splitBoldLabel(metric.id)}
            </Text>
            <ValueWithUnit
              value={metric.value}
              fontPreset={fontPreset}
              valueStyle={styles.splitBoldMetricValue}
              unitStyle={styles.splitBoldMetricUnit}
              textStyleOverride={textColorOverride}
              unitStyleOverride={textColorOverride}
              numberOfLines={1}
              autoFit
              minimumFontScale={0.94}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function renderMileRingLayout(
  { metrics, fontPreset, textColorOverride, layerTextColor }: CustomLayoutRenderProps,
  { styles, ValueWithUnit }: CustomRendererHelpers,
) {
  const orbitMetrics = metrics
    .filter((metric) => metric.id !== 'distance')
    .slice(0, 4)
    .map((metric) => formatMileRingMetric(metric.id, metric.value));
  const splitIndex = Math.ceil(orbitMetrics.length / 2);
  const topArcText = orbitMetrics.slice(0, splitIndex).join(' • ');
  const bottomArcText = orbitMetrics.slice(splitIndex).join(' • ');

  return (
    <View style={styles.mileRingWrap}>
      <View style={styles.mileRingBody}>
        {topArcText ? (
          <ArcMetricText
            value={topArcText}
            fontPreset={fontPreset}
            centerAngle={270}
            spanDeg={104}
            orientation="top"
            color={layerTextColor}
            styles={styles}
          />
        ) : null}

        {bottomArcText ? (
          <ArcMetricText
            value={bottomArcText}
            fontPreset={fontPreset}
            centerAngle={90}
            spanDeg={112}
            orientation="bottom"
            color={layerTextColor}
            styles={styles}
          />
        ) : null}

        <View
          style={[
            styles.mileRingCircle,
            layerTextColor ? { borderColor: layerTextColor } : null,
          ]}
        >
          {metrics[0] ? (
            <View style={styles.mileRingPrimaryInline}>
              <ValueWithUnit
                value={metrics[0].value}
                fontPreset={fontPreset}
                valueStyle={styles.mileRingPrimaryValue}
                unitStyle={styles.mileRingPrimaryUnit}
                textStyleOverride={textColorOverride}
                unitStyleOverride={textColorOverride}
                numberOfLines={1}
                autoFit
                minimumFontScale={0.74}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function renderSignalBoardLayout(
  {
    metrics,
    fontPreset,
    textColorOverride,
    layerTextColor,
  }: CustomLayoutRenderProps,
  { styles, ValueWithUnit }: CustomRendererHelpers,
) {
  const distanceMetric = metrics.find((metric) => metric.id === 'distance') ?? null;
  const sideMetrics = metrics
    .filter((metric) => metric.id === 'time' || metric.id === 'pace')
    .slice(0, 2);
  const railMetrics = metrics
    .filter(
      (metric) =>
        metric.id !== 'distance' &&
        !sideMetrics.some((sideMetric) => sideMetric.id === metric.id),
    )
    .slice(0, 3);

  return (
    <View style={styles.signalBoardWrap}>
      <View style={styles.signalBoardTop}>
        <View style={styles.signalBoardHero}>
          <Text
            style={[
              styles.signalBoardEyebrow,
              textColorOverride,
              { fontFamily: fontPreset.family },
            ]}
          >
            SESSION
          </Text>
          {distanceMetric ? (
            <ValueWithUnit
              value={distanceMetric.value}
              fontPreset={fontPreset}
              valueStyle={styles.signalBoardHeroValue}
              unitStyle={styles.signalBoardHeroUnit}
              textStyleOverride={textColorOverride}
              unitStyleOverride={textColorOverride}
              numberOfLines={1}
              autoFit={false}
              minimumFontScale={0.76}
            />
          ) : null}
        </View>

        <View style={styles.signalBoardStack}>
          {sideMetrics.map((metric) => (
            <View key={metric.id} style={styles.signalBoardMiniCard}>
              <Text
                style={[
                  styles.signalBoardMiniLabel,
                  textColorOverride,
                  { fontFamily: fontPreset.family },
                ]}
              >
                {metric.label.toUpperCase()}
              </Text>
              <ValueWithUnit
                value={metric.value}
                fontPreset={fontPreset}
                valueStyle={styles.signalBoardMiniValue}
                unitStyle={styles.signalBoardMiniUnit}
                textStyleOverride={textColorOverride}
                unitStyleOverride={textColorOverride}
                numberOfLines={1}
                autoFit={false}
                minimumFontScale={0.82}
              />
            </View>
          ))}
        </View>
      </View>

      {railMetrics.length ? (
        <View style={styles.signalBoardRail}>
          {railMetrics.map((metric, index) => (
            <View
              key={metric.id}
              style={[
                styles.signalBoardRailItem,
                index < railMetrics.length - 1 && styles.signalBoardRailDivider,
              ]}
            >
              <Text
                style={[
                  styles.signalBoardRailLabel,
                  textColorOverride,
                  { fontFamily: fontPreset.family },
                ]}
              >
                {metric.label.toUpperCase()}
              </Text>
              <ValueWithUnit
                value={metric.value}
                fontPreset={fontPreset}
                valueStyle={styles.signalBoardRailValue}
                unitStyle={styles.signalBoardRailUnit}
                textStyleOverride={textColorOverride}
                unitStyleOverride={textColorOverride}
                numberOfLines={1}
                autoFit
                minimumFontScale={0.84}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function renderSocialPillLayout(
  {
    metrics,
    fontPreset,
    textColorOverride,
    primaryInSeparateLayer,
    layerTextColor,
  }: CustomLayoutRenderProps,
  { styles, ValueWithUnit }: CustomRendererHelpers,
) {
  if (primaryInSeparateLayer || !metrics[0]) {
    return <></>;
  }

  return renderSocialPillBadge({
    value: metrics[0].value,
    fontPreset,
    textColorOverride,
    layerTextColor,
    styles,
    ValueWithUnit,
  });
}

function renderSunsetHeroPrimary(
  {
    fontPreset,
    value,
    textColorOverride,
    layerTextColor,
    sunsetPrimaryGradient,
  }: CustomPrimaryRenderProps,
  {
    styles,
    GradientValueWithUnit,
    isDefaultSunsetHeroColor,
  }: CustomRendererHelpers,
) {
  const useSunsetSolidPrimaryColor = layerTextColor
    ? !isDefaultSunsetHeroColor(layerTextColor)
    : false;
  return (
    <View style={styles.morningDistanceWrap}>
      <GradientValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyleOverride={textColorOverride}
        unitStyle={textColorOverride}
        disableGradient={useSunsetSolidPrimaryColor}
        gradientColors={sunsetPrimaryGradient}
      />
    </View>
  );
}

function renderSocialPillPrimary(
  {
    fontPreset,
    value,
    textColorOverride,
    layerTextColor,
  }: CustomPrimaryRenderProps,
  { styles, ValueWithUnit }: CustomRendererHelpers,
) {
  return renderSocialPillBadge({
    value,
    fontPreset,
    textColorOverride,
    layerTextColor,
    styles,
    ValueWithUnit,
  });
}

function renderMorningGlassPrimary(
  { fontPreset, value, textColorOverride }: CustomPrimaryRenderProps,
  { styles, ValueWithUnit }: CustomRendererHelpers,
) {
  return (
    <View style={styles.morningDistanceWrap}>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={styles.morningDistanceValue}
        unitStyle={styles.morningDistanceUnit}
        textStyleOverride={textColorOverride}
        unitStyleOverride={textColorOverride}
        numberOfLines={1}
        autoFit
        minimumFontScale={0.78}
      />
    </View>
  );
}

function renderSplitBoldPrimary(
  { fontPreset, value, textColorOverride }: CustomPrimaryRenderProps,
  { styles, SplitBoldPrimaryValue }: CustomRendererHelpers,
) {
  return (
    <View style={styles.splitBoldPrimaryOnly}>
      <SplitBoldPrimaryValue
        value={value}
        fontPreset={fontPreset}
        textStyleOverride={textColorOverride}
      />
    </View>
  );
}

function renderSocialPillBadge({
  value,
  fontPreset,
  textColorOverride,
  layerTextColor,
  styles,
  ValueWithUnit,
}: {
  value: string;
  fontPreset: FontPreset;
  textColorOverride: { color: string } | null;
  layerTextColor?: string;
  styles: any;
  ValueWithUnit: (props: any) => React.JSX.Element;
}) {
  const foregroundColor = layerTextColor ?? '#FFFFFF';

  return (
    <View style={styles.socialPillWrap}>
      <View style={styles.socialPillBubble}>
        <View style={styles.socialPillIconWrap}>
          <MaterialCommunityIcons
            name="heart"
            size={26}
            color={foregroundColor}
          />
        </View>
        <View style={styles.socialPillValueWrap}>
          <ValueWithUnit
            value={value}
            fontPreset={fontPreset}
            valueStyle={styles.socialPillValue}
            unitStyle={styles.socialPillUnit}
            textStyleOverride={textColorOverride}
            unitStyleOverride={textColorOverride}
            numberOfLines={1}
            autoFit={false}
            minimumFontScale={0.9}
          />
        </View>
      </View>
      <View style={styles.socialPillTail} />
    </View>
  );
}

function formatMileRingMetric(metricId: string, value: string) {
  const normalized = value.trim().toUpperCase();
  if (metricId === 'calories') {
    return normalized.endsWith('CAL') ? normalized : `${normalized} CAL`;
  }
  return normalized;
}

function ArcMetricText({
  value,
  fontPreset,
  centerAngle,
  spanDeg,
  orientation,
  color,
  styles,
}: {
  value: string;
  fontPreset: FontPreset;
  centerAngle: number;
  spanDeg: number;
  orientation: 'top' | 'bottom';
  color?: string;
  styles: any;
}) {
  const content = value.replace(/\s+/g, '\u00A0');
  const chars = Array.from(content);
  const center = 160;
  const radius = orientation === 'top' ? 150 : 148;
  const charWidth = 17;
  const charHeight = 24;
  const weights = chars.map((char) => {
    if (char === '\u00A0') return 0.42;
    if (char === '•') return 0.58;
    if (/[0-9]/.test(char)) return 0.96;
    return 0.88;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const totalSpan = Math.max(0, spanDeg);
  let cursor = -totalSpan / 2;

  return (
    <View pointerEvents="none" style={styles.mileRingArcLayer}>
      {chars.map((char, index) => {
        const weight = weights[index] ?? 1;
        const charSpan =
          totalWeight > 0 ? (weight / totalWeight) * totalSpan : 0;
        const angleOffset = cursor + charSpan / 2;
        const angle =
          orientation === 'top'
            ? centerAngle + angleOffset
            : centerAngle - angleOffset;
        cursor += charSpan;
        const theta = (angle * Math.PI) / 180;
        const x = center + radius * Math.cos(theta);
        const y = center + radius * Math.sin(theta);
        const rotation = orientation === 'top' ? angle + 90 : angle - 90;

        return (
          <View
            key={`${char}-${index}-${angle}`}
            style={[
              styles.mileRingArcCharWrap,
              {
                left: x - charWidth / 2,
                top: y - charHeight / 2,
                width: charWidth,
                height: charHeight,
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
          >
            <Text
              style={[
                styles.mileRingArcChar,
                color ? { color } : null,
                char === '•' ? styles.mileRingArcBullet : null,
                { fontFamily: fontPreset.family },
              ]}
            >
              {char}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
