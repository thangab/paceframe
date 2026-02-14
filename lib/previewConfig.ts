import { FontPreset, StatsTemplate } from '@/types/preview';

export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;
export const MAX_VIDEO_DURATION_SECONDS = 30;
export const CHECKER_SIZE = 20;

export const TEMPLATES: StatsTemplate[] = [
  {
    id: 'hero',
    name: 'Hero',
    layout: 'row',
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
    layout: 'stack',
    premium: false,
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
    layout: 'inline',
    premium: false,
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
    layout: 'right',
    premium: false,
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
    layout: 'grid',
    premium: true,
    x: 18,
    y: 420,
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
