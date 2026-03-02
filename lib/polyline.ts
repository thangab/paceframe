export type Point = { x: number; y: number };

export function decodePolyline(encoded: string): Point[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: Point[] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({ x: lng / 1e5, y: lat / 1e5 });
  }

  return coordinates;
}

export function encodePolyline(points: Point[]): string {
  if (!points.length) return '';

  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  for (const point of points) {
    const lat = Math.round(point.y * 1e5);
    const lng = Math.round(point.x * 1e5);

    result += encodeSignedValue(lat - lastLat);
    result += encodeSignedValue(lng - lastLng);

    lastLat = lat;
    lastLng = lng;
  }

  return result;
}

function encodeSignedValue(value: number): string {
  let shifted = value < 0 ? ~(value << 1) : value << 1;
  let encoded = '';

  while (shifted >= 0x20) {
    encoded += String.fromCharCode((0x20 | (shifted & 0x1f)) + 63);
    shifted >>= 5;
  }

  encoded += String.fromCharCode(shifted + 63);
  return encoded;
}

export function normalizePoints(points: Point[], width: number, height: number, padding = 80): Point[] {
  if (!points.length) return [];

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const dataWidth = Math.max(maxX - minX, 0.0001);
  const dataHeight = Math.max(maxY - minY, 0.0001);

  const scaleX = (width - padding * 2) / dataWidth;
  const scaleY = (height - padding * 2) / dataHeight;
  const scale = Math.min(scaleX, scaleY);

  return points.map((p) => ({
    x: (p.x - minX) * scale + padding,
    y: height - ((p.y - minY) * scale + padding),
  }));
}
