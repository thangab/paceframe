import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { decodePolyline, normalizePoints } from '@/lib/polyline';

type RouteMode = 'map' | 'trace';

type Props = {
  polyline: string | null;
  mode: RouteMode;
  width?: number;
  height?: number;
};

export function RouteLayer({ polyline, mode, width = 250, height = 150 }: Props) {
  const routePath = useMemo(() => {
    if (!polyline) return null;

    const points = normalizePoints(
      decodePolyline(polyline),
      width,
      height,
      mode === 'map' ? 18 : 8,
    );

    if (!points.length) return null;

    const path = Skia.Path.Make();
    path.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i += 1) {
      path.lineTo(points[i].x, points[i].y);
    }

    return {
      path,
      start: points[0],
      end: points[points.length - 1],
    };
  }, [polyline, width, height, mode]);

  const gridPath = useMemo(() => {
    if (mode !== 'map') return null;

    const path = Skia.Path.Make();
    const rows = 6;
    const cols = 5;

    for (let i = 1; i < rows; i += 1) {
      const y = (height / rows) * i;
      path.moveTo(0, y);
      path.lineTo(width, y);
    }

    for (let i = 1; i < cols; i += 1) {
      const x = (width / cols) * i;
      path.moveTo(x, 0);
      path.lineTo(x, height);
    }

    return path;
  }, [mode, width, height]);

  if (!routePath) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No route map for this activity</Text>
      </View>
    );
  }

  return (
    <Canvas style={{ width, height }}>
      {mode === 'map' ? (
        <>
          <RoundedRect x={0} y={0} width={width} height={height} r={14} color="#0f172a" />
          {gridPath ? (
            <Path
              path={gridPath}
              style="stroke"
              strokeWidth={1}
              color="rgba(148,163,184,0.35)"
            />
          ) : null}
        </>
      ) : null}

      <Path
        path={routePath.path}
        style="stroke"
        strokeWidth={mode === 'map' ? 4 : 5}
        color={mode === 'map' ? '#38bdf8' : '#ffffff'}
        strokeJoin="round"
        strokeCap="round"
      />

      <Circle cx={routePath.start.x} cy={routePath.start.y} r={4} color="#22c55e" />
      <Circle cx={routePath.end.x} cy={routePath.end.y} r={4} color="#f97316" />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    paddingHorizontal: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
});
