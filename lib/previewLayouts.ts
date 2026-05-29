import {
  FieldId,
  StatsLayout,
  StatsLayoutKind,
  StatsVisibleFields,
} from '@/types/preview';

const DEFAULT_LAYOUT_VISIBLE_FIELDS: StatsVisibleFields = {
  distance: true,
  time: true,
  pace: true,
  elev: true,
  cadence: false,
  calories: false,
  avgHr: false,
};

export const PREVIEW_LAYOUTS: StatsLayout[] = [
  {
    id: 'hero',
    name: 'Hero',
    layout: 'hero',
    previewHeight: 190,
    metricLimit: 4,
    x: 16,
    y: 435,
    width: 288,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'vertical',
    name: 'Vertical',
    layout: 'vertical',
    premium: false,
    previewHeight: 244,
    metricLimit: 4,
    x: 70,
    y: 336,
    width: 300,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'compact',
    name: 'Compact',
    layout: 'compact',
    premium: false,
    previewHeight: 132,
    metricLimit: 4,
    x: 20,
    y: 480,
    width: 280,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'columns',
    name: 'Columns',
    layout: 'columns',
    premium: false,
    previewHeight: 146,
    metricLimit: 4,
    x: 12,
    y: 490,
    width: 350,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'grid-2x2',
    name: 'Grid 2x2',
    layout: 'grid-2x2',
    premium: false,
    previewHeight: 186,
    metricLimit: 4,
    x: 18,
    y: 420,
    width: 284,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'mile-ring',
    name: 'Mile Ring',
    layout: 'mile-ring',
    premium: true,
    previewHeight: 246,
    metricLimit: 5,
    defaultVisibleFields: {
      distance: true,
      time: true,
      pace: true,
      elev: true,
      cadence: false,
      calories: true,
      avgHr: false,
    },
    resetTransformsOnSelect: true,
    x: 20,
    y: 132,
    width: 320,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'signal-board',
    name: 'Signal Board',
    layout: 'signal-board',
    premium: false,
    previewHeight: 214,
    metricLimit: 5,
    defaultVisibleFields: {
      distance: true,
      time: true,
      pace: true,
      elev: true,
      cadence: false,
      calories: false,
      avgHr: true,
    },
    resetTransformsOnSelect: true,
    x: 18,
    y: 210,
    width: 324,
    backgroundColor: 'rgba(10,14,24,0.24)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    radius: 28,
  },
  {
    id: 'social-pill',
    name: 'Social Pill',
    layout: 'social-pill',
    premium: false,
    previewHeight: 122,
    metricLimit: 3,
    resetTransformsOnSelect: true,
    defaultVisibleFields: {
      distance: true,
      time: true,
      pace: true,
      elev: false,
      cadence: false,
      calories: false,
      avgHr: false,
    },
    x: 32,
    y: 356,
    width: 280,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'glass-row',
    name: 'Glass Row',
    layout: 'glass-row',
    premium: false,
    previewHeight: 190,
    metricLimit: 4,
    x: 16,
    y: 420,
    width: 328,
    backgroundColor: 'rgba(12,18,28,0.42)',
    borderColor: 'transparent',
    borderWidth: 1,
    radius: 22,
  },
  {
    id: 'soft-stack',
    name: 'Soft Stack',
    layout: 'soft-stack',
    previewHeight: 244,
    metricLimit: 4,
    x: 36,
    y: 300,
    width: 288,
    backgroundColor: 'rgba(6,8,14,0.56)',
    borderColor: 'transparent',
    borderWidth: 1,
    radius: 18,
  },
  {
    id: 'pill-inline',
    name: 'Pill Inline',
    layout: 'pill-inline',
    premium: false,
    previewHeight: 132,
    metricLimit: 4,
    x: 24,
    y: 496,
    width: 312,
    backgroundColor: 'rgba(8,12,20,0.62)',
    borderColor: 'transparent',
    borderWidth: 1,
    radius: 999,
  },
  {
    id: 'card-columns',
    name: 'Card Columns',
    layout: 'card-columns',
    premium: false,
    previewHeight: 146,
    metricLimit: 4,
    x: 14,
    y: 468,
    width: 332,
    backgroundColor: 'rgba(10,14,24,0.65)',
    borderColor: 'transparent',
    borderWidth: 1,
    radius: 16,
  },
  {
    id: 'panel-grid',
    name: 'Panel Grid',
    layout: 'panel-grid',
    premium: false,
    previewHeight: 186,
    metricLimit: 4,
    x: 24,
    y: 402,
    width: 312,
    backgroundColor: 'rgba(10,15,24,0.62)',
    borderColor: 'transparent',
    borderWidth: 1,
    radius: 20,
  },
  {
    id: 'sunset-hero',
    name: 'Sunset Hero',
    layout: 'sunset-hero',
    premium: true,
    previewHeight: 190,
    metricLimit: 5,
    supportsPrimaryLayer: true,
    resetTransformsOnSelect: true,
    defaultVisibleFields: {
      distance: true,
      time: true,
      pace: true,
      elev: true,
      cadence: false,
      calories: false,
      avgHr: true,
    },
    x: 20,
    y: 220,
    width: 320,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'morning-glass',
    name: 'Morning Glass',
    layout: 'morning-glass',
    premium: true,
    previewHeight: 190,
    metricLimit: 6,
    supportsPrimaryLayer: true,
    resetTransformsOnSelect: true,
    defaultVisibleFieldOrder: [
      'distance',
      'time',
      'pace',
      'elev',
      'avgHr',
      'calories',
      'cadence',
    ],
    defaultVisibleFieldCount: 6,
    x: 12,
    y: 286,
    width: 336,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'split-bold',
    name: 'Split Bold',
    layout: 'split-bold',
    premium: true,
    previewHeight: 228,
    metricLimit: 6,
    supportsPrimaryLayer: true,
    resetTransformsOnSelect: true,
    x: 24,
    y: 210,
    width: 212,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
];

const STATS_LAYOUT_KINDS = new Set<StatsLayoutKind>([
  'hero',
  'vertical',
  'compact',
  'columns',
  'grid-2x2',
  'glass-row',
  'soft-stack',
  'pill-inline',
  'card-columns',
  'panel-grid',
  'sunset-hero',
  'morning-glass',
  'split-bold',
  'mile-ring',
  'signal-board',
  'social-pill',
]);

const FIELD_IDS = new Set<FieldId>([
  'distance',
  'time',
  'pace',
  'elev',
  'cadence',
  'calories',
  'avgHr',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asOptionalNumber(value: unknown) {
  if (value === undefined) return undefined;
  const numberValue = asNumber(value);
  return numberValue === null ? undefined : numberValue;
}

function asOptionalBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

function sanitizeDefaultVisibleFields(value: unknown) {
  if (!isRecord(value)) return undefined;

  const fields: Partial<StatsVisibleFields> = {};
  FIELD_IDS.forEach((field) => {
    if (typeof value[field] === 'boolean') {
      fields[field] = value[field];
    }
  });

  return Object.keys(fields).length > 0 ? fields : undefined;
}

function sanitizeDefaultVisibleFieldOrder(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const seen = new Set<FieldId>();
  const fields = value.filter((item): item is FieldId => {
    if (typeof item !== 'string' || !FIELD_IDS.has(item as FieldId)) {
      return false;
    }
    const field = item as FieldId;
    if (seen.has(field)) return false;
    seen.add(field);
    return true;
  });

  return fields.length > 0 ? fields : undefined;
}

export function sanitizePreviewLayout(value: unknown): StatsLayout | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const name = asString(value.name);
  const layout = asString(value.layout);
  const x = asNumber(value.x);
  const y = asNumber(value.y);
  const width = asNumber(value.width);
  const backgroundColor = asString(value.backgroundColor);
  const borderColor = asString(value.borderColor);
  const borderWidth = asNumber(value.borderWidth);
  const radius = asNumber(value.radius);

  if (
    !id ||
    !name ||
    !layout ||
    !STATS_LAYOUT_KINDS.has(layout as StatsLayoutKind) ||
    x === null ||
    y === null ||
    width === null ||
    !backgroundColor ||
    !borderColor ||
    borderWidth === null ||
    radius === null
  ) {
    return null;
  }

  return {
    id,
    name,
    layout: layout as StatsLayoutKind,
    premium: asOptionalBoolean(value.premium),
    previewHeight: asOptionalNumber(value.previewHeight),
    metricLimit: asOptionalNumber(value.metricLimit),
    supportsPrimaryLayer: asOptionalBoolean(value.supportsPrimaryLayer),
    resetTransformsOnSelect: asOptionalBoolean(value.resetTransformsOnSelect),
    defaultVisibleFields: sanitizeDefaultVisibleFields(
      value.defaultVisibleFields,
    ),
    defaultVisibleFieldOrder: sanitizeDefaultVisibleFieldOrder(
      value.defaultVisibleFieldOrder,
    ),
    defaultVisibleFieldCount: asOptionalNumber(value.defaultVisibleFieldCount),
    x,
    y,
    width,
    backgroundColor,
    borderColor,
    borderWidth,
    radius,
  };
}

export function sanitizePreviewLayouts(value: unknown): StatsLayout[] | null {
  if (!Array.isArray(value)) return null;

  const layouts = value
    .map((item) => sanitizePreviewLayout(item))
    .filter((item): item is StatsLayout => Boolean(item));
  const ids = new Set<string>();
  const uniqueLayouts = layouts.filter((layout) => {
    if (ids.has(layout.id)) return false;
    ids.add(layout.id);
    return true;
  });

  if (uniqueLayouts.length === 0) return null;
  if (!uniqueLayouts.some((layout) => layout.id === 'hero')) return null;

  return uniqueLayouts;
}

export function getLayoutMetricLimit(layout: StatsLayout) {
  return layout.metricLimit ?? 4;
}

export function getLayoutPreviewHeight(layout: StatsLayout) {
  return layout.previewHeight ?? 186;
}

export function layoutSupportsPrimaryLayer(layout: StatsLayout) {
  return Boolean(layout.supportsPrimaryLayer);
}

export function shouldResetTransformsOnLayoutSelect(layout: StatsLayout) {
  return Boolean(layout.resetTransformsOnSelect);
}

export function getDefaultVisibleFieldsForLayout(
  layout: StatsLayout,
  availability: StatsVisibleFields,
  fallback: StatsVisibleFields = DEFAULT_LAYOUT_VISIBLE_FIELDS,
): StatsVisibleFields {
  if (layout.defaultVisibleFields) {
    return {
      distance:
        layout.defaultVisibleFields.distance === true && availability.distance,
      time: layout.defaultVisibleFields.time === true && availability.time,
      pace: layout.defaultVisibleFields.pace === true && availability.pace,
      elev: layout.defaultVisibleFields.elev === true && availability.elev,
      cadence:
        layout.defaultVisibleFields.cadence === true && availability.cadence,
      calories:
        layout.defaultVisibleFields.calories === true && availability.calories,
      avgHr: layout.defaultVisibleFields.avgHr === true && availability.avgHr,
    };
  }

  if (layout.defaultVisibleFieldOrder?.length) {
    const maxCount = Math.max(
      1,
      Math.min(
        layout.defaultVisibleFieldCount ??
          layout.defaultVisibleFieldOrder.length,
        layout.defaultVisibleFieldOrder.length,
      ),
    );
    const selected = new Set(
      layout.defaultVisibleFieldOrder
        .filter((field) => availability[field])
        .slice(0, maxCount),
    );
    return {
      distance: selected.has('distance'),
      time: selected.has('time'),
      pace: selected.has('pace'),
      elev: selected.has('elev'),
      cadence: selected.has('cadence'),
      calories: selected.has('calories'),
      avgHr: selected.has('avgHr'),
    };
  }

  return fallback;
}
