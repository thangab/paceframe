import {
  ChartDisplayVersion,
  ChartFillStyle,
  ChartOrientation,
  FieldId,
  PreviewTemplateChartElement,
  PreviewTemplateDefinition,
  PreviewTemplateImageElement,
  PreviewTemplateTextElement,
  TemplateLayerStyleId,
} from '@/types/preview';

const TEMPLATE_ASSETS: Record<string, number> = {
  runner: require('../assets/templates/runner.png'),
  'polaroid-wood': require('../assets/templates/polaroid-wood.png'),
  'grid-bg': require('../assets/templates/grid-bg.png'),
  'ticket-run': require('../assets/templates/ticket-run.png'),
  'card-member': require('../assets/templates/card-member.png'),
};

type BackgroundMediaFit = NonNullable<
  PreviewTemplateDefinition['backgroundMediaFrame']
>['fit'];

export const PREVIEW_TEMPLATES: PreviewTemplateDefinition[] = [
  {
    id: 'template-cover',
    name: 'Cover',
    defaultBackground: 'none',
    defaultBlurEffectId: 'background-blur',
    showRoute: true,
    routeTransform: {
      x: 170,
      y: 460,
      scale: 0.5,
    },
    layerStyleOverrides: {
      route: { color: '#F5F5F5', opacity: 1 },
    },
    fixedImageElements: [
      {
        id: 'title-logo',
        name: 'Runner zine title',
        asset: require('../assets/templates/runner.png'),
        isBehind: true,
        x: 10,
        y: 30,
        width: 340,
        height: 92,
      },
    ],
    fixedTextElements: [
      {
        id: 'meta-date',
        text: '{date}',
        uppercase: true,
        x: 10,
        y: 10,
        width: 340,
        formatDate: 'mm/dd/YYYY',
        color: 'transparent',
        backgroundColor: '#ffffff',
        fontFamily: 'Avenir Next',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
        align: 'right',
        paddingX: 14,
        isBehind: true,
      },
      {
        id: 'meta-location',
        text: '{location} Edition',
        uppercase: true,
        x: 10,
        y: 120,
        width: 340,
        textAlign: 'left',
        color: 'transparent',
        fontFamily: 'Avenir Next',
        backgroundColor: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
        isBehind: true,
      },
      {
        id: 'story-copy',
        text: 'Inside a [[{time}]] run over [[{distance}]].\nCruising at [[{pace}]] {paceLabelLower}.',
        uppercase: true,
        x: 14,
        y: 180,
        width: 120,
        color: '#FFFFFF',
        opacity: 0.96,
        fontSize: 18,
        lineHeight: 18 * 1.2,
        fontWeight: '600',
        letterSpacing: 0.15,
        accentFontSize: 24,
        accentFontWeight: '900',
        accentLetterSpacing: 0.2,
        fontFamily: 'Helvetica Neue',
      },
      {
        id: 'hr-value',
        text: 'A steady\n[[{avgHr}]]\naverage',
        requiredDataFields: ['avgHr'],
        x: 256,
        y: 200,
        color: '#ffffff',
        accentColor: '#d7000c',
        accentFontWeight: '900',
        fontSize: 16,
        fontFamily: 'Avenir Next',
        fontWeight: '700',
        uppercase: true,
        borderColor: '#ffffff',
        borderWidth: 4,
        borderRadius: 200,
        paddingX: 12,
        paddingY: 20,
      },
      {
        id: 'elev-value',
        text: '{elev}',
        x: 10,
        y: 444,
        color: '#d7000c',
        fontFamily: 'Monoton',
        fontSize: 42,
        fontWeight: '900',
      },
      {
        id: 'elev-label',
        text: 'Of elevation\ngain',
        uppercase: true,
        x: 14,
        y: 488,
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Avenir Next',
        fontWeight: '800',
        letterSpacing: 0.8,
      },
      {
        id: 'calories-label',
        text: 'CALORIES\nBURNED',
        requiredDataFields: ['calories'],
        x: 260,
        y: 400,
        color: '#d7000c',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.8,
        fontFamily: 'Avenir Next',
      },
      {
        id: 'calories-value',
        text: '{calories}',
        requiredDataFields: ['calories'],
        x: 260,
        y: 364,
        color: '#FFFFFF',
        fontSize: 30,
        fontWeight: '900',
      },
      {
        id: 'meta-name',
        text: '{activityName}',
        uppercase: true,
        x: 10,
        y: 582,
        color: '#d7000c',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.6,
        width: 320,
        align: 'left',
      },
    ],
  },
  {
    id: 'template-polaroid',
    name: 'Polaroid',
    disableBackgroundRemoval: true,
    disableVideoBackground: true,
    defaultFilterEffectId: 'cool-night',
    imagePickerCropSize: {
      width: 650,
      height: 735,
    },
    defaultBackground: 'none',
    backgroundMediaFrame: {
      x: 24,
      y: 35,
      width: 312,
      height: 360,
      mediaScale: 1,
      mediaOffsetX: 0,
      mediaOffsetY: 0,
      fit: 'width-crop-center',
    },
    fixedImageElements: [
      {
        id: 'polaroid-bg',
        name: 'Polaroid background',
        asset: require('../assets/templates/polaroid-wood.png'),
        x: 0,
        y: 0,
        width: 360,
        height: 640,
      },
    ],
    fixedTextElements: [
      {
        id: 'meta-date',
        text: '{date}',
        formatDate: 'mm/dd/YYYY',
        uppercase: true,
        x: 32,
        y: 360,
        color: 'orange',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.6,
        fontFamily: 'Courier New',
        width: 300,
      },
      {
        id: 'meta-name',
        text: '{activityName}',
        x: 28,
        y: 406,
        color: '#000000',
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: 0.2,
        fontFamily: 'Autography',
        width: 300,
      },
      {
        id: 'run-distance-location',
        text: 'Run {distance}',
        x: 28,
        y: 442,
        color: '#000000',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.15,
        fontFamily: 'Autography',
        width: 314,
      },
      {
        id: 'time-label',
        text: '{time}',
        x: 32,
        y: 466,
        color: '#000000',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.2,
        fontFamily: 'Autography',
        width: 300,
      },
      {
        id: 'pace-label',
        text: '{pace} {paceLabelLower}',
        x: 32,
        y: 486,
        color: '#000000',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.2,
        fontFamily: 'Autography',
        width: 300,
      },
      {
        id: 'hr-label',
        text: '{avgHr}',
        requiredDataFields: ['avgHr'],
        x: 32,
        y: 506,
        color: '#000000',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.2,
        fontFamily: 'Autography',
        width: 300,
      },
      {
        id: 'cal-label',
        text: '{calories} calories',
        requiredDataFields: ['calories'],
        x: 32,
        y: 526,
        color: '#000000',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.2,
        fontFamily: 'Autography',
        width: 300,
      },
    ],
  },
  {
    id: 'template-neon',
    name: 'Neon',
    premium: true,
    showBackgroundTab: false,
    defaultBackground: 'none',
    fixedImageElements: [
      {
        id: 'grid-bg',
        name: 'Grid background',
        asset: require('../assets/templates/grid-bg.png'),
        x: 0,
        y: 0,
        width: 360,
        height: 640,
      },
    ],
    fixedTextElements: [
      {
        id: 'distance-label',
        text: 'Distance',
        uppercase: true,
        x: 23,
        y: 76,
        color: '#a1a1a1',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
      },
      {
        id: 'distance-value',
        text: '[[{distanceValue}]]\n{distanceUnit}',
        uppercase: true,
        x: 28,
        y: 100,
        color: '#a9e450',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
        accentFontSize: 28,
        accentFontWeight: '500',
        lineHeight: 28,
        borderColor: '#5a5a5a',
        borderWidth: 1,
        borderRadius: 0,
        paddingX: 4,
        paddingY: 4,
        width: 104,
        align: 'center',
      },
      {
        id: 'hr-label',
        text: 'AVG HR',
        uppercase: true,
        x: 131,
        y: 76,
        color: '#a1a1a1',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
      },
      {
        id: 'hr-value',
        text: '[[{avgHrValue}]]\n{avgHrUnit}',
        uppercase: true,
        x: 136,
        y: 100,
        color: '#a9e450',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
        accentFontSize: 28,
        accentFontWeight: '500',
        lineHeight: 28,
        borderColor: '#5a5a5a',
        borderWidth: 1,
        borderRadius: 0,
        paddingX: 4,
        paddingY: 4,
        width: 92,
        align: 'center',
      },
      {
        id: 'cal-label',
        text: 'Calories',
        uppercase: true,
        x: 227,
        y: 76,
        color: '#a1a1a1',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
      },
      {
        id: 'cal-value',
        text: '[[{calories}]]\nCal',
        uppercase: true,
        x: 232,
        y: 100,
        color: '#a9e450',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
        accentFontSize: 28,
        accentFontWeight: '500',
        lineHeight: 28,
        borderColor: '#5a5a5a',
        borderWidth: 1,
        borderRadius: 0,
        paddingX: 4,
        paddingY: 4,
        width: 104,
        align: 'center',
      },
      {
        id: 'pace-label',
        text: '[[{paceValue}]] {paceUnit}',
        uppercase: true,
        x: 0,
        y: 640 / 2 - 80,
        color: '#b1ec5e',
        fontSize: 32,
        fontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
        width: 360,
        align: 'center',
        glowColor: '#b1ec5e',
        glowRadius: 8,
        accentFontSize: 90,
        accentFontWeight: '400',
        lineHeight: 94,
      },
      {
        id: 'elev-label',
        text: '+{elev}',
        uppercase: true,
        x: 260,
        y: 640 / 2 - 100,
        color: '#a9e450',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
        width: 300,
      },
      {
        id: 'meta-date-location',
        text: '{date} - {location}',
        formatDate: 'mm/dd/YYYY',
        uppercase: true,
        x: 0,
        y: 486,
        color: '#a1a1a1',
        fontSize: 12,
        fontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
        width: 360,
        align: 'right',
        paddingX: 26,
      },
      {
        id: 'time-label',
        text: 'Duration     [[{time}]]',
        uppercase: true,
        x: 32,
        y: 514,
        color: '#a1a1a1',
        fontSize: 14,
        fontWeight: '400',
        accentColor: '#a9e450',
        accentFontSize: 24,
        lineHeight: 28,
        accentFontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
      },
      {
        id: 'meta-name',
        text: '{activityName}',
        uppercase: true,
        x: 32,
        y: 556,
        color: '#a1a1a1',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
      },
    ],
    fixedChartElements: [
      {
        id: 'pace-chart-a',
        kind: 'pace',
        x: 360 / 2 - 100,
        y: 380,
        width: 200,
        height: 90,
        color: '#a9e450',
        showAxes: true,
        showGrid: false,
        orientation: 'vertical',
        fillStyle: 'gradient',
      },
    ],
  },
  {
    id: 'template-ticket',
    name: 'Ticket',
    premium: true,
    showBackgroundTab: false,
    defaultBackground: 'none',
    showRoute: true,
    routeTransform: {
      x: 122,
      y: 340,
      scale: 0.7,
    },
    layerStyleOverrides: {
      route: { color: '#101010', opacity: 0.8 },
    },
    fixedImageElements: [
      {
        id: 'grid-bg',
        name: 'Grid background',
        asset: require('../assets/templates/ticket-run.png'),
        isBehind: true,
        x: 0,
        y: 0,
        width: 360,
        height: 640,
      },
    ],
    fixedTextElements: [
      {
        id: 'distance-label',
        text: '[[{distanceValue}]] {distanceUnit}',
        uppercase: true,
        x: 22,
        y: 120,
        color: '#101010',
        fontSize: 32,
        accentFontSize: 72,
        lineHeight: 76,
        fontWeight: '800',
        letterSpacing: 0.6,
        fontFamily: 'Helvetica Neue',
        opacity: 0.8,
      },
      {
        id: 'time-label',
        text: '{time}',
        uppercase: true,
        x: 22,
        y: 237,
        color: '#101010',
        fontSize: 28,
        lineHeight: 36,
        fontWeight: '800',
        letterSpacing: 0.6,
        fontFamily: 'Helvetica Neue',
        opacity: 0.8,
      },
      {
        id: 'pace-label',
        text: '[[{paceValue}]] {paceUnit}',
        uppercase: true,
        x: 152,
        y: 238,
        color: '#101010',
        fontSize: 20,
        fontWeight: '800',
        accentFontSize: 32,
        lineHeight: 36,
        letterSpacing: 0.6,
        fontFamily: 'Helvetica Neue',
        opacity: 0.8,
      },
      {
        id: 'cal-label',
        text: '[[{calories}]] Cal.',
        uppercase: true,
        x: 22,
        y: 308,
        color: '#101010',
        fontSize: 20,
        fontWeight: '800',
        accentFontSize: 32,
        lineHeight: 36,
        letterSpacing: 0.6,
        fontFamily: 'Helvetica Neue',
        opacity: 0.8,
      },
      {
        id: 'meta-date',
        text: '{date}',
        formatDate: 'dd MMM YYYY',
        uppercase: true,
        x: 22,
        y: 390,
        color: '#101010',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
        opacity: 0.8,
      },
      {
        id: 'meta-location',
        text: '{location}',
        uppercase: true,
        x: 22,
        y: 442,
        color: '#101010',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.6,
        fontFamily: 'Arial',
        opacity: 0.8,
      },
      {
        id: 'meta-name',
        text: '{activityName}',
        uppercase: true,
        x: 0,
        y: 542,
        color: '#101010',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.6,
        fontFamily: 'Helvetica Neue',
        width: 360,
        align: 'center',
        opacity: 0.8,
      },
    ],
  },
  {
    id: 'template-easy',
    name: 'Easy',
    defaultBackground: 'none',
    defaultBlurEffectId: 'background-blur',
    defaultFilterEffectId: 'black-and-white',
    showRoute: false,
    fixedTextElements: [
      {
        id: 'title',
        text: 'EASY',
        uppercase: true,
        x: 0,
        y: 640 / 2 - 60,
        color: '#ffffff',
        fontSize: 80,
        fontFamily: 'Georgia',
        fontWeight: '900',
        letterSpacing: 2,
        width: 360,
        align: 'center',
      },
      {
        id: 'data',
        text: '[[{distanceValue}]] {distanceUnit} · [[{paceValue}]] {paceUnit} · [[{time}]]',
        x: 0,
        y: 380,
        color: '#ffffff',
        fontFamily: 'Arial',
        accentFontFamily: 'Helvetica Neue',
        accentFontSize: 24,
        accentFontWeight: '500',
        lineHeight: 28,
        fontSize: 16,
        fontWeight: '400',
        width: 360,
        align: 'center',
      },
      {
        id: 'location-date',
        text: '{location} · {date}',
        uppercase: true,
        formatDate: 'MMMM dd, YYYY',
        x: 0,
        y: 500,
        color: '#3c3c3c',
        fontSize: 16,
        fontWeight: '400',
        width: 360,
        align: 'center',
        fontFamily: 'Arial',
      },
    ],
  },
  {
    id: 'template-sky-script',
    name: 'Sky Script',
    premium: true,
    defaultBackground: 'activity-photo',
    disableBackgroundRemoval: true,
    disableVideoBackground: true,
    showRoute: false,
    fixedTextElements: [
      {
        id: 'distance-label',
        text: 'DISTANCE',
        requiredDataFields: ['distance'],
        renderStyle: 'scattered',
        uppercase: true,
        x: 42,
        y: 120,
        width: 136,
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.6,
        fontFamily: 'DCCCloud',
        glowColor: 'rgba(255,255,255,0.2)',
        glowRadius: 3,
      },
      {
        id: 'distance-value',
        text: '{distance}',
        requiredDataFields: ['distance'],
        renderStyle: 'scattered',
        uppercase: true,
        x: 26,
        y: 146,
        width: 170,
        color: '#ffffff',
        fontSize: 32,
        lineHeight: 34,
        fontWeight: '700',
        letterSpacing: 0.02,
        fontFamily: 'DCCCloud',
        glowColor: 'rgba(255,255,255,0.28)',
        glowRadius: 4,
      },
      {
        id: 'pace-label',
        text: '{paceLabel}',
        requiredDataFields: ['pace'],
        renderStyle: 'scattered',
        uppercase: true,
        x: 236,
        y: 120,
        width: 82,
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.6,
        fontFamily: 'DCCCloud',
        glowColor: 'rgba(255,255,255,0.2)',
        glowRadius: 3,
        align: 'left',
      },
      {
        id: 'pace-value',
        text: '{pace}',
        requiredDataFields: ['pace'],
        renderStyle: 'scattered',
        uppercase: true,
        x: 214,
        y: 146,
        width: 132,
        color: '#ffffff',
        fontSize: 25,
        lineHeight: 27,
        fontWeight: '700',
        letterSpacing: 0.02,
        fontFamily: 'DCCCloud',
        glowColor: 'rgba(255,255,255,0.28)',
        glowRadius: 4,
        align: 'left',
      },
      {
        id: 'time-label',
        text: 'TIME',
        renderStyle: 'scattered',
        uppercase: true,
        x: 118,
        y: 64,
        width: 96,
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontFamily: 'DCCCloud',
        glowColor: 'rgba(255,255,255,0.18)',
        glowRadius: 3,
        align: 'center',
      },
      {
        id: 'time-value',
        text: '{time}',
        renderStyle: 'scattered',
        uppercase: true,
        x: 90,
        y: 84,
        width: 144,
        color: '#ffffff',
        fontSize: 24,
        lineHeight: 26,
        fontWeight: '700',
        letterSpacing: 0.02,
        fontFamily: 'DCCCloud',
        glowColor: 'rgba(255,255,255,0.24)',
        glowRadius: 4,
        align: 'center',
      },
    ],
  },
];

