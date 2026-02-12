import { create } from 'zustand';
import { StravaActivity } from '@/types/strava';

type ActivitySource = 'strava' | 'healthkit';

type ActivityState = {
  activities: StravaActivity[];
  selectedActivityId: number | null;
  source: ActivitySource;
  setActivities: (activities: StravaActivity[], source?: ActivitySource) => void;
  clearActivities: () => void;
  selectActivity: (activityId: number) => void;
  selectedActivity: () => StravaActivity | null;
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  selectedActivityId: null,
  source: 'strava',
  setActivities: (activities, source = 'strava') => {
    const selected = get().selectedActivityId;
    const stillExists = activities.some((a) => a.id === selected);

    set({
      activities,
      source,
      selectedActivityId: stillExists ? selected : activities[0]?.id ?? null,
    });
  },
  clearActivities: () =>
    set({
      activities: [],
      selectedActivityId: null,
      source: 'strava',
    }),
  selectActivity: (selectedActivityId) => set({ selectedActivityId }),
  selectedActivity: () => {
    const { activities, selectedActivityId } = get();
    if (!selectedActivityId) return null;
    return activities.find((item) => item.id === selectedActivityId) ?? null;
  },
}));
