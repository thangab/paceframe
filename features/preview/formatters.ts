import type { StatsLayout } from '@/types/preview';
import { getLayoutMetricLimit as getConfiguredLayoutMetricLimit } from '@/lib/previewLayouts';

export function splitMetricValueUnit(text: string): {
  value: string;
  unit: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { value: '', unit: '' };

  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > 0) {
    const value = trimmed.slice(0, lastSpace).trim();
    const unit = trimmed.slice(lastSpace + 1).trim();
    if (unit) {
      return { value, unit };
    }
  }

  const compactMatch = trimmed.match(/^(.*?)(\/[A-Za-z]+|[A-Za-z%]+)$/);
  if (compactMatch) {
    return {
      value: compactMatch[1].trim(),
      unit: compactMatch[2].trim(),
    };
  }

  return { value: trimmed, unit: '' };
}

export function formatDateWithPattern(isoDate: string, pattern: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const monthShort = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][date.getMonth()];
  const monthLong = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ][date.getMonth()];
  const year = `${date.getFullYear()}`;
  const yearShort = year.slice(-2);

  return pattern
    .replaceAll('dd', day)
    .replaceAll('MMMM', monthLong)
    .replaceAll('MMM', monthShort)
    .replaceAll('mm', month)
    .replaceAll('YYYY', year)
    .replaceAll('YY', yearShort);
}

export function formatPreviewDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatCadence(
  activity: {
    average_cadence?: number | null;
    type?: string | null;
  } | null,
) {
  const raw = activity?.average_cadence;
  if (!raw || raw <= 0) return '-- spm';

  const type = (activity?.type ?? '').toLowerCase();
  const isRunLike = type === 'run' || type === 'walk' || type === 'hike';

  if (isRunLike) {
    const spm = raw < 130 ? raw * 2 : raw;
    return `${Math.round(spm)} spm`;
  }

  return `${Math.round(raw)} rpm`;
}

export function getDynamicStatsWidth(template: StatsLayout, visibleCount: number) {
  const count = Math.max(1, visibleCount);
  const compactCount = Math.min(4, count);

  switch (template.layout) {
    case 'hero':
    case 'glass-row': {
      if (compactCount >= 4) return template.width;
      if (compactCount === 3) return Math.max(220, template.width - 24);
      if (compactCount === 2) return Math.max(170, template.width - 78);
      return Math.max(220, template.width - 52);
    }
    case 'sunset-hero':
      return template.width;
    case 'morning-glass':
      return template.width;
    case 'split-bold': {
      if (count >= 5) return 208;
      if (count === 4) return 202;
      if (count === 3) return 194;
      if (count === 2) return 184;
      return 170;
    }
    case 'compact':
    case 'pill-inline':
      return Math.max(
        150,
        Math.round(template.width * (0.45 + compactCount * 0.14)),
      );
    case 'columns':
    case 'card-columns':
      return Math.max(
        160,
        Math.round(template.width * (0.42 + compactCount * 0.145)),
      );
    case 'grid-2x2':
    case 'panel-grid':
      if (compactCount >= 4) return template.width;
      if (compactCount === 3) return Math.max(220, template.width - 28);
      if (compactCount === 2) return Math.max(160, template.width - 110);
      return 130;
    case 'vertical':
    case 'soft-stack':
    default:
      return Math.max(
        130,
        Math.round(template.width * (0.42 + compactCount * 0.145)),
      );
  }
}

export function getLayoutMetricLimit(template: StatsLayout) {
  return getConfiguredLayoutMetricLimit(template);
}
