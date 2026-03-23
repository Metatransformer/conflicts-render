/**
 * Aggregate raw ACLED events into conflict summaries.
 *
 * AGGREGATION FLOW:
 * Raw events → group by conflict definition (country/region matching)
 *            → compute centroid (avg lat/lng of events)
 *            → classify severity (fatalities/month thresholds)
 *            → build monthly time series
 *            → produce Conflict objects
 */

import type { Conflict } from '../src/schema';
import type { ACLEDEvent } from './fetch-acled';

// Conflict definitions map ACLED countries to our conflict IDs
// Each definition includes the countries/regions to match and metadata
export const CONFLICT_DEFINITIONS: ConflictDefinition[] = [
  {
    id: 'russia-ukraine-war', name: 'Russia-Ukraine War',
    countries: ['Ukraine'], category: 'war', region: 'Europe',
    started: '2022', parties: 'Russia vs Ukraine (backed by NATO allies)',
  },
  {
    id: 'sudan-civil-war', name: 'Sudan Civil War',
    countries: ['Sudan'], category: 'civil_war', region: 'East Africa',
    started: '2023', parties: 'Sudanese Armed Forces (SAF) vs Rapid Support Forces (RSF)',
  },
  {
    id: 'myanmar-civil-war', name: 'Myanmar Civil War',
    countries: ['Myanmar'], category: 'civil_war', region: 'Southeast Asia',
    started: '2021', parties: 'Military junta vs NUG, ethnic armed organizations, PDFs',
  },
  {
    id: 'gaza-israel-palestine', name: 'Gaza / Israel-Palestine',
    countries: ['Palestine', 'Israel'], category: 'war', region: 'Middle East',
    started: '2023 (escalation)', parties: 'Israel vs Hamas/Palestinian factions',
  },
  {
    id: 'dr-congo-eastern', name: 'DR Congo (Eastern)',
    countries: ['Democratic Republic of Congo'], category: 'civil_war', region: 'Central Africa',
    started: '1996 (recurring)', parties: 'FARDC vs M23, ADF, CODECO, 100+ armed groups',
  },
  {
    id: 'yemen-civil-war', name: 'Yemen Civil War',
    countries: ['Yemen'], category: 'civil_war', region: 'Middle East',
    started: '2014', parties: 'Houthi forces vs recognized government, Saudi/UAE coalition',
  },
  {
    id: 'somalia-al-shabaab', name: 'Somalia - Al-Shabaab',
    countries: ['Somalia'], category: 'insurgency', region: 'East Africa',
    started: '2006', parties: 'Federal Government, ATMIS vs Al-Shabaab',
  },
  {
    id: 'sahel-mali', name: 'Sahel - Mali Insurgency',
    countries: ['Mali'], category: 'insurgency', region: 'West Africa',
    started: '2012', parties: 'Malian military + Africa Corps vs JNIM, ISGS, Tuareg groups',
  },
  {
    id: 'sahel-burkina-faso', name: 'Sahel - Burkina Faso',
    countries: ['Burkina Faso'], category: 'insurgency', region: 'West Africa',
    started: '2015', parties: 'Military junta vs JNIM, ISGS',
  },
  {
    id: 'nigeria-multi-front', name: 'Nigeria - Multi-front Violence',
    countries: ['Nigeria'], category: 'insurgency', region: 'West Africa',
    started: '2009', parties: 'Nigerian military vs Boko Haram/ISWAP, bandits, IPOB',
  },
  {
    id: 'ethiopia-regional', name: 'Ethiopia - Regional Conflicts',
    countries: ['Ethiopia'], category: 'civil_war', region: 'East Africa',
    started: '2020', parties: 'Federal government vs Amhara Fano, OLA',
  },
  {
    id: 'afghanistan-taliban-isisk', name: 'Afghanistan - Taliban vs ISIS-K',
    countries: ['Afghanistan'], category: 'insurgency', region: 'South Asia',
    started: '2021', parties: 'Taliban vs ISIS-K, NRF',
  },
  {
    id: 'pakistan-ttp', name: 'Pakistan - TTP Insurgency',
    countries: ['Pakistan'], category: 'insurgency', region: 'South Asia',
    started: '2007', parties: 'Pakistani military vs TTP, BLA',
  },
  {
    id: 'haiti-gang-violence', name: 'Haiti - Gang Violence',
    countries: ['Haiti'], category: 'drug_war', region: 'Caribbean',
    started: '2021', parties: 'Armed gangs vs Haitian National Police, MSS',
  },
  {
    id: 'colombia-armed-groups', name: 'Colombia - Armed Groups',
    countries: ['Colombia'], category: 'insurgency', region: 'South America',
    started: '1964', parties: 'Government vs ELN, FARC dissidents, cartels',
  },
  {
    id: 'syria-post-war', name: 'Syria - Post-Assad Transition',
    countries: ['Syria'], category: 'civil_war', region: 'Middle East',
    started: '2011', parties: 'HTS government, SDF, ISIS remnants, Turkey-backed factions',
  },
  {
    id: 'mexico-cartel', name: 'Mexico - Cartel Violence',
    countries: ['Mexico'], category: 'drug_war', region: 'North America',
    started: '2006', parties: 'Sinaloa, CJNG, other cartels vs military',
  },
  {
    id: 'sahel-niger', name: 'Sahel - Niger',
    countries: ['Niger'], category: 'insurgency', region: 'West Africa',
    started: '2015', parties: 'Military junta vs JNIM, ISGS',
  },
  {
    id: 'mozambique-cabo-delgado', name: 'Mozambique - Cabo Delgado',
    countries: ['Mozambique'], category: 'insurgency', region: 'Southern Africa',
    started: '2017', parties: 'Mozambican military, Rwandan forces vs ISIS-linked ASWJ',
  },
  {
    id: 'cameroon-anglophone', name: 'Cameroon - Anglophone Crisis',
    countries: ['Cameroon'], category: 'political', region: 'Central Africa',
    started: '2017', parties: 'Cameroonian military vs Ambazonia separatists',
  },
  {
    id: 'iraq-isis-remnants', name: 'Iraq - ISIS Remnants',
    countries: ['Iraq'], category: 'insurgency', region: 'Middle East',
    started: '2017', parties: 'Iraqi forces, PMF vs ISIS cells',
  },
  {
    id: 'libya-fragmentation', name: 'Libya - Political Fragmentation',
    countries: ['Libya'], category: 'political', region: 'North Africa',
    started: '2014', parties: 'GNU (Tripoli) vs LNA (Haftar, east)',
  },
];