export const DEFAULT_PREVIEW_TEMPLATE_ID =
  PREVIEW_TEMPLATES[0]?.id ?? 'template-runners-zine';

export function getPreviewTemplateById(templateId: string | null | undefined) {
  if (!templateId) return null;
  return PREVIEW_TEMPLATES.find((item) => item.id === templateId) ?? null;
}

const FIELD_IDS = new Set<FieldId>([
  'distance',
  'time',
  'pace',
  'elev',
  'cadence',
  'calories',
  'avgHr',
]);

const TEMPLATE_LAYER_STYLE_IDS = new Set<TemplateLayerStyleId>([
  'meta',
  'stats',
  'route',
  'primary',
  'chartPace',
  'chartHr',
]);

const CHART_DISPLAY_VERSIONS = new Set<ChartDisplayVersion>([
  'v1',
  'v2',
  'v3',
  'v4',
]);

const CHART_ORIENTATIONS = new Set<ChartOrientation>([
  'vertical',
  'horizontal',
]);

const CHART_FILL_STYLES = new Set<ChartFillStyle>(['gradient', 'plain']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function asOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
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

function asFontWeight(value: unknown) {
  if (typeof value !== 'string') return undefined;
  return ['300', '400', '500', '600', '700', '800', '900'].includes(value)
    ? (value as PreviewTemplateTextElement['fontWeight'])
    : undefined;
}

function asAccentFontWeight(value: unknown) {
  if (typeof value !== 'string') return undefined;
  return ['400', '500', '600', '700', '800', '900'].includes(value)
    ? (value as PreviewTemplateTextElement['accentFontWeight'])
    : undefined;
}

function asTextAlign(value: unknown) {
  return value === 'left' || value === 'center' || value === 'right'
    ? value
    : undefined;
}

function asRequiredDataFields(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const fields = value.filter(
    (item): item is FieldId =>
      typeof item === 'string' && FIELD_IDS.has(item as FieldId),
  );
  return fields.length > 0 ? Array.from(new Set(fields)) : undefined;
}

function sanitizeImageElement(value: unknown): PreviewTemplateImageElement | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const name = asString(value.name);
  const x = asNumber(value.x);
  const y = asNumber(value.y);
  const width = asNumber(value.width);
  const height = asNumber(value.height);
  const uri = asOptionalString(value.uri);
  const assetKey = asOptionalString(value.assetKey);
  const asset = assetKey ? TEMPLATE_ASSETS[assetKey] : undefined;

  if (!id || !name || x === null || y === null || width === null || height === null) {
    return null;
  }
  if (!uri && typeof asset !== 'number') return null;

  return {
    id,
    name,
    ...(uri ? { uri } : {}),
    ...(typeof asset === 'number' ? { asset } : {}),
    isBehind: asOptionalBoolean(value.isBehind),
    x,
    y,
    width,
    height,
    opacity: asOptionalNumber(value.opacity),
    rotationDeg: asOptionalNumber(value.rotationDeg),
  };
}

