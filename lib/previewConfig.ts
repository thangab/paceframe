import { FontPreset, StatsTemplate } from '@/types/preview';

export const STORY_WIDTH = 320;
export const STORY_HEIGHT = 568;
export const MAX_VIDEO_DURATION_SECONDS = 30;
export const CHECKER_SIZE = 20;

export const TEMPLATES: StatsTemplate[] = [
  {
    id: 'row',
    name: 'Row',
    layout: 'row',
    x: 22,
    y: 430,
    width: 278,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 12,
  },
  {
    id: 'stack',
    name: 'Stack',
    layout: 'stack',
    premium: false,
    x: 92,
    y: 350,
    width: 136,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderColor: '#22D3EE',
    borderWidth: 1,
    radius: 14,
  },
  {
    id: 'inline',
    name: 'Inline',
    layout: 'inline',
    premium: false,
    x: 36,
    y: 430,
    width: 248,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    radius: 0,
  },
  {
    id: 'right',
    name: 'Right Rail',
    layout: 'right',
    premium: false,
    x: 196,
    y: 350,
    width: 108,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    radius: 10,
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
