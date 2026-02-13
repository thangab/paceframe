import { FontPreset, StatsTemplate } from '@/types/preview';

export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;
export const MAX_VIDEO_DURATION_SECONDS = 30;
export const CHECKER_SIZE = 20;

export const TEMPLATES: StatsTemplate[] = [
  {
    id: 'row',
    name: 'Hero',
    layout: 'row',
    x: 16,
    y: 305,
    width: 288,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'stack',
    name: 'Vertical',
    layout: 'stack',
    premium: false,
    x: 70,
    y: 206,
    width: 300,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'inline',
    name: 'Compact',
    layout: 'inline',
    premium: false,
    x: 20,
    y: 350,
    width: 280,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'right',
    name: 'Columns',
    layout: 'right',
    premium: false,
    x: 12,
    y: 360,
    width: 350,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'grid',
    name: 'Grid 2x2',
    layout: 'grid',
    premium: false,
    x: 18,
    y: 290,
    width: 284,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
];

export const FONT_PRESETS: FontPreset[] = [
  { id: 'system', name: 'System', weightTitle: '800', weightValue: '900' },
  {
    id: 'serif',
    name: 'Serif',
    family: 'serif',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'mono',
    name: 'Mono',
    family: 'monospace',
    weightTitle: '700',
    weightValue: '800',
  },
];