function sanitizeTextElement(value: unknown): PreviewTemplateTextElement | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const text = asString(value.text);
  const x = asNumber(value.x);
  const y = asNumber(value.y);

  if (!id || text === null || x === null || y === null) return null;

  return {
    id,
    text,
    renderStyle: value.renderStyle === 'scattered' ? 'scattered' : undefined,
    formatDate: asOptionalString(value.formatDate),
    requiredDataFields: asRequiredDataFields(value.requiredDataFields),
    isBehind: asOptionalBoolean(value.isBehind),
    x,
    y,
    width: asOptionalNumber(value.width),
    align: asTextAlign(value.align),
    textAlign: asTextAlign(value.textAlign),
    color: asOptionalString(value.color),
    backgroundColor: asOptionalString(value.backgroundColor),
    borderColor: asOptionalString(value.borderColor),
    borderWidth: asOptionalNumber(value.borderWidth),
    borderRadius: asOptionalNumber(value.borderRadius),
    paddingX: asOptionalNumber(value.paddingX),
    paddingY: asOptionalNumber(value.paddingY),
    opacity: asOptionalNumber(value.opacity),
    fontFamily: asOptionalString(value.fontFamily),
    fontSize: asOptionalNumber(value.fontSize),
    fontWeight: asFontWeight(value.fontWeight),
    letterSpacing: asOptionalNumber(value.letterSpacing),
    lineHeight: asOptionalNumber(value.lineHeight),
    uppercase: asOptionalBoolean(value.uppercase),
    accentFontSize: asOptionalNumber(value.accentFontSize),
    accentFontWeight: asAccentFontWeight(value.accentFontWeight),
    accentLetterSpacing: asOptionalNumber(value.accentLetterSpacing),
    accentColor: asOptionalString(value.accentColor),
    accentFontFamily: asOptionalString(value.accentFontFamily),
    glowColor: asOptionalString(value.glowColor),
    glowRadius: asOptionalNumber(value.glowRadius),
    glowOffsetX: asOptionalNumber(value.glowOffsetX),
    glowOffsetY: asOptionalNumber(value.glowOffsetY),
  };
}

