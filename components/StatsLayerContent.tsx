import { StyleSheet, Text, View } from 'react-native';
import { FontPreset, StatsTemplate } from '@/types/preview';

type VisibleFields = {
  title: boolean;
  date: boolean;
  distance: boolean;
  time: boolean;
  pace: boolean;
  elev: boolean;
};

type Props = {
  template: StatsTemplate;
  fontPreset: FontPreset;
  visible: VisibleFields;
  activityName: string;
  dateText: string;
  distanceText: string;
  durationText: string;
  paceText: string;
  elevText: string;
};

export function StatsLayerContent({
  template,
  fontPreset,
  visible,
  activityName,
  dateText,
  distanceText,
  durationText,
  paceText,
  elevText,
}: Props) {
  return (
    <>
      {template.layout === 'row' ? (
        <View style={styles.templateRowLayout}>
          {visible.distance ? (
            <MetricCell label="Distance" value={distanceText} fontPreset={fontPreset} />
          ) : null}
          {visible.time ? (
            <MetricCell label="Time" value={durationText} fontPreset={fontPreset} />
          ) : null}
          {visible.pace ? (
            <MetricCell label="Pace" value={paceText} fontPreset={fontPreset} />
          ) : null}
          {visible.elev ? (
            <MetricCell label="Elev Gain" value={elevText} fontPreset={fontPreset} />
          ) : null}
        </View>
      ) : null}

      {template.layout === 'stack' ? (
        <View style={styles.templateStackLayout}>
          <StackMetric visible={visible.distance} label="Distance" value={distanceText} fontPreset={fontPreset} />
          <StackMetric visible={visible.time} label="Time" value={durationText} fontPreset={fontPreset} />
          <StackMetric visible={visible.pace} label="Pace" value={paceText} fontPreset={fontPreset} />
          <StackMetric visible={visible.elev} label="Elev Gain" value={elevText} fontPreset={fontPreset} />
        </View>
      ) : null}

      {template.layout === 'inline' ? (
        <View style={styles.templateInlineLayout}>
          {visible.distance ? (
            <Text style={[styles.inlineText, { fontFamily: fontPreset.family }]}>
              /\ {distanceText}
            </Text>
          ) : null}
          {visible.time ? (
            <Text style={[styles.inlineText, { fontFamily: fontPreset.family }]}>
              ◷ {durationText}
            </Text>
          ) : null}
          {visible.pace ? (
            <Text style={[styles.inlineText, { fontFamily: fontPreset.family }]}>
              ◔ {paceText}
            </Text>
          ) : null}
          {visible.elev ? (
            <Text style={[styles.inlineText, { fontFamily: fontPreset.family }]}>
              ↯ {elevText}
            </Text>
          ) : null}
        </View>
      ) : null}

      {template.layout === 'right' ? (
        <View style={styles.templateRightLayout}>
          {visible.distance ? (
            <RightMetric value={distanceText} fontPreset={fontPreset} />
          ) : null}
          {visible.time ? <RightMetric value={durationText} fontPreset={fontPreset} /> : null}
          {visible.pace ? <RightMetric value={paceText} fontPreset={fontPreset} /> : null}
          {visible.elev ? <RightMetric value={elevText} fontPreset={fontPreset} /> : null}
        </View>
      ) : null}

      {visible.title && template.layout !== 'stack' ? (
        <Text
          style={[
            styles.blockTitle,
            { fontFamily: fontPreset.family, fontWeight: fontPreset.weightTitle },
          ]}
        >
          {activityName}
        </Text>
      ) : null}

      {visible.date ? (
        <Text style={[styles.dateLine, { fontFamily: fontPreset.family }]}>
          {dateText}
        </Text>
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
      <Text style={[styles.metricLabel, { fontFamily: fontPreset.family }]}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          { fontFamily: fontPreset.family, fontWeight: fontPreset.weightValue },
        ]}
      >
        {value}
      </Text>
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
      <Text style={[styles.metricLabel, { fontFamily: fontPreset.family }]}>{label}</Text>
      <Text
        style={[
          styles.stackValue,
          { fontFamily: fontPreset.family, fontWeight: fontPreset.weightValue },
        ]}
      >
        {value}
      </Text>
    </>
  );
}

function RightMetric({
  value,
  fontPreset,
}: {
  value: string;
  fontPreset: FontPreset;
}) {
  return (
    <Text
      style={[
        styles.rightValue,
        { fontFamily: fontPreset.family, fontWeight: fontPreset.weightValue },
      ]}
    >
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  blockTitle: {
    color: '#E5E7EB',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  dateLine: {
    color: '#CBD5E1',
    marginTop: 10,
    fontSize: 12,
  },
  templateRowLayout: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  templateStackLayout: {
    alignItems: 'center',
    gap: 2,
  },
  stackValue: {
    color: '#FFFFFF',
    fontSize: 26,
    marginBottom: 6,
  },
  templateInlineLayout: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  inlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  templateRightLayout: {
    alignItems: 'flex-end',
    gap: 6,
  },
  rightValue: {
    color: '#FFFFFF',
    fontSize: 28,
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
    fontSize: 18,
  },
});
