import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { generateMapSnapshot } from '@/lib/nativeMapSnapshot';
import { decodePolyline } from '@/lib/polyline';

type RouteMode = 'map' | 'trace';
type RouteMapVariant = 'standard' | 'dark' | 'satellite';

type Props = {
  polyline: string | null;
  mode: RouteMode;
  mapVariant?: RouteMapVariant;
  width?: number;
  height?: number;
};

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const TRACE_STROKE_WIDTH = 4;

export function RouteLayer({
  polyline,
  mode,
  mapVariant = 'standard',
  width = 250,
  height = 150,
}: Props) {
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [iosMapUri, setIosMapUri] = useState<string | null>(null);
  const iosSnapshotKeyRef = useRef<string | null>(null);
  const latLngs = useMemo(() => {
    if (!polyline) return [];
    const source = decodePolyline(polyline);
    return source.map((p) => ({ lat: p.y, lng: p.x }));
  }, [polyline]);
  const viewport = useMemo(() => {
    if (!latLngs.length) return null;

    const lats = latLngs.map((p) => p.lat);
    const lngs = latLngs.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      centerLat: (minLat + maxLat) / 2,
      centerLng: (minLng + maxLng) / 2,
      zoom: fitZoom(minLat, maxLat, minLng, maxLng, width, height),
    };
  }, [latLngs, width, height]);
  const routePath = useMemo(() => {
    if (!latLngs.length || !viewport) return null;
    const points = latLngs.map((p) =>
      projectPointToViewport({
        lat: p.lat,
        lng: p.lng,
        centerLat: viewport.centerLat,
        centerLng: viewport.centerLng,
        zoom: viewport.zoom,
        width,
        height,
      }),
    );

    if (!points.length) return null;

    const path = Skia.Path.Make();
    path.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i += 1) {
      path.lineTo(points[i].x, points[i].y);
    }

    return { path };
  }, [latLngs, viewport, width, height]);
  const mapImageUrl = useMemo(() => {
    if (!polyline || !viewport) return null;
    if (Platform.OS === 'ios') return null;
    if (!MAPBOX_TOKEN) return null;

    const mapboxStyle =
      mapVariant === 'satellite'
        ? 'mapbox/satellite-v9'
        : mapVariant === 'dark'
          ? 'mapbox/dark-v11'
          : 'mapbox/streets-v12';
    const sampled = sampleForStaticMap(latLngs, 50);
    const encodedPolyline = encodeURIComponent(encodePolyline(sampled));
    const overlay = `path-4+d4ff54-0.95(${encodedPolyline})`;
    const pixelRatioSuffix = '@2x';

    return (
      `https://api.mapbox.com/styles/v1/${mapboxStyle}/static/` +
      `${overlay}/` +
      `${viewport.centerLng.toFixed(5)},${viewport.centerLat.toFixed(5)},${viewport.zoom},0/` +
      `${Math.round(width)}x${Math.round(height)}${pixelRatioSuffix}` +
      `?access_token=${encodeURIComponent(MAPBOX_TOKEN)}`
    );
  }, [polyline, latLngs, viewport, width, height, mapVariant]);

  useEffect(() => {
    setMapLoadFailed(false);
  }, [mapImageUrl, mode, polyline, mapVariant]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !polyline) {
      setIosMapUri(null);
      iosSnapshotKeyRef.current = null;
      return;
    }
    const snapshotKey = `${polyline}|${Math.round(width)}x${Math.round(height)}|${mapVariant}`;
    const hasMatchingSnapshot =
      iosSnapshotKeyRef.current === snapshotKey && Boolean(iosMapUri);
    if (hasMatchingSnapshot) return;

    let cancelled = false;
    setMapLoadFailed(false);

    generateMapSnapshot({
      polyline,
      width,
      height,
      strokeColorHex: '#D4FF54',
      mapVariant,
    })
      .then((uri) => {
        if (!cancelled) {
          setIosMapUri(uri);
          iosSnapshotKeyRef.current = snapshotKey;
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIosMapUri(null);
          iosSnapshotKeyRef.current = null;
          setMapLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [polyline, width, height, iosMapUri, mapVariant]);

  if (!routePath) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No route map for this activity</Text>
      </View>
    );
  }

  if (mode === 'map') {
    const mapUri = Platform.OS === 'ios' ? iosMapUri : mapImageUrl;
    if (!mapUri || mapLoadFailed) {
      return (
        <View style={[styles.empty, { width, height }]}>
          <Text style={styles.emptyText}>
            {Platform.OS === 'ios'
              ? 'Map unavailable for this activity'
              : MAPBOX_TOKEN
                ? 'Map unavailable for this activity'
                : 'Missing EXPO_PUBLIC_MAPBOX_TOKEN'}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.mapWrap, { width, height }]}>
        <Image
          source={{ uri: mapUri }}
          style={styles.mapImage}
          resizeMode="cover"
          onError={() => setMapLoadFailed(true)}
        />
      </View>
    );
  }

  return (
    <Canvas style={{ width, height }}>
      <Path
        path={routePath.path}
        style="stroke"
        strokeWidth={TRACE_STROKE_WIDTH}
        color="#D4FF54"
        strokeJoin="round"
        strokeCap="round"
      />
    </Canvas>
  );
}

function projectPointToViewport({
  lat,
  lng,
  centerLat,
  centerLng,
  zoom,
  width,
  height,
}: {
  lat: number;
  lng: number;
  centerLat: number;
  centerLng: number;
  zoom: number;
  width: number;
  height: number;
}) {
  const WORLD_SIZE = 256;
  const scale = 2 ** zoom;
  const worldPx = WORLD_SIZE * scale;

  const x =
    (lngToMercatorX(lng) - lngToMercatorX(centerLng)) * worldPx + width / 2;
  const y =
    (latToMercatorY(lat) - latToMercatorY(centerLat)) * worldPx + height / 2;

  return { x, y };
}

function sampleForStaticMap(
  points: { lat: number; lng: number }[],
  maxPoints: number,
) {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const sampled: { lat: number; lng: number }[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    sampled.push(points[Math.round(i * step)]);
  }
  return sampled;
}

function fitZoom(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  width: number,
  height: number,
) {
  const WORLD_SIZE = 256;
  // Keep route footprint close to native iOS snapshot region expansion (1.35x span).
  const paddingRatio = 1 / 1.35;

  const lngToX = (lng: number) => (lng + 180) / 360;
  const latToY = (lat: number) => {
    const sin = Math.sin((lat * Math.PI) / 180);
    return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  };

  const dx = Math.max(Math.abs(lngToX(maxLng) - lngToX(minLng)), 0.000001);
  const dy = Math.max(Math.abs(latToY(maxLat) - latToY(minLat)), 0.000001);

  const zoomX = Math.log2((width * paddingRatio) / (WORLD_SIZE * dx));
  const zoomY = Math.log2((height * paddingRatio) / (WORLD_SIZE * dy));
  const zoom = Math.min(zoomX, zoomY);
  return Math.max(1, Math.min(18, zoom));
}

function lngToMercatorX(lng: number) {
  return (lng + 180) / 360;
}

function latToMercatorY(lat: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function encodePolyline(points: { lat: number; lng: number }[]) {
  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  const encodeValue = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let output = '';
    while (v >= 0x20) {
      output += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    output += String.fromCharCode(v + 63);
    return output;
  };

  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    const dLat = lat - lastLat;
    const dLng = lng - lastLng;
    lastLat = lat;
    lastLng = lng;
    result += encodeValue(dLat) + encodeValue(dLng);
  }

  return result;
}

const styles = StyleSheet.create({
  mapWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  empty: {
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
});
