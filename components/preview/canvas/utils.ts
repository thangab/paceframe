import type { DistanceUnit } from '@/lib/format';
import type { LapPaceChartPoint } from '@/lib/strava';

export function normalizeTemplateColor(value?: string) {
  if (!value) return undefined;
  if (value.trim().toLowerCase() === 'transparent') {
    return 'rgba(0,0,0,0)';
  }
  return value;
}

export function measureTemplateTextLineWidth({
  line,
  fontSize,
  letterSpacing,
  widthFactor,
}: {
  line: string;
  fontSize: number;
  letterSpacing: number;
  widthFactor: number;
}) {
  const charCount = Math.max(1, line.length);
  return (
    charCount * fontSize * widthFactor +
    Math.max(0, charCount - 1) * letterSpacing
  );
}

export function wrapTemplateTextLines({
  text,
  maxTextWidth,
  fontSize,
  letterSpacing,
  widthFactor,
}: {
  text: string;
  maxTextWidth: number;
  fontSize: number;
  letterSpacing: number;
  widthFactor: number;
}) {
  const sourceLines = text.split('\n');
  const wrapped: string[] = [];

  for (const sourceLine of sourceLines) {
    if (!sourceLine.trim()) {
      wrapped.push('');
      continue;
    }

    const words = sourceLine.split(/\s+/).filter(Boolean);
    let current = '';

    const flush = () => {
      if (current.length > 0) {
        wrapped.push(current);
        current = '';
      }
    };

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const candidateWidth = measureTemplateTextLineWidth({
        line: candidate,
        fontSize,
        letterSpacing,
        widthFactor,
      });

      if (candidateWidth <= maxTextWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        flush();
      }

      let remainder = word;
      while (remainder.length > 0) {
        let sliceLen = remainder.length;
        while (sliceLen > 1) {
          const slice = remainder.slice(0, sliceLen);
          const sliceWidth = measureTemplateTextLineWidth({
            line: slice,
            fontSize,
            letterSpacing,
            widthFactor,
          });
          if (sliceWidth <= maxTextWidth) break;
          sliceLen -= 1;
        }
        wrapped.push(remainder.slice(0, sliceLen));
        remainder = remainder.slice(sliceLen);
      }
    }

    flush();
  }

  return wrapped.length > 0 ? wrapped : [''];
}

export function sampleChartPoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const sampled: T[] = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i += 1) {
    sampled.push(points[Math.round(i * step)]);
  }
  return sampled;
}

export function buildPaceSplitsByUnit(
  laps: LapPaceChartPoint[],
  unit: DistanceUnit,
): { lap: number; pace: number }[] {
  const metersPerUnit = unit === 'mi' ? 1609.344 : 1000;
  const splits: { lap: number; pace: number }[] = [];
  let carryDistance = 0;
  let carryTime = 0;

  laps.forEach((lap) => {
    const distance = lap.distanceMeters;
    const movingTime = lap.movingTimeSec;
    if (distance <= 0 || movingTime <= 0) return;

    const secondsPerMeter = movingTime / distance;
    let remainingDistance = distance;

    while (remainingDistance > 0.0001) {
      const neededDistance = metersPerUnit - carryDistance;
      const chunkDistance = Math.min(neededDistance, remainingDistance);
      const chunkTime = chunkDistance * secondsPerMeter;

      carryDistance += chunkDistance;
      carryTime += chunkTime;
      remainingDistance -= chunkDistance;

      if (carryDistance >= metersPerUnit - 0.0001) {
        const splitIndex = splits.length + 1;
        splits.push({ lap: splitIndex, pace: carryTime });
        carryDistance = 0;
        carryTime = 0;
      }
    }
  });

  if (carryDistance > 0.0001 && carryTime > 0) {
    const splitIndex = splits.length + 1;
    const normalizedPace = carryTime / (carryDistance / metersPerUnit);
    splits.push({ lap: splitIndex, pace: normalizedPace });
  }

  return splits;
}

export function formatPaceAxisLabel(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '--';
  const rounded = Math.round(secondsPerKm);
  const min = Math.floor(rounded / 60);
  const sec = rounded % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function formatPaceSplitLabel(value: number, unit: DistanceUnit): string {
  const lapNumber = Math.max(1, Math.round(value));
  return `${unit === 'mi' ? 'M' : 'K'}${lapNumber}`;
}

export function formatElapsedAxisLabel(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '--';
  const rounded = Math.round(totalSeconds);
  const min = Math.floor(rounded / 60);
  const sec = rounded % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function withAlpha(color: string, alphaHex: string): string {
  const normalized = color.trim();
  if (/^#([A-Fa-f0-9]{6})$/.test(normalized)) {
    return `${normalized}${alphaHex}`;
  }
  if (/^#([A-Fa-f0-9]{3})$/.test(normalized)) {
    const r = normalized[1];
    const g = normalized[2];
    const b = normalized[3];
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }
  return normalized;
}
