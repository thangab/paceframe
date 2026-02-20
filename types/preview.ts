export type FieldId =
  | 'distance'
  | 'time'
  | 'pace'
  | 'elev'
  | 'cadence'
  | 'calories'
  | 'avgHr';
export type RouteMode = 'off' | 'map' | 'trace';
export type RouteMapVariant = 'standard' | 'dark' | 'satellite';
export type ChartOrientation = 'vertical' | 'horizontal';
export type ChartFillStyle = 'gradient' | 'plain';
export type StatsLayoutKind =
  | 'hero'
  | 'vertical'
  | 'compact'
  | 'columns'
  | 'grid-2x2'
  | 'glass-row'
  | 'soft-stack'
  | 'pill-inline'
  | 'card-columns'
  | 'panel-grid'
  | 'sunset-hero'
  | 'morning-glass'
  | 'split-bold';
export type BaseLayerId =
  | 'meta'
  | 'stats'
  | 'route'
  | 'primary'
  | 'chartPace'
  | 'chartHr';
export type LayerId = BaseLayerId | `image:${string}`;

export type StatsLayout = {
  id: string;
  name: string;
  layout: StatsLayoutKind;
  premium?: boolean;
  x: number;
  y: number;
  width: number;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
};

export type FontPreset = {
  id: string;
  name: string;
  family?: string;
  weightTitle: '600' | '700' | '800' | '900';
  weightValue: '700' | '800' | '900';
};

export type ImageOverlay = {
  id: string;
  uri: string;
  asset?: number;
  name: string;
  opacity: number;
  rotationDeg: number;
  width: number;
  height: number;
};

export type BackgroundGradient = {
  colors: [string, string, string];
  direction: 'vertical' | 'horizontal';
};

export type TemplateLayerStyleId =
  | 'meta'
  | 'stats'
  | 'route'
  | 'primary'
  | 'chartPace'
  | 'chartHr';

export type TemplateLayerStyle = {
  color: string;
  opacity: number;
};

export type PreviewTemplateImageElement = {
  id: string;
  name: string;
  uri?: string;
  asset?: number;
  isBehind?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  rotationDeg?: number;
};

export type PreviewTemplateChartElement = {
  id: string;
  kind: 'pace' | 'hr';
  x: number;
  y: number;
  width: number;
  height: number;
  isBehind?: boolean;
  opacity?: number;
  color?: string;
  showAxes?: boolean;
  showGrid?: boolean;
  orientation?: ChartOrientation;
  fillStyle?: ChartFillStyle;
};

export type PreviewTemplateTextElement = {
  id: string;
  text: string;
  formatDate?: string;
  requiredDataFields?: FieldId[];
  isBehind?: boolean;
  x: number;
  y: number;
  width?: number;
  align?: 'left' | 'center' | 'right';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  opacity?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: '300' | '400' | '500' | '600' | '700' | '800' | '900';
  letterSpacing?: number;
  lineHeight?: number;
  uppercase?: boolean;
  accentFontSize?: number;
  accentFontWeight?: '400' | '500' | '600' | '700' | '800' | '900';
  accentLetterSpacing?: number;
  accentColor?: string;
  accentFontFamily?: string;
  glowColor?: string;
  glowRadius?: number;
  glowOffsetX?: number;
  glowOffsetY?: number;
};

export type PreviewTemplateTextToken = {
  text: string;
  accent?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: '400' | '500' | '600' | '700' | '800' | '900';
  letterSpacing?: number;
  color?: string;
};

export type PreviewTemplateRenderableTextElement = Omit<
  PreviewTemplateTextElement,
  'text' | 'uppercase'
> & {
  tokens: PreviewTemplateTextToken[];
};

export type PreviewTemplateDefinition = {
  id: string;
  name: string;
  premium?: boolean;
  showBackgroundTab?: boolean;
  disableBackgroundRemoval?: boolean;
  disableVideoBackground?: boolean;
  imagePickerCropSize?: {
    width: number;
    height: number;
  };
  defaultBackground?: 'activity-photo' | 'none';
  defaultFilterEffectId?: string;
  defaultBlurEffectId?: string;
  showRoute?: boolean;
  routeTransform?: {
    x: number;
    y: number;
    scale?: number;
    rotationDeg?: number;
  };
  layerStyleOverrides?: Partial<
    Record<TemplateLayerStyleId, TemplateLayerStyle>
  >;
  fixedImageElements?: PreviewTemplateImageElement[];
  fixedChartElements?: PreviewTemplateChartElement[];
  fixedTextElements?: PreviewTemplateTextElement[];
  backgroundMediaFrame?: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    mediaScale?: number;
    mediaOffsetX?: number;
    mediaOffsetY?: number;
    fit?: 'cover' | 'contain' | 'width-crop-center';
  };
};
