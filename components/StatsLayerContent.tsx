import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { FieldId, FontPreset, StatsTemplate } from '@/types/preview';

type VisibleFields = {
  distance: boolean;
  time: boolean;
  pace: boolean;
  elev: boolean;
  cadence: boolean;
  calories: boolean;
  avgHr: boolean;
};

type Props = {
  template: StatsTemplate;
  fontPreset: FontPreset;
  visible: VisibleFields;
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

export function StatsLayerContent({
  template,
  fontPreset,
  visible,
  primaryInSeparateLayer = false,
  distanceText,
  durationText,
  paceText,
  elevText,
  cadenceText,
  caloriesText,
  avgHeartRateText,
}: Props) {
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
  ].filter(Boolean) as { id: string; label: string; value: string }[];

  if (template.layout === 'sunset-hero') {
    return (
      <View style={styles.sunsetWrap}>
        {!primaryInSeparateLayer && metrics[0] ? (
          <View style={styles.morningDistanceWrap}>
            <GradientValueWithUnit
              value={metrics[0].value}
              fontPreset={fontPreset}
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
                    { fontFamily: fontPreset.family },
                  ]}
                >
                  {metric.label.toUpperCase()}
                </Text>
                <ValueWithUnit
                  value={metric.value}
                  fontPreset={fontPreset}
                  valueStyle={styles.sunsetCardValue}
                  unitStyle={styles.sunsetCardUnit}
                  numberOfLines={1}
                  autoFit={false}
                  minimumFontScale={1}
                />
              </View>
            ))}
        </View>
      </View>
    );
  }

  if (template.layout === 'morning-glass') {
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
                  iconColor={metricIconColor(metric.id)}
                  iconSize={22}
                  textStyle={styles.morningCardValue}
                  unitStyle={styles.morningCardUnit}
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
                  iconColor={metricIconColor(metric.id)}
                  iconSize={22}
                  textStyle={styles.morningCardValue}
                  unitStyle={styles.morningCardUnit}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  if (template.layout === 'split-bold') {
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
            />
          </View>
        ) : null}
        <View style={styles.splitBoldRight}>
          {secondary.slice(0, 5).map((metric) => (
            <View key={metric.id} style={styles.splitBoldMetric}>
              <Text
                style={[
                  styles.splitBoldMetricLabel,
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
                  />
                  {index < arr.length - 1 ? (
                    <Text style={styles.separator}>|</Text>
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
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function resolveLayoutKind(layout: StatsTemplate['layout']) {
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
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  fontPreset: FontPreset;
  iconColor?: string;
  iconSize?: number;
  textStyle?: any;
  unitStyle?: any;
}) {
  const { main, unit } = splitMetricValue(value);
  return (
    <View style={styles.inlineMetric}>
      <MaterialCommunityIcons
        name={icon}
        size={iconSize}
        color={iconColor}
        style={styles.inlineMetricIcon}
      />
      <Text
        style={[
          styles.inlineText,
          textStyle,
          { fontFamily: fontPreset.family },
        ]}
      >
        {main}
        {unit ? (
          <Text
            style={[
              styles.inlineUnit,
              unitStyle,
              { fontFamily: fontPreset.family },
            ]}
          >
            {' '}
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
}: {
  label: string;
  value: string;
  fontPreset: FontPreset;
}) {
  return (
    <View style={styles.metricCell}>
      <Text style={[styles.metricLabel, { fontFamily: fontPreset.family }]}>
        {label}
      </Text>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={styles.metricValue}
        unitStyle={styles.metricUnit}
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
}: {
  label: string;
  value: string;
  fontPreset: FontPreset;
}) {
  return (
    <>
      <Text style={[styles.metricLabel, { fontFamily: fontPreset.family }]}>
        {label}
      </Text>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={styles.verticalValue}
        unitStyle={styles.verticalUnit}
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
  primaryField,
  value,
}: {
  template: StatsTemplate;
  fontPreset: FontPreset;
  primaryField: FieldId;
  value: string;
}) {
  if (template.layout === 'sunset-hero') {
    return (
      <View style={styles.morningDistanceWrap}>
        <GradientValueWithUnit value={value} fontPreset={fontPreset} />
      </View>
    );
  }

  if (template.layout === 'morning-glass') {
    return (
      <View style={styles.morningDistanceWrap}>
        <ValueWithUnit
          value={value}
          fontPreset={fontPreset}
          valueStyle={styles.morningDistanceValue}
          unitStyle={styles.morningDistanceUnit}
          numberOfLines={1}
          autoFit
          minimumFontScale={0.78}
        />
      </View>
    );
  }

  if (template.layout === 'split-bold') {
    return (
      <View style={styles.splitBoldPrimaryOnly}>
        <SplitBoldPrimaryValue value={value} fontPreset={fontPreset} />
      </View>
    );
  }

  return null;
}

function ColumnMetric({
  label,
  value,
  fontPreset,
}: {
  label: string;
  value: string;
  fontPreset: FontPreset;
}) {
  return (
    <View style={styles.columnItem}>
      <Text style={[styles.metricLabel, { fontFamily: fontPreset.family }]}>
        {label}
      </Text>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={styles.columnValue}
        unitStyle={styles.columnUnit}
      />
    </View>
  );
}

function GridMetric({
  label,
  value,
  fontPreset,
  columnCount,
}: {
  label: string;
  value: string;
  fontPreset: FontPreset;
  columnCount: 1 | 2;
}) {
  return (
    <View style={[styles.gridItem, columnCount === 1 && styles.gridItemSingle]}>
      <Text style={[styles.gridLabel, { fontFamily: fontPreset.family }]}>
        {label}
      </Text>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={styles.gridValue}
        unitStyle={styles.gridUnit}
      />
    </View>
  );
}

function ValueWithUnit({
  value,
  fontPreset,
  valueStyle,
  unitStyle,
  numberOfLines,
  autoFit = true,
  minimumFontScale = 0.8,
}: {
  value: string;
  fontPreset: FontPreset;
  valueStyle: any;
  unitStyle: any;
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
        TEXT_SHADOW_STYLE,
        { fontFamily: fontPreset.family, fontWeight: fontPreset.weightValue },
      ]}
    >
      {main}
      {unit ? (
        <Text
          style={[
            unitStyle,
            TEXT_SHADOW_STYLE,
            { fontFamily: fontPreset.family },
          ]}
        >
          {' '}
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
}: {
  value: string;
  fontPreset: FontPreset;
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
          style={[
            styles.splitBoldLeftValue,
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
          style={[
            styles.splitBoldLeftUnit,
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
}: {
  value: string;
  fontPreset: FontPreset;
}) {
  const { main, unit } = splitMetricValue(value);
  const estimatedMaskWidth = Math.max(
    130,
    Math.min(300, Math.round(main.length * 52)),
  );

  return (
    <View style={styles.sunsetDistanceGradientRow}>
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
          colors={['#FFF4B5', '#FFC84A', '#FF8A00']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.sunsetDistanceGradientFill}
        />
      </MaskedView>
      {unit ? (
        <Text
          style={[
            styles.morningDistanceUnit,
            styles.sunsetDistanceUnitAdjust,
            TEXT_SHADOW_STYLE,
            { fontFamily: fontPreset.family },
          ]}
        >
          {' '}
          {unit}
        </Text>
      ) : null}
    </View>
  );
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
    flexWrap: 'wrap',
  },
  inlineMetricWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineMetricIcon: { marginTop: 1 },
  inlineText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  inlineUnit: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  separator: { color: '#FFFFFF', fontSize: 20, marginHorizontal: 2 },
  columnsWrap: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricCell: { flex: 1, alignItems: 'center' },
  metricLabel: { color: '#FFFFFF', fontSize: 13, marginBottom: 2 },
  metricValue: { color: '#FFFFFF', fontSize: 20, lineHeight: 24 },
  metricUnit: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  columnItem: { flex: 1, alignItems: 'center' },
  columnValue: { color: '#FFFFFF', fontSize: 16, lineHeight: 20 },
  columnUnit: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  gridRows: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 14,
    gap: 10,
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
    color: 'rgba(255,255,255,0.6)',
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
    color: 'rgba(255,255,255,0.6)',
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
    paddingLeft: 2,
  },
  splitBoldMetric: {
    marginBottom: 4,
  },
  splitBoldMetricLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 20,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  splitBoldMetricValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 56,
    lineHeight: 66,
    paddingTop: 3,
  },
  splitBoldMetricUnit: {
    color: 'rgba(255,255,255,0.6)',
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
    columnGap: 8,
  },
  sunsetCard: {
    width: '48.5%',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
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
  sunsetCardValue: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 36,
    textAlign: 'center',
  },
  sunsetCardUnit: {
    color: '#FFFFFF',
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '700',
  },
});
