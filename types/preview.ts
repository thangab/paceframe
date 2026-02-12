export type FieldId = 'title' | 'date' | 'distance' | 'time' | 'pace' | 'elev';
export type RouteMode = 'off' | 'map' | 'trace';
export type StatsLayout = 'row' | 'stack' | 'inline' | 'right';
export type BaseLayerId = 'meta' | 'stats' | 'route';
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
};
