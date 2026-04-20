import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import {
  type Metric,
  renderCustomLayout,
  renderCustomPrimary,
} from '@/components/preview/layouts/customRenderers';
import {
  FieldId,
  FontPreset,
  StatsLayout,
  StatsLayoutKind,
  StatsVisibleFields,
} from '@/types/preview';

type Props = {
  template: StatsLayout;
  isCompactViewport?: boolean;
  fontPreset: FontPreset;
  visible: StatsVisibleFields;
  layerTextColor?: string;
  sunsetPrimaryGradient?: [string, string, string];
  primaryInSeparateLayer?: boolean;
  distanceText: string;
  durationText: string;
  paceText: string;
  elevText: string;
  cadenceText: string;
  caloriesText: string;
  avgHeartRateText: string;
};

const TEXT_SHADOW_STYLE = {
  textShadowColor: 'rgba(0,0,0,0.35)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
} as const;

function createRendererHelpers() {
  return {
    styles,
    ValueWithUnit,
    GradientValueWithUnit,
    InlineMetric,
    SplitBoldPrimaryValue,
    metricIcon,
    metricIconColor,
    splitBoldLabel,
    isDefaultSunsetHeroColor,
  };
}

export function StatsLayerContent({
  template,
  isCompactViewport = false,
  fontPreset,
  visible,
  layerTextColor,
  sunsetPrimaryGradient,
  primaryInSeparateLayer = false,
  distanceText,
  durationText,
  paceText,
  elevText,
  cadenceText,
  caloriesText,
  avgHeartRateText,
}: Props) {
  const textColorOverride = layerTextColor ? { color: layerTextColor } : null;
  const metrics = [
    visible.distance
      ? { id: 'distance', label: 'Distance', value: distanceText }
      : null,
    visible.time ? { id: 'time', label: 'Time', value: durationText } : null,
    visible.pace ? { id: 'pace', label: 'Pace', value: paceText } : null,
    visible.elev ? { id: 'elev', label: 'Elev Gain', value: elevText } : null,
    visible.cadence
      ? { id: 'cadence', label: 'Cadence', value: cadenceText }
      : null,
    visible.calories
      ? { id: 'calories', label: 'Calories', value: caloriesText }
      : null,
    visible.avgHr
      ? { id: 'avgHr', label: 'Avg HR', value: avgHeartRateText }
      : null,
  ].filter(Boolean) as Metric[];
  const rendererHelpers = createRendererHelpers();

  const customLayout = renderCustomLayout(
    template.layout,
    {
      template,
      metrics,
      fontPreset,
      isCompactViewport,
      layerTextColor,
      textColorOverride,
      sunsetPrimaryGradient,
      primaryInSeparateLayer,
    },
    rendererHelpers,
  );
  if (customLayout) {
    return customLayout;
  }

  const layoutKind = resolveLayoutKind(template.layout);

  return (
    <>
      {layoutKind === 'row' ? (
        <View style={styles.heroWrap}>
          {metrics[0] ? (
            <View style={styles.heroDistanceWrap}>
              <Text
                style={[
                  styles.heroLabel,
                  textColorOverride,
                  TEXT_SHADOW_STYLE,
                  { fontFamily: fontPreset.family },
                ]}
              >
                {metrics[0].label}
              </Text>
              <ValueWithUnit
                value={metrics[0].value}
                fontPreset={fontPreset}
                valueStyle={styles.heroDistanceValue}
                unitStyle={styles.heroUnit}
                textStyleOverride={textColorOverride}
                unitStyleOverride={textColorOverride}
                numberOfLines={1}
                autoFit={false}
                minimumFontScale={0.86}
              />
            </View>
          ) : null}
          <View style={styles.heroBottomRow}>
            {metrics.slice(1).map((metric) => (
              <MetricCell
                key={metric.id}
                label={metric.label}
                value={metric.value}
                fontPreset={fontPreset}
                labelStyleOverride={textColorOverride}
                valueStyleOverride={textColorOverride}
                unitStyleOverride={textColorOverride}
              />
            ))}
          </View>
        </View>
      ) : null}

      {layoutKind === 'stack' ? (
        <View style={styles.verticalWrap}>
          {metrics.map((metric) => (
            <StackMetric
              key={metric.id}
              label={metric.label}
              value={metric.value}
              fontPreset={fontPreset}
              labelStyleOverride={textColorOverride}
              valueStyleOverride={textColorOverride}
              unitStyleOverride={textColorOverride}
            />
          ))}
        </View>
      ) : null}

      {layoutKind === 'inline' ? (
        <View style={styles.compactWrap}>
          {visible.distance ? (
            <ValueWithUnit
              value={distanceText}
              fontPreset={fontPreset}
              valueStyle={styles.compactDistanceValue}
              unitStyle={styles.compactUnit}
              textStyleOverride={textColorOverride}
              unitStyleOverride={textColorOverride}
              numberOfLines={1}
              autoFit
              minimumFontScale={0.82}
            />
          ) : null}
          <View style={styles.compactRow}>
            {metrics
              .filter((metric) => metric.id !== 'distance')
              .map((metric, index, arr) => (
                <View key={metric.id} style={styles.inlineMetricWrap}>
                  <InlineMetric
                    icon={metricIcon(metric.id)}
                    value={metric.value}
                    fontPreset={fontPreset}
                    iconColor={layerTextColor ?? undefined}
                    textStyleOverride={textColorOverride}
                    unitStyleOverride={textColorOverride}
                  />
                  {index < arr.length - 1 ? (
                    <Text style={[styles.separator, textColorOverride]}>|</Text>
                  ) : null}
                </View>
              ))}
          </View>
        </View>
      ) : null}

      {layoutKind === 'right' ? (
        <View style={styles.columnsWrap}>
          {metrics.map((metric) => (
            <ColumnMetric
              key={metric.id}
              label={metric.label}
              value={metric.value}
              fontPreset={fontPreset}
              labelStyleOverride={textColorOverride}
              valueStyleOverride={textColorOverride}
              unitStyleOverride={textColorOverride}
            />
          ))}
        </View>
      ) : null}

      {layoutKind === 'grid' ? (
        <View style={styles.gridRows}>
          {metrics.map((metric) => (
            <GridMetric
              key={metric.id}
              label={metric.label}
              value={metric.value}
              fontPreset={fontPreset}
              columnCount={metrics.length >= 3 ? 2 : 1}
              isPanelGrid={template.layout === 'panel-grid'}
              labelStyleOverride={textColorOverride}
              valueStyleOverride={textColorOverride}
              unitStyleOverride={textColorOverride}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function resolveLayoutKind(layout: StatsLayoutKind) {
  switch (layout) {
    case 'hero':
    case 'glass-row':
      return 'row' as const;
    case 'vertical':
    case 'soft-stack':
      return 'stack' as const;
    case 'compact':
    case 'pill-inline':
      return 'inline' as const;
    case 'columns':
    case 'card-columns':
      return 'right' as const;
    case 'grid-2x2':
    case 'panel-grid':
    default:
      return 'grid' as const;
  }
}

function InlineMetric({
  icon,
  value,
  fontPreset,
  iconColor = '#FFFFFF',
  iconSize = 14,
  textStyle,
  unitStyle,
  textStyleOverride,
  unitStyleOverride,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  fontPreset: FontPreset;
  iconColor?: string;
  iconSize?: number;
  textStyle?: any;
  unitStyle?: any;
  textStyleOverride?: any;
  unitStyleOverride?: any;
}) {
  const { main, unit } = splitMetricValue(value);
  return (
    <View style={[styles.inlineMetric, styles.inlineMetricNoWrap]}>
      <MaterialCommunityIcons
        name={icon}
        size={iconSize}
        color={iconColor}
        style={styles.inlineMetricIcon}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.68}
        style={[
          styles.inlineText,
          styles.inlineMetricValueText,
          textStyle,
          textStyleOverride,
          { fontFamily: fontPreset.family },
        ]}
      >
        {main}
        {unit ? (
          <Text
            style={[
              styles.inlineUnit,
              unitStyle,
              unitStyleOverride,
              { fontFamily: fontPreset.family },
            ]}
          >
            {'\u00A0'}
            {unit}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

function MetricCell({
  label,
  value,
  fontPreset,
  labelStyleOverride,
  valueStyleOverride,
  unitStyleOverride,
}: {
  label: string;
  value: string;
  fontPreset: FontPreset;
  labelStyleOverride?: any;
  valueStyleOverride?: any;
  unitStyleOverride?: any;
}) {
  return (
    <View style={styles.metricCell}>
      <Text
        style={[
          styles.metricLabel,
          labelStyleOverride,
          { fontFamily: fontPreset.family },
        ]}
      >
        {label}
      </Text>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={styles.metricValue}
        unitStyle={styles.metricUnit}
        textStyleOverride={valueStyleOverride}
        unitStyleOverride={unitStyleOverride}
        numberOfLines={1}
        autoFit
        minimumFontScale={0.82}
      />
    </View>
  );
}

function StackMetric({
  label,
  value,
  fontPreset,
  labelStyleOverride,
  valueStyleOverride,
  unitStyleOverride,
}: {
  label: string;
  value: string;
  fontPreset: FontPreset;
  labelStyleOverride?: any;
  valueStyleOverride?: any;
  unitStyleOverride?: any;
}) {
  return (
    <>
      <Text
        style={[
          styles.metricLabel,
          labelStyleOverride,
          { fontFamily: fontPreset.family },
        ]}
      >
        {label}
      </Text>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={styles.verticalValue}
        unitStyle={styles.verticalUnit}
        textStyleOverride={valueStyleOverride}
        unitStyleOverride={unitStyleOverride}
        numberOfLines={1}
        autoFit
        minimumFontScale={0.82}
      />
    </>
  );
}

function metricIcon(
  metricId: string,
): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (metricId) {
    case 'time':
      return 'clock-outline';
    case 'pace':
      return 'speedometer';
    case 'elev':
      return 'arrow-up-bold';
    case 'cadence':
      return 'walk';
    case 'calories':
      return 'fire';
    case 'avgHr':
      return 'heart-pulse';
    default:
      return 'information-outline';
  }
}

function metricIconColor(metricId: string) {
  switch (metricId) {
    case 'avgHr':
      return '#FF6666';
    case 'calories':
      return '#FFB347';
    default:
      return '#FFFFFF';
  }
}

function splitBoldLabel(metricId: string) {
  switch (metricId) {
    case 'time':
      return 'TIME';
    case 'pace':
      return 'PACE';
    case 'elev':
      return 'GAIN';
    case 'avgHr':
      return 'HR';
    case 'calories':
      return 'CAL';
    case 'cadence':
      return 'CAD';
    default:
      return metricId.toUpperCase();
  }
}

export function PrimaryStatLayerContent({
  template,
  fontPreset,
  primaryField: _primaryField,
  value,
  layerTextColor,
  sunsetPrimaryGradient,
}: {
  template: StatsLayout;
  fontPreset: FontPreset;
  primaryField: FieldId;
  value: string;
  layerTextColor?: string;
  sunsetPrimaryGradient?: [string, string, string];
}) {
  const textColorOverride = layerTextColor ? { color: layerTextColor } : null;
  const rendererHelpers = createRendererHelpers();
  const customPrimary = renderCustomPrimary(
    template.layout,
    {
      template,
      fontPreset,
      value,
      layerTextColor,
      textColorOverride,
      sunsetPrimaryGradient,
    },
    rendererHelpers,
  );
  if (customPrimary) {
    return customPrimary;
  }

  return null;
}

function ColumnMetric({
  label,
  value,
  fontPreset,
  labelStyleOverride,
  valueStyleOverride,
  unitStyleOverride,
}: {
  label: string;
  value: string;
  fontPreset: FontPreset;
  labelStyleOverride?: any;
  valueStyleOverride?: any;
  unitStyleOverride?: any;
}) {
  return (
    <View style={styles.columnItem}>
      <Text
        style={[
          styles.metricLabel,
          labelStyleOverride,
          { fontFamily: fontPreset.family },
        ]}
      >
        {label}
      </Text>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={styles.columnValue}
        unitStyle={styles.columnUnit}
        textStyleOverride={valueStyleOverride}
        unitStyleOverride={unitStyleOverride}
        numberOfLines={1}
        autoFit
        minimumFontScale={0.68}
      />
    </View>
  );
}

function GridMetric({
  label,
  value,
  fontPreset,
  columnCount,
  isPanelGrid = false,
  labelStyleOverride,
  valueStyleOverride,
  unitStyleOverride,
}: {
  label: string;
  value: string;
  fontPreset: FontPreset;
  columnCount: 1 | 2;
  isPanelGrid?: boolean;
  labelStyleOverride?: any;
  valueStyleOverride?: any;
  unitStyleOverride?: any;
}) {
  return (
    <View style={[styles.gridItem, columnCount === 1 && styles.gridItemSingle]}>
      <Text
        style={[
          isPanelGrid ? styles.panelGridLabel : styles.gridLabel,
          labelStyleOverride,
          { fontFamily: fontPreset.family },
        ]}
      >
        {label}
      </Text>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={isPanelGrid ? styles.panelGridValue : styles.gridValue}
        unitStyle={isPanelGrid ? styles.panelGridUnit : styles.gridUnit}
        textStyleOverride={valueStyleOverride}
        unitStyleOverride={unitStyleOverride}
        numberOfLines={1}
        autoFit
        minimumFontScale={isPanelGrid ? 0.9 : 0.86}
      />
    </View>
  );
}

function ValueWithUnit({
  value,
  fontPreset,
  valueStyle,
  unitStyle,
  textStyleOverride,
  unitStyleOverride,
  numberOfLines,
  autoFit = true,
  minimumFontScale = 0.8,
}: {
  value: string;
  fontPreset: FontPreset;
  valueStyle: any;
  unitStyle: any;
  textStyleOverride?: any;
  unitStyleOverride?: any;
  numberOfLines?: number;
  autoFit?: boolean;
  minimumFontScale?: number;
}) {
  const { main, unit } = splitMetricValue(value);
  const isTimesFamily = (fontPreset.family ?? '')
    .toLowerCase()
    .includes('times');
  const effectiveMinimumFontScale = isTimesFamily
    ? Math.max(minimumFontScale, 0.92)
    : minimumFontScale;
  const effectiveAdjustsFontSizeToFit = isTimesFamily
    ? false
    : Boolean(numberOfLines) && autoFit;

  return (
    <Text
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={effectiveAdjustsFontSizeToFit}
      minimumFontScale={effectiveMinimumFontScale}
      style={[
        valueStyle,
        textStyleOverride,
        TEXT_SHADOW_STYLE,
        { fontFamily: fontPreset.family, fontWeight: fontPreset.weightValue },
      ]}
    >
      {main}
      {unit ? (
        <Text
          style={[
            unitStyle,
            unitStyleOverride,
            TEXT_SHADOW_STYLE,
            { fontFamily: fontPreset.family },
          ]}
        >
          {'\u00A0'}
          {unit}
        </Text>
      ) : null}
    </Text>
  );
}

function splitMetricValue(value: string) {
  const normalized = value.trim();
  const match = normalized.match(
    /^(.*?)(?:\s*)(\/km|\/mi|km|mi|m|bpm|spm|rpm)$/i,
  );
  if (!match) return { main: normalized, unit: '' };
  return { main: match[1], unit: match[2] };
}

function SplitBoldPrimaryValue({
  value,
  fontPreset,
  textStyleOverride,
}: {
  value: string;
  fontPreset: FontPreset;
  textStyleOverride?: any;
}) {
  const { main: leftMain, unit: leftUnitRaw } = splitMetricValue(value);
  const leftMainLines = leftMain.includes('.')
    ? leftMain.split('.')
    : [leftMain];
  const leftUnit = leftUnitRaw ? leftUnitRaw.toUpperCase() : '';

  return (
    <>
      {leftMainLines.map((line, index) => (
        <Text
          key={`${line}-${index}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.45}
          style={[
            styles.splitBoldLeftValue,
            textStyleOverride,
            {
              fontFamily: fontPreset.family,
              fontWeight: fontPreset.weightValue,
            },
          ]}
        >
          {line}
        </Text>
      ))}
      {leftUnit ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={[
            styles.splitBoldLeftUnit,
            textStyleOverride,
            {
              fontFamily: fontPreset.family,
              fontWeight: fontPreset.weightValue,
            },
          ]}
        >
          {leftUnit}
        </Text>
      ) : null}
    </>
  );
}

function GradientValueWithUnit({
  value,
  fontPreset,
  unitStyle,
  valueStyleOverride,
  disableGradient = false,
  gradientColors,
}: {
  value: string;
  fontPreset: FontPreset;
  unitStyle?: any;
  valueStyleOverride?: any;
  disableGradient?: boolean;
  gradientColors?: [string, string, string];
}) {
  const { main, unit } = splitMetricValue(value);
  const estimatedMaskWidth = Math.max(
    130,
    Math.min(300, Math.round(main.length * 52)),
  );

  return (
    <View style={styles.sunsetDistanceGradientRow}>
      {disableGradient ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={[
            styles.morningDistanceValue,
            valueStyleOverride,
            TEXT_SHADOW_STYLE,
            {
              fontFamily: fontPreset.family,
              fontWeight: fontPreset.weightValue,
            },
          ]}
        >
          {main}
        </Text>
      ) : (
        <MaskedView
          style={[styles.sunsetDistanceMasked, { width: estimatedMaskWidth }]}
          maskElement={
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={[
                styles.morningDistanceValue,
                {
                  fontFamily: fontPreset.family,
                  fontWeight: fontPreset.weightValue,
                },
              ]}
            >
              {main}
            </Text>
          }
        >
          <LinearGradient
            colors={gradientColors ?? ['#FFF4B5', '#FFC84A', '#FF8A00']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.sunsetDistanceGradientFill}
          />
        </MaskedView>
      )}
      {unit ? (
        <Text
          style={[
            styles.morningDistanceUnit,
            styles.sunsetDistanceUnitAdjust,
            unitStyle,
            TEXT_SHADOW_STYLE,
            { fontFamily: fontPreset.family },
          ]}
        >
          {'\u00A0'}
          {unit}
        </Text>
      ) : null}
    </View>
  );
}

function isDefaultSunsetHeroColor(color: string) {
  const normalized = color.trim().toUpperCase();
  return normalized === '#FFFFFF' || normalized === '#FFF';
}

const styles = StyleSheet.create({
  heroWrap: { width: '100%', alignItems: 'center', gap: 12 },
  heroDistanceWrap: { alignItems: 'center', width: '100%' },
  heroLabel: { color: '#FFFFFF', fontSize: 22, marginBottom: 4 },
  heroDistanceValue: {
    color: '#FFFFFF',
    fontSize: 48,
    lineHeight: 54,
    width: '100%',
    textAlign: 'center',
  },
  heroUnit: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
  heroBottomRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  verticalWrap: { alignItems: 'center', gap: 8 },
  verticalValue: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 4,
  },
  verticalUnit: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  compactWrap: { width: '100%', alignItems: 'center', gap: 8 },
  compactDistanceValue: { color: '#FFFFFF', fontSize: 48, lineHeight: 54 },
  compactUnit: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  compactRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  inlineMetricWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineMetricNoWrap: { flexShrink: 1, minWidth: 0 },
  inlineMetricIcon: { marginTop: 1 },
  inlineMetricValueText: { flexShrink: 1, minWidth: 0 },
  inlineText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  inlineUnit: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  separator: { color: '#FFFFFF', fontSize: 20, marginHorizontal: 2 },
  columnsWrap: {
    width: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    gap: 0,
  },
  metricCell: { flex: 1, alignItems: 'center' },
  metricLabel: { color: '#FFFFFF', fontSize: 13, marginBottom: 2 },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    width: '100%',
    textAlign: 'center',
  },
  metricUnit: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  columnItem: { flex: 1, alignItems: 'center' },
  columnValue: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    width: '100%',
    textAlign: 'center',
  },
  columnUnit: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  gridRows: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 0,
    gap: 0,
    alignItems: 'flex-start',
  },
  gridItem: { width: '48%', alignItems: 'center' },
  gridItemSingle: { width: '100%' },
  gridLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  gridValue: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
    textAlign: 'center',
    width: '100%',
  },
  gridUnit: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  panelGridLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  panelGridValue: {
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 31,
    textAlign: 'center',
    width: '100%',
  },
  panelGridUnit: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  morningWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  morningWrapSecondaryOnly: {
    paddingTop: 0,
  },
  morningDistanceWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  morningDistanceValue: {
    color: '#FFFFFF',
    fontSize: 94,
    lineHeight: 108,
    letterSpacing: -2,
    paddingTop: 2,
  },
  morningDistanceUnit: {
    color: '#FFFFFF',
    fontSize: 38,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  morningTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 0,
  },
  morningBottomRow: {
    width: '66%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 0,
  },
  morningTopCard: {
    width: '33.333%',
    minHeight: 64,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    backgroundColor: 'rgba(24,22,30,0.34)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  morningBottomCard: {
    width: '50%',
    minHeight: 64,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    backgroundColor: 'rgba(24,22,30,0.34)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  morningCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  morningCardUnit: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  splitBoldWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  splitBoldWrapSecondaryOnly: {
    justifyContent: 'flex-end',
  },
  splitBoldLeft: {
    width: '56%',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  splitBoldLeftValue: {
    color: '#FFFFFF',
    fontSize: 136,
    lineHeight: 144,
    letterSpacing: -6,
    fontWeight: '700',
    fontStyle: 'italic',
    paddingTop: 8,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  splitBoldLeftUnit: {
    color: '#FFFFFF',
    fontSize: 110,
    lineHeight: 120,
    letterSpacing: -3,
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: -12,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  splitBoldRight: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingRight: 2,
    paddingVertical: 6,
  },
  splitBoldPrimaryOnly: {
    width: '100%',
    justifyContent: 'center',
    textAlign: 'left',
    paddingLeft: 2,
  },
  signalBoardWrap: {
    width: '100%',
    gap: 12,
  },
  signalBoardTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  signalBoardHero: {
    flex: 1,
    minHeight: 126,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: 'rgba(8,12,20,0.58)',
    justifyContent: 'space-between',
  },
  signalBoardEyebrow: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  signalBoardHeroValue: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -2.6,
  },
  signalBoardHeroUnit: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  signalBoardStack: {
    width: 122,
    gap: 10,
  },
  signalBoardMiniCard: {
    flex: 1,
    minHeight: 62,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'space-between',
  },
  signalBoardMiniLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  signalBoardMiniValue: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
  },
  signalBoardMiniUnit: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  signalBoardRail: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,12,20,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  signalBoardRailItem: {
    flex: 1,
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  signalBoardRailDivider: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  signalBoardRailLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  signalBoardRailValue: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
  },
  signalBoardRailUnit: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  socialPillWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 12,
    alignSelf: 'center',
  },
  socialPillBubble: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: '#FF1F4B',
    paddingHorizontal: 18,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.28)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 12,
    alignSelf: 'center',
    zIndex: 1,
  },
  socialPillMetric: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 2,
    flexDirection: 'row',
    gap: 7,
    alignSelf: 'center',
  },
  socialPillIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: -1,
  },
  socialPillValueWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  socialPillValue: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.35,
  },
  socialPillUnit: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.35,
    fontWeight: '700',
  },
  socialPillTail: {
    position: 'absolute',
    bottom: 5,
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#FF1F4B',
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  mileRingWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  mileRingArcValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  mileRingBody: {
    width: 320,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mileRingArcLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 320,
    height: 320,
    zIndex: 2,
  },
  mileRingArcCharWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mileRingArcChar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.15,
    textAlign: 'center',
  },
  mileRingArcBullet: {
    letterSpacing: -0.4,
  },
  mileRingCircle: {
    width: 276,
    height: 276,
    borderRadius: 999,
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  mileRingPrimaryInline: {
    width: '74%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mileRingPrimaryValue: {
    color: '#FFFFFF',
    fontSize: 82,
    lineHeight: 90,
    letterSpacing: -3,
    textAlign: 'center',
  },
  mileRingPrimaryUnit: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  splitBoldMetric: {
    marginBottom: 4,
  },
  splitBoldMetricLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  splitBoldMetricValue: {
    color: '#FFFFFF',
    fontSize: 56,
    lineHeight: 66,
    paddingTop: 3,
  },
  splitBoldMetricUnit: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  sunsetWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  sunsetDistanceWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  sunsetDistanceGradientRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sunsetDistanceMasked: {
    height: 112,
    justifyContent: 'flex-end',
  },
  sunsetDistanceGradientFill: { flex: 1 },
  sunsetDistanceUnitAdjust: {
    marginBottom: 20,
  },
  sunsetGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    columnGap: 0,
  },
  sunsetCard: {
    width: '49%',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(10,8,18,0.42)',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunsetCardLabel: {
    color: 'rgba(240,240,248,0.72)',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sunsetCardValueCompact: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
  },
  sunsetCardUnitCompact: {
    color: '#FFFFFF',
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  sunsetCardValueDesktop: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    textAlign: 'center',
  },
  sunsetCardUnitDesktop: {
    color: '#FFFFFF',
    fontSize: 17,
    fontStyle: 'italic',
    fontWeight: '700',
  },
});
