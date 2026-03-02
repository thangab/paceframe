import { MaterialCommunityIcons } from '@expo/vector-icons';

export type PreviewPanelTab =
  | 'background'
  | 'content'
  | 'design'
  | 'effects';

export type HeaderFieldId = 'title' | 'date' | 'location';

export type VisualEffectPreset = {
  id: string;
  label: string;
  description?: string;
  backgroundOverlayColor: string;
  backgroundOverlayOpacity: number;
  subjectOverlayColor: string;
  subjectOverlayOpacity: number;
};

export type StyleLayerId =
  | 'meta'
  | 'stats'
  | 'route'
  | 'primary'
  | 'chartPace'
  | 'chartHr';

export type PanelTabItem = {
  id: PreviewPanelTab;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  disabled?: boolean;
};
