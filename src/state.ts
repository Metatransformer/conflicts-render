// URL STATE
// hash params → decodeState() → AppState → globe.pointOfView() + UI update
// user action → AppState change → encodeState() → hash update (pushState)

export interface AppState {
  lat?: number;
  lng?: number;
  alt?: number;
  time?: string;
  conflict?: string;
  severity?: string;
  region?: string;
}

export function encodeState(state: AppState): string {
  const params = new URLSearchParams();
  if (state.lat != null) params.set('lat', state.lat.toFixed(2));
  if (state.lng != null) params.set('lng', state.lng.toFixed(2));
  if (state.alt != null) params.set('alt', state.alt.toFixed(2));
  if (state.time) params.set('time', state.time);
  if (state.conflict) params.set('conflict', encodeURIComponent(state.conflict));
  if (state.severity) params.set('severity', state.severity);
  if (state.region && state.region !== 'all') params.set('region', state.region);
  return params.toString();
}

export function decodeState(): AppState {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};

  const params = new URLSearchParams(hash);
  const state: AppState = {};

  const lat = parseFloat(params.get('lat') || '');
  const lng = parseFloat(params.get('lng') || '');
  const alt = parseFloat(params.get('alt') || '');

  if (!isNaN(lat) && lat >= -90 && lat <= 90) state.lat = lat;
  if (!isNaN(lng) && lng >= -180 && lng <= 180) state.lng = lng;
  if (!isNaN(alt) && alt > 0 && alt < 100) state.alt = alt;

  const time = params.get('time');
  if (time && /^\d{4}-\d{2}$/.test(time)) state.time = time;

  const conflict = params.get('conflict');
  if (conflict) state.conflict = decodeURIComponent(conflict);

  const severity = params.get('severity');
  if (severity) state.severity = severity;

  const region = params.get('region');
  if (region) state.region = region;

  return state;
}

export function pushState(state: AppState): void {
  const encoded = encodeState(state);
  if (encoded) {
    window.history.replaceState(null, '', '#' + encoded);
  }
}