function sanitizeChartElement(value: unknown): PreviewTemplateChartElement | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const kind = value.kind === 'pace' || value.kind === 'hr' ? value.kind : null;
  const x = asNumber(value.x);
  const y = asNumber(value.y);
  const width = asNumber(value.width);
  const height = asNumber(value.height);

  if (
    !id ||
    !kind ||
    x === null ||
    y === null ||
    width === null ||
    height === null
  ) {
    return null;
  }

  const version =
    typeof value.version === 'string' &&
    CHART_DISPLAY_VERSIONS.has(value.version as ChartDisplayVersion)
      ? (value.version as ChartDisplayVersion)
      : undefined;
  const orientation =
    typeof value.orientation === 'string' &&
    CHART_ORIENTATIONS.has(value.orientation as ChartOrientation)
      ? (value.orientation as ChartOrientation)
      : undefined;
  const fillStyle =
    typeof value.fillStyle === 'string' &&
    CHART_FILL_STYLES.has(value.fillStyle as ChartFillStyle)
      ? (value.fillStyle as ChartFillStyle)
      : undefined;

  return {
    id,
    kind,
    x,
    y,
    width,
    height,
    isBehind: asOptionalBoolean(value.isBehind),
    opacity: asOptionalNumber(value.opacity),
    color: asOptionalString(value.color),
    version,
    showAxes: asOptionalBoolean(value.showAxes),
    showGrid: asOptionalBoolean(value.showGrid),
    orientation,
    fillStyle,
  };
}

