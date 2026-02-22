import { StravaActivity } from '@/types/strava';

function buildMockLaps(baseId: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const lapIndex = index + 1;
    const movingTime = 280 + ((lapIndex * 7) % 22) - 11;
    const elapsedTime = movingTime + 4;
    const averageSpeed = 1000 / movingTime;
    const averageHeartrate = 148 + ((lapIndex * 3) % 18);
    return {
      id: baseId + lapIndex,
      lap_index: lapIndex,
      distance: 1000,
      moving_time: movingTime,
      elapsed_time: elapsedTime,
      average_speed: Number(averageSpeed.toFixed(2)),
      average_heartrate: averageHeartrate,
      max_heartrate: averageHeartrate + 8,
    };
  });
}

export const mockActivities: StravaActivity[] = [
  {
    id: 900001,
    name: 'Morning Tempo',
    distance: 10320,
    moving_time: 3020,
    elapsed_time: 3180,
    total_elevation_gain: 42,
    type: 'Run',
    start_date: '2026-02-08T06:20:00Z',
    start_latlng: [48.8566, 2.3522],
    average_speed: 3.42,
    average_cadence: 168,
    average_heartrate: 156,
    // kilojoules: 462,
    location_city: 'Paris',
    location_country: 'France',
    map: {
      summary_polyline: 'gfo}EtohhUxD@bAxJmGF',
    },
    laps: buildMockLaps(9_000_010, 11),
    heartRateStream: [
      { seconds: 0, bpm: 118 },
      { seconds: 300, bpm: 144 },
      { seconds: 600, bpm: 151 },
      { seconds: 900, bpm: 156 },
      { seconds: 1200, bpm: 159 },
      { seconds: 1500, bpm: 162 },
      { seconds: 1800, bpm: 158 },
      { seconds: 2100, bpm: 155 },
      { seconds: 2400, bpm: 153 },
      { seconds: 2700, bpm: 150 },
      { seconds: 3000, bpm: 146 },
    ],
    photoUrl:
      'https://images.unsplash.com/photo-1729275146090-65232947011b?auto=format&fit=crop&w=600&q=100',
  },
  {
    id: 900002,
    name: 'Easy Recovery',
    distance: 5100,
    moving_time: 1760,
    elapsed_time: 1820,
    total_elevation_gain: 18,
    type: 'Run',
    start_date: '2026-02-06T18:20:00Z',
    start_latlng: [45.764, 4.8357],
    average_speed: 2.9,
    average_cadence: 162,
    average_heartrate: 141,
    kilojoules: 305,
    location_city: 'Lyon',
    location_country: 'France',
    map: {
      summary_polyline: 'o~ocF~kbkVfS~@vCjBvD',
    },
    laps: buildMockLaps(9_000_010, 6),

    heartRateStream: [
      { seconds: 0, bpm: 112 },
      { seconds: 240, bpm: 126 },
      { seconds: 480, bpm: 134 },
      { seconds: 720, bpm: 140 },
      { seconds: 960, bpm: 143 },
      { seconds: 1200, bpm: 142 },
      { seconds: 1440, bpm: 139 },
      { seconds: 1680, bpm: 134 },
    ],
    photoUrl:
      'https://images.unsplash.com/photo-1758506971986-b0d0edebd8d5?auto=format&fit=crop&w=600&q=100',
  },
  {
    id: 900003,
    name: 'Long Run',
    distance: 21500,
    moving_time: 7000,
    elapsed_time: 7250,
    total_elevation_gain: 120,
    type: 'Run',
    start_date: '2026-02-02T05:15:00Z',
    start_latlng: [45.8992, 6.1294],
    average_speed: 3.07,
    average_cadence: 171,
    average_heartrate: 152,
    kilojoules: 910,
    location_city: 'Annecy',
    location_country: 'France',
    map: {
      summary_polyline: 'mfp_Ix~vpAqCwAqBsBqCaC',
    },
    laps: buildMockLaps(9_000_010, 22),

    heartRateStream: [
      { seconds: 0, bpm: 110 },
      { seconds: 600, bpm: 132 },
      { seconds: 1200, bpm: 144 },
      { seconds: 1800, bpm: 151 },
      { seconds: 2400, bpm: 156 },
      { seconds: 3000, bpm: 160 },
      { seconds: 3600, bpm: 162 },
      { seconds: 4200, bpm: 159 },
      { seconds: 4800, bpm: 155 },
      { seconds: 5400, bpm: 149 },
      { seconds: 6000, bpm: 143 },
      { seconds: 6600, bpm: 137 },
    ],
    photoUrl:
      'https://images.unsplash.com/photo-1755764712308-f2b35315d626?auto=format&fit=crop&crop=bottom&h=800&w=600&q=100',
  },
];
