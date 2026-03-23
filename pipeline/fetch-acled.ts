/**
 * Fetch conflict events from the ACLED API.
 *
 * ACLED API docs: https://acleddata.com/acled-api-documentation/
 * - Default limit is 5000 rows — we use limit=0 for all results
 * - Free tier: 500 calls/day
 * - Returns CSV or JSON (we use JSON)
 */

export interface ACLEDEvent {
  event_id_cnty: string;
  event_date: string;        // YYYY-MM-DD
  year: number;
  event_type: string;        // "Battles", "Violence against civilians", "Explosions/Remote violence", etc.
  sub_event_type: string;
  actor1: string;
  actor2: string;
  country: string;
  admin1: string;            // Province/state
  admin2: string;            // District
  admin3: string;
  location: string;
  latitude: number;
  longitude: number;
  fatalities: number;
  notes: string;
  source: string;
  source_scale: string;
  interaction: number;
  iso: number;
  region: string;            // ACLED region classification
  disorder_type: string;
}

const ACLED_API_BASE = 'https://api.acleddata.com/acled/read';

export async function fetchACLEDEvents(
  apiKey: string,
  email: string,
  startDate: string,
  countries?: string[],
): Promise<ACLEDEvent[]> {
  const params = new URLSearchParams({
    key: apiKey,
    email: email,
    event_date: `${startDate}|`,
    event_date_where: 'BETWEEN',
    limit: '0', // Return ALL results (no pagination needed)
    fields: [
      'event_id_cnty', 'event_date', 'year', 'event_type', 'sub_event_type',
      'actor1', 'actor2', 'country', 'admin1', 'admin2', 'admin3',
      'location', 'latitude', 'longitude', 'fatalities', 'notes',
      'source', 'source_scale', 'interaction', 'iso', 'region', 'disorder_type',
    ].join('|'),
  });

  if (countries && countries.length > 0) {
    params.set('country', countries.join('|'));
    params.set('country_where', 'IN');
  }

  // Only conflict events (not protests/strategic developments)
  params.set('event_type', 'Battles|Violence against civilians|Explosions/Remote violence');
  params.set('event_type_where', 'IN');

  const url = `${ACLED_API_BASE}?${params.toString()}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(120_000), // 2 min timeout for large responses
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error(`ACLED API authentication failed (401). Check your API key and email. ${body}`);
    }
    if (response.status === 429) {
      throw new Error(`ACLED API rate limit exceeded (429). Free tier allows 500 calls/day. ${body}`);
    }
    throw new Error(`ACLED API error (${response.status}): ${body}`);
  }

  const data = await response.json();

  if (!data.data || !Array.isArray(data.data)) {
    throw new Error(`Unexpected ACLED response format: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return data.data.map((e: Record<string, unknown>) => ({
    ...e,
    latitude: parseFloat(String(e.latitude)),
    longitude: parseFloat(String(e.longitude)),
    fatalities: parseInt(String(e.fatalities), 10) || 0,
    year: parseInt(String(e.year), 10),
  })) as ACLEDEvent[];
}
