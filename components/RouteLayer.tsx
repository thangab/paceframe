import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { generateMapSnapshot } from '@/lib/nativeMapSnapshot';
import { decodePolyline } from '@/lib/polyline';

type RouteMode = 'map' | 'trace';

type Props = {
  polyline: string | null;
  mode: RouteMode;
  width?: number;
  height?: number;
};

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_STYLE = 'mapbox/streets-v12';

export function RouteLayer({
  polyline,
  mode,
  width = 250,
  height = 150,
}: Props) {
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [iosMapUri, setIosMapUri] = useState<string | null>(null);
  const routePath = useMemo(() => {
    if (!polyline) return null;

    const source = decodePolyline(polyline);
    if (!source.length) return null;

    const padding = mode === 'map' ? 16 : 8;
    const minX = Math.min(...source.map((p) => p.x));
    const maxX = Math.max(...source.map((p) => p.x));
    const minY = Math.min(...source.map((p) => p.y));
    const maxY = Math.max(...source.map((p) => p.y));
    const dataWidth = Math.max(maxX - minX, 0.0001);
    const dataHeight = Math.max(maxY - minY, 0.0001);

    const innerWidth = Math.max(width - padding * 2, 1);
    const innerHeight = Math.max(height - padding * 2, 1);
    const scale = Math.min(innerWidth / dataWidth, innerHeight / dataHeight);

    const scaledWidth = dataWidth * scale;
    const scaledHeight = dataHeight * scale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;

    const points = source.map((p) => ({
      x: (p.x - minX) * scale + offsetX,
      y: height - ((p.y - minY) * scale + offsetY),
    }));

    if (!points.length) return null;

    const path = Skia.Path.Make();
    path.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i += 1) {
      path.lineTo(points[i].x, points[i].y);
    }

    return { path };
  }, [polyline, width, height, mode]);
  const mapImageUrl = useMemo(() => {
    if (!polyline || mode !== 'map') return null;
    if (Platform.OS === 'ios') return null;
    if (!MAPBOX_TOKEN) return null;

    const source = decodePolyline(polyline);
    if (!source.length) return null;

    const latLngs = source.map((p) => ({ lat: p.y, lng: p.x }));
    const sampled = sampleForStaticMap(latLngs, 50);

    const lats = latLngs.map((p) => p.lat);
    const lngs = latLngs.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const zoom = fitZoom(minLat, maxLat, minLng, maxLng, width, height);
    const encodedPolyline = encodeURIComponent(encodePolyline(sampled));
    const overlay = `path-4+ff6b00-0.95(${encodedPolyline})`;
    const pixelRatioSuffix = '@2x';

    return (
      `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/static/` +
      `${overlay}/` +
      `${centerLng.toFixed(5)},${centerLat.toFixed(5)},${zoom},0/` +
      `${Math.round(width)}x${Math.round(height)}${pixelRatioSuffix}` +
      `?access_token=${encodeURIComponent(MAPBOX_TOKEN)}`
    );
  }, [polyline, mode, width, height]);

  useEffect(() => {
    setMapLoadFailed(false);
  }, [mapImageUrl, mode, polyline]);

  useEffect(() => {
    if (mode !== 'map' || Platform.OS !== 'ios' || !polyline) {
      setIosMapUri(null);
      return;
    }

    let cancelled = false;
    setMapLoadFailed(false);

    generateMapSnapshot({
      polyline,
      width,
      height,
      strokeColorHex: '#F97316',
    })
      .then((uri) => {
        if (!cancelled) {
          setIosMapUri(uri);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIosMapUri(null);
          setMapLoadFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, polyline, width, height]);

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
        strokeWidth={5}
        color="#F97316"
        strokeJoin="round"
        strokeCap="round"
      />
    </Canvas>
  );
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
  const paddingRatio = 0.82;

  const lngToX = (lng: number) => (lng + 180) / 360;
  const latToY = (lat: number) => {
    const sin = Math.sin((lat * Math.PI) / 180);
    return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  };

  const dx = Math.max(Math.abs(lngToX(maxLng) - lngToX(minLng)), 0.000001);
  const dy = Math.max(Math.abs(latToY(maxLat) - latToY(minLat)), 0.000001);

  const zoomX = Math.log2((width * paddingRatio) / (WORLD_SIZE * dx));
  const zoomY = Math.log2((height * paddingRatio) / (WORLD_SIZE * dy));
  const zoom = Math.floor(Math.min(zoomX, zoomY));
  return Math.max(1, Math.min(18, zoom));
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
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
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
