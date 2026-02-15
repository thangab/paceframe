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
export type StatsLayout =
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
export type BaseLayerId = 'meta' | 'stats' | 'route' | 'primary';
export type LayerId = BaseLayerId | `image:${string}`;

export type StatsTemplate = {
  id: string;
  name: string;
  layout: StatsLayout;
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