function sanitizeLayerStyleOverrides(value: unknown) {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value).flatMap(([key, style]) => {
    if (!TEMPLATE_LAYER_STYLE_IDS.has(key as TemplateLayerStyleId)) return [];
    if (!isRecord(style)) return [];
    const color = asString(style.color);
    const opacity = asNumber(style.opacity);
    if (!color || opacity === null) return [];
    return [[key, { color, opacity }]];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function sanitizeRouteTransform(value: unknown) {
  if (!isRecord(value)) return undefined;

  const x = asNumber(value.x);
  const y = asNumber(value.y);
  if (x === null || y === null) return undefined;

  return {
    x,
    y,
    scale: asOptionalNumber(value.scale),
    rotationDeg: asOptionalNumber(value.rotationDeg),
  };
}

function sanitizeImagePickerCropSize(value: unknown) {
  if (!isRecord(value)) return undefined;
  const width = asNumber(value.width);
  const height = asNumber(value.height);
  if (width === null || height === null) return undefined;
  return { width, height };
}

function sanitizeBackgroundMediaFrame(value: unknown) {
  if (!isRecord(value)) return undefined;

  const width = asNumber(value.width);
  const height = asNumber(value.height);
  if (width === null || height === null) return undefined;
  const fit: BackgroundMediaFit =
    value.fit === 'cover' ||
    value.fit === 'contain' ||
    value.fit === 'width-crop-center'
      ? value.fit
      : undefined;

  return {
    width,
    height,
    x: asOptionalNumber(value.x),
    y: asOptionalNumber(value.y),
    mediaScale: asOptionalNumber(value.mediaScale),
    mediaOffsetX: asOptionalNumber(value.mediaOffsetX),
    mediaOffsetY: asOptionalNumber(value.mediaOffsetY),
    fit,
  };
}

export function sanitizePreviewTemplate(
  value: unknown,
): PreviewTemplateDefinition | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;

  const fixedImageElements = Array.isArray(value.fixedImageElements)
    ? value.fixedImageElements
        .map((item) => sanitizeImageElement(item))
        .filter((item): item is PreviewTemplateImageElement => Boolean(item))
    : undefined;
  const fixedTextElements = Array.isArray(value.fixedTextElements)
    ? value.fixedTextElements
        .map((item) => sanitizeTextElement(item))
        .filter((item): item is PreviewTemplateTextElement => Boolean(item))
    : undefined;
  const fixedChartElements = Array.isArray(value.fixedChartElements)
    ? value.fixedChartElements
        .map((item) => sanitizeChartElement(item))
        .filter((item): item is PreviewTemplateChartElement => Boolean(item))
    : undefined;

  return {
    id,
    name,
    premium: asOptionalBoolean(value.premium),
    showBackgroundTab: asOptionalBoolean(value.showBackgroundTab),
    disableBackgroundRemoval: asOptionalBoolean(value.disableBackgroundRemoval),
    disableVideoBackground: asOptionalBoolean(value.disableVideoBackground),
    imagePickerCropSize: sanitizeImagePickerCropSize(value.imagePickerCropSize),
    defaultBackground:
      value.defaultBackground === 'activity-photo' ||
      value.defaultBackground === 'none'
        ? value.defaultBackground
        : undefined,
    defaultFilterEffectId: asOptionalString(value.defaultFilterEffectId),
    defaultBlurEffectId: asOptionalString(value.defaultBlurEffectId),
    showRoute: asOptionalBoolean(value.showRoute),
    routeTransform: sanitizeRouteTransform(value.routeTransform),
    layerStyleOverrides: sanitizeLayerStyleOverrides(value.layerStyleOverrides),
    fixedImageElements,
    fixedChartElements,
    fixedTextElements,
    backgroundMediaFrame: sanitizeBackgroundMediaFrame(
      value.backgroundMediaFrame,
    ),
  };
}

export function sanitizePreviewTemplates(
  value: unknown,
): PreviewTemplateDefinition[] | null {
  if (!Array.isArray(value)) return null;

  const templates = value
    .map((item) => sanitizePreviewTemplate(item))
    .filter((item): item is PreviewTemplateDefinition => Boolean(item));
  const ids = new Set<string>();
  const uniqueTemplates = templates.filter((template) => {
    if (ids.has(template.id)) return false;
    ids.add(template.id);
    return true;
  });

  return uniqueTemplates.length > 0 ? uniqueTemplates : null;
}