interface ConflictDefinition {
  id: string;
  name: string;
  countries: string[];
  category: string;
  region: string;
  started: string;
  parties: string;
}

/**
 * Severity classification thresholds:
 *   critical: >1000 fatalities/month OR active state-level war
 *   high:     100-1000 fatalities/month
 *   medium:   10-100 fatalities/month
 *   low:      <10 fatalities/month
 */
function classifySeverity(avgMonthlyFatalities: number): 'critical' | 'high' | 'medium' | 'low' {
  if (avgMonthlyFatalities > 1000) return 'critical';
  if (avgMonthlyFatalities > 100) return 'high';
  if (avgMonthlyFatalities > 10) return 'medium';
  return 'low';
}

export function aggregateToConflicts(events: ACLEDEvent[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const now = new Date().toISOString().split('T')[0];

  for (const def of CONFLICT_DEFINITIONS) {
    // Match events to this conflict by country
    const conflictEvents = events.filter(e =>
      def.countries.some(c => e.country.toLowerCase().includes(c.toLowerCase()))
    );

    if (conflictEvents.length === 0) {
      // No recent events — skip or include with empty data
      continue;
    }

    // Compute centroid
    const lat = conflictEvents.reduce((s, e) => s + e.latitude, 0) / conflictEvents.length;
    const lng = conflictEvents.reduce((s, e) => s + e.longitude, 0) / conflictEvents.length;

    // Build monthly aggregates
    const monthly: Record<string, { events: number; fatalities: number }> = {};
    for (const event of conflictEvents) {
      const month = event.event_date.slice(0, 7); // YYYY-MM
      if (!monthly[month]) monthly[month] = { events: 0, fatalities: 0 };
      monthly[month].events++;
      monthly[month].fatalities += event.fatalities;
    }

    // Compute severity from average monthly fatalities
    const monthValues = Object.values(monthly);
    const avgMonthlyFatalities = monthValues.length > 0
      ? monthValues.reduce((s, m) => s + m.fatalities, 0) / monthValues.length
      : 0;

    // Total casualties (from events in this window)
    const totalKilled = conflictEvents.reduce((s, e) => s + e.fatalities, 0);

    // Top locations by event count
    const locationCounts: Record<string, number> = {};
    for (const e of conflictEvents) {
      const loc = e.admin1 || e.location;
      if (loc) locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }
    const locations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);

    // Description from top events
    const description = `${conflictEvents.length} conflict events recorded in the past 6 months across ${Object.keys(locationCounts).length} locations. ${totalKilled} fatalities reported.`;

    conflicts.push({
      id: def.id,
      name: def.name,
      lat: Math.round(lat * 100) / 100,
      lng: Math.round(lng * 100) / 100,
      severity: classifySeverity(avgMonthlyFatalities),
      category: def.category as any,
      region: def.region,
      started: def.started,
      parties: def.parties,
      description,
      impact: `${totalKilled.toLocaleString()} fatalities in the past 6 months. ${conflictEvents.length} recorded events.`,
      casualties: {
        killed: totalKilled,
        wounded: Math.round(totalKilled * 1.8), // Estimated wounded ratio
        displaced: 0, // Not available from ACLED event data
        refugees: 0,  // Not available from ACLED event data
      },
      locations,
      monthly,
      lastUpdated: now,
    });
  }

  return conflicts;
}
