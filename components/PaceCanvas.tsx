import { useMemo } from 'react';
import {
  Canvas,
  Fill,
  Group,
  LinearGradient,
  Path,
  RoundedRect,
  Skia,
  Text,
  matchFont,
} from '@shopify/react-native-skia';
import { StravaActivity } from '@/types/strava';
import { templates } from '@/lib/templates';
import { decodePolyline, normalizePoints } from '@/lib/polyline';
import { formatDistanceMeters, formatDuration, formatPace } from '@/lib/format';

type Props = {
  activity: StravaActivity;
  templateId: string;
  isPremium: boolean;
  canvasRef: any;
  size?: number;
};

const CANVAS_SIZE = 1080;

export function PaceCanvas({ activity, templateId, isPremium, canvasRef, size = 320 }: Props) {
  const template = templates.find((item) => item.id === templateId) ?? templates[0];

  const routePath = useMemo(() => {
    const polyline = activity.map.summary_polyline;
    if (!polyline) return null;

    const points = normalizePoints(decodePolyline(polyline), CANVAS_SIZE, CANVAS_SIZE, 150);
    if (!points.length) return null;

    const path = Skia.Path.Make();
    path.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i += 1) {
      path.lineTo(points[i].x, points[i].y);
    }

    return path;
  }, [activity.map.summary_polyline]);

  const fontBig = useMemo(() => matchFont({ fontSize: 96, fontFamily: 'Arial', fontWeight: '700' }), []);
  const fontMid = useMemo(() => matchFont({ fontSize: 46, fontFamily: 'Arial', fontWeight: '700' }), []);
  const fontSmall = useMemo(() => matchFont({ fontSize: 36, fontFamily: 'Arial', fontWeight: '500' }), []);
  const scale = size / CANVAS_SIZE;

  return (
    <Canvas ref={canvasRef} style={{ width: size, height: size }}>
      <Group transform={[{ scale }]}>
        <Fill>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: CANVAS_SIZE, y: CANVAS_SIZE }}
            colors={[template.backgroundTop, template.backgroundBottom]}
          />
        </Fill>

        <RoundedRect x={56} y={56} width={968} height={968} r={40} color="rgba(255,255,255,0.08)" />

        {routePath ? (
          <Path path={routePath} style="stroke" strokeWidth={16} color={template.accent} strokeJoin="round" strokeCap="round" />
        ) : null}

        <Text x={96} y={180} text={activity.name.toUpperCase()} font={fontSmall} color={template.text} />
        <Text x={96} y={300} text={formatDistanceMeters(activity.distance)} font={fontBig} color={template.text} />

        <Text x={96} y={960} text={`Time ${formatDuration(activity.moving_time)}`} font={fontMid} color={template.text} />
        <Text x={96} y={1012} text={`Pace ${formatPace(activity.distance, activity.moving_time)}`} font={fontMid} color={template.text} />

        {!isPremium ? (
          <Text x={760} y={1030} text="PACEFRAME" font={fontSmall} color="rgba(255,255,255,0.75)" />
        ) : null}
      </Group>
    </Canvas>
  );
}
