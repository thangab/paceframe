let initialStravaLoadDone = false;
let initialStravaLoadInFlight: Promise<void> | null = null;

export function getInitialStravaLoadDone() {
  return initialStravaLoadDone;
}

export function setInitialStravaLoadDone(value: boolean) {
  initialStravaLoadDone = value;
}

export function getInitialStravaLoadInFlight() {
  return initialStravaLoadInFlight;
}

export function setInitialStravaLoadInFlight(value: Promise<void> | null) {
  initialStravaLoadInFlight = value;
}

export function resetActivityLoadState() {
  initialStravaLoadDone = false;
  initialStravaLoadInFlight = null;
}
