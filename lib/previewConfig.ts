import { FontPreset, StatsLayout } from '@/types/preview';
import { PREVIEW_LAYOUTS } from '@/lib/previewLayouts';

export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;
export const MAX_VIDEO_DURATION_SECONDS = 30;
export const CHECKER_SIZE = 20;

export const LAYOUTS: StatsLayout[] = PREVIEW_LAYOUTS;
export const TEMPLATES: StatsLayout[] = LAYOUTS;

export const FONT_PRESETS: FontPreset[] = [
  {
    id: 'avenir',
    name: 'Avenir Next',
    family: 'Avenir Next',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'rounded',
    name: 'Gill Sans',
    family: 'Gill Sans',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'condensed',
    name: 'sans-serif-condensed',
    family: 'sans-serif-condensed',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'georgia',
    name: 'Georgia',
    family: 'Georgia',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'helvetica',
    name: 'Helvetica Neue',
    family: 'Helvetica Neue',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'times',
    name: 'Times New Roman',
    family: 'Times New Roman',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'courier',
    name: 'Courier New',
    family: 'Courier New',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'verdana',
    name: 'Verdana',
    family: 'Verdana',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'trebuchet',
    name: 'Trebuchet MS',
    family: 'Trebuchet MS',
    weightTitle: '700',
    weightValue: '800',
  },
  {
    id: 'monoton',
    name: 'Monoton',
    family: 'Monoton',
    weightTitle: '700',
    weightValue: '800',
  },
];
