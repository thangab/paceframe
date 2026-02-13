import { StyleSheet, Text, View } from 'react-native';
import { FontPreset, StatsTemplate } from '@/types/preview';

type VisibleFields = {
  distance: boolean;
  time: boolean;
  pace: boolean;
  elev: boolean;
};

type Props = {
  template: StatsTemplate;
  fontPreset: FontPreset;
  visible: VisibleFields;
  distanceText: string;
  durationText: string;
  paceText: string;
  elevText: string;
};

export function StatsLayerContent({
  template,
  fontPreset,
  visible,
  distanceText,
  durationText,
  paceText,
  elevText,
}: Props) {
  return (
    <>
      {template.layout === 'row' ? (
        <View style={styles.heroWrap}>
          {visible.distance ? (
            <View style={styles.heroDistanceWrap}>
              <Text
                style={[styles.heroLabel, { fontFamily: fontPreset.family }]}
              >
                Distance
              </Text>
              <ValueWithUnit
                value={distanceText}
                fontPreset={fontPreset}
                valueStyle={styles.heroDistanceValue}
                unitStyle={styles.heroUnit}
                numberOfLines={1}
                autoFit
                minimumFontScale={0.55}
              />
            </View>
          ) : null}
          <View style={styles.heroBottomRow}>
            {visible.time ? (
              <MetricCell
                label="Time"
                value={durationText}
                fontPreset={fontPreset}
              />
            ) : null}
            {visible.pace ? (
              <MetricCell
                label="Pace"
                value={paceText}
                fontPreset={fontPreset}
              />
            ) : null}
            {visible.elev ? (
              <MetricCell
                label="Elev Gain"
                value={elevText}
                fontPreset={fontPreset}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {template.layout === 'stack' ? (
        <View style={styles.verticalWrap}>
          <StackMetric
            visible={visible.distance}
            label="Distance"
            value={distanceText}
            fontPreset={fontPreset}
          />
          <StackMetric
            visible={visible.time}
            label="Time"
            value={durationText}
            fontPreset={fontPreset}
          />
          <StackMetric
            visible={visible.pace}
            label="Pace"
            value={paceText}
            fontPreset={fontPreset}
          />
          <StackMetric
            visible={visible.elev}
            label="Elev Gain"
            value={elevText}
            fontPreset={fontPreset}
          />
        </View>
      ) : null}

      {template.layout === 'inline' ? (
        <View style={styles.compactWrap}>
          {visible.distance ? (
            <ValueWithUnit
              value={distanceText}
              fontPreset={fontPreset}
              valueStyle={styles.compactDistanceValue}
              unitStyle={styles.compactUnit}
            />
          ) : null}
          <View style={styles.compactRow}>
            {visible.time ? (
              <Text
                style={[styles.inlineText, { fontFamily: fontPreset.family }]}
              >
                ◷ {durationText}
              </Text>
            ) : null}
            {visible.time && (visible.pace || visible.elev) ? (
              <Text
                style={[styles.separator, { fontFamily: fontPreset.family }]}
              >
                |
              </Text>
            ) : null}
            {visible.pace ? (
              <Text
                style={[
                  styles.inlineText,
                  {
                    fontFamily: fontPreset.family,
                    fontWeight: fontPreset.weightValue,
                  },
                ]}
              >
                {'◔ '}
                {splitMetricValue(paceText).main}
                <Text
                  style={[styles.inlineUnit, { fontFamily: fontPreset.family }]}
                >
                  {' '}
                  {splitMetricValue(paceText).unit}
                </Text>
              </Text>
            ) : null}
            {visible.pace && visible.elev ? (
              <Text
                style={[styles.separator, { fontFamily: fontPreset.family }]}
              >
                |
              </Text>
            ) : null}
            {visible.elev ? (
              <Text
                style={[
                  styles.inlineText,
                  {
                    fontFamily: fontPreset.family,
                    fontWeight: fontPreset.weightValue,
                  },
                ]}
              >
                {'↯ '}
                {splitMetricValue(elevText).main}
                <Text
                  style={[styles.inlineUnit, { fontFamily: fontPreset.family }]}
                >
                  {' '}
                  {splitMetricValue(elevText).unit}
                </Text>
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {template.layout === 'right' ? (
        <View style={styles.columnsWrap}>
          {visible.distance ? (
            <ColumnMetric
              label="Distance"
              value={distanceText}
              fontPreset={fontPreset}
            />
          ) : null}
          {visible.time ? (
            <ColumnMetric
              label="Time"
              value={durationText}
              fontPreset={fontPreset}
            />
          ) : null}
          {visible.pace ? (
            <ColumnMetric
              label="Pace"
              value={paceText}
              fontPreset={fontPreset}
            />
          ) : null}
          {visible.elev ? (
            <ColumnMetric
              label="Elev Gain"
              value={elevText}
              fontPreset={fontPreset}
            />
          ) : null}
        </View>
      ) : null}

      {template.layout === 'grid' ? (
        <View style={styles.gridRows}>
          {(() => {
            const metrics = [
              visible.distance
                ? { id: 'distance', label: 'Distance', value: distanceText }
                : null,
              visible.pace ? { id: 'pace', label: 'Pace', value: paceText } : null,
              visible.time ? { id: 'time', label: 'Time', value: durationText } : null,
              visible.elev ? { id: 'elev', label: 'Elev Gain', value: elevText } : null,
            ].filter(Boolean) as { id: string; label: string; value: string }[];

            const singleMetric = metrics.length === 1;
            return metrics.map((metric) => (
            <GridMetric
              key={metric.id}
              label={metric.label}
              value={metric.value}
              fontPreset={fontPreset}
              singleMetric={singleMetric}
            />
            ));
          })()}
        </View>
      ) : null}
    </>
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
        autoFit={false}
      />
    </View>
  );
}

function StackMetric({
  visible,
  label,
  value,
  fontPreset,
}: {
  visible: boolean;
  label: string;
  value: string;
  fontPreset: FontPreset;
}) {
  if (!visible) return null;
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
        autoFit={false}
      />
    </>
  );
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
  singleMetric,
}: {
  label: string;
  value: string;
  fontPreset: FontPreset;
  singleMetric?: boolean;
}) {
  return (
    <View style={[styles.gridItem, singleMetric && styles.gridItemSingle]}>
      <Text style={[styles.gridLabel, { fontFamily: fontPreset.family }]}>
        {label}
      </Text>
      <ValueWithUnit
        value={value}
        fontPreset={fontPreset}
        valueStyle={styles.gridValue}
        unitStyle={styles.gridUnit}
        numberOfLines={1}
        autoFit={!singleMetric}
        minimumFontScale={0.84}
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
  return (
    <Text
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={Boolean(numberOfLines) && autoFit}
      minimumFontScale={minimumFontScale}
      style={[
        valueStyle,
        { fontFamily: fontPreset.family, fontWeight: fontPreset.weightValue },
      ]}
    >
      {main}
      {unit ? (
        <Text style={[unitStyle, { fontFamily: fontPreset.family }]}>
          {' '}
          {unit}
        </Text>
      ) : null}
    </Text>
  );
}

function splitMetricValue(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^(.*?)(?:\s*)(\/km|\/mi|km|mi|m)$/i);
  if (!match) return { main: normalized, unit: '' };
  return { main: match[1], unit: match[2] };
}

const styles = StyleSheet.create({
  heroWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  heroDistanceWrap: {
    alignItems: 'center',
  },
  heroLabel: {
    color: '#D1D5DB',
    fontSize: 22,
    marginBottom: 4,
  },
  heroDistanceValue: {
    color: '#FFFFFF',
    fontSize: 48,
    lineHeight: 54,
  },
  heroUnit: {
    color: '#D1D5DB',
    fontSize: 22,
    fontWeight: '600',
  },
  heroBottomRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  verticalWrap: {
    alignItems: 'center',
    gap: 8,
  },
  verticalValue: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 4,
  },
  verticalUnit: {
    color: '#D1D5DB',
    fontSize: 20,
    fontWeight: '600',
  },
  compactWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  compactDistanceValue: {
    color: '#FFFFFF',
    fontSize: 48,
    lineHeight: 54,
  },
  compactUnit: {
    color: '#D1D5DB',
    fontSize: 20,
    fontWeight: '600',
  },
  compactRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inlineUnit: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 20,
    marginHorizontal: 2,
  },
  columnsWrap: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    marginBottom: 2,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
  },
  metricUnit: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
  },
  columnItem: {
    flex: 1,
    alignItems: 'center',
  },
  columnValue: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
  },
  columnUnit: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  gridRows: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 18,
    gap: 10,
    alignItems: 'flex-start',
  },
  gridItem: {
    width: '48%',
    alignItems: 'center',
  },
  gridItemSingle: {
    width: '100%',
  },
  gridLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  gridValue: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
  },
  gridUnit: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: '600',
  },
});
