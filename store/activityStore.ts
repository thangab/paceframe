import { create } from 'zustand';
import { StravaActivity } from '@/types/strava';

type ActivityState = {
  activities: StravaActivity[];
  selectedActivityId: number | null;
  setActivities: (activities: StravaActivity[]) => void;
  selectActivity: (activityId: number) => void;
  selectedActivity: () => StravaActivity | null;
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  selectedActivityId: null,
  setActivities: (activities) => {
    const selected = get().selectedActivityId;
    const stillExists = activities.some((a) => a.id === selected);

    set({
      activities,
      selectedActivityId: stillExists ? selected : activities[0]?.id ?? null,
    });
  },
  selectActivity: (selectedActivityId) => set({ selectedActivityId }),
  selectedActivity: () => {
    const { activities, selectedActivityId } = get();
    if (!selectedActivityId) return null;
    return activities.find((item) => item.id === selectedActivityId) ?? null;
  },
}));
