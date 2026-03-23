import { ConflictsDataSchema, ArcsDataSchema, type Conflict, type DisplacementArc, type Severity } from './schema';

// DATA FLOW
// fetch(conflicts.json) → JSON.parse → Zod validate → AppState
//   ↓ error at any step → show error UI, log to console

let _conflicts: Conflict[] = [];
let _arcs: DisplacementArc[] = [];

export async function loadConflicts(): Promise<Conflict[]> {
  const res = await fetch(new URL('../data/conflicts.json', import.meta.url).href);
  if (!res.ok) throw new Error(`Failed to load conflicts: ${res.status}`);
  const raw = await res.json();
  const parsed = ConflictsDataSchema.parse(raw);
  _conflicts = parsed;
  return parsed;
}

export async function loadArcs(): Promise<DisplacementArc[]> {
  try {
    const res = await fetch(new URL('../data/arcs.json', import.meta.url).href);
    if (!res.ok) return [];
    const raw = await res.json();
    _arcs = ArcsDataSchema.parse(raw);
    return _arcs;
  } catch {
    // Arc data is optional — fail silently
    return [];
  }
}

export function getConflicts(): Conflict[] {
  return _conflicts;
}

export function getArcs(): DisplacementArc[] {
  return _arcs;
}

export function filterBySeverity(conflicts: Conflict[], severities: Set<Severity>): Conflict[] {
  return conflicts.filter(c => severities.has(c.severity));
}

export function filterByRegion(conflicts: Conflict[], region: string): Conflict[] {
  if (region === 'all') return conflicts;
  return conflicts.filter(c => c.region === region);
}

export function filterByTime(conflicts: Conflict[], month: string | null): Conflict[] {
  if (!month) return conflicts;
  return conflicts.filter(c => {
    if (!c.monthly || Object.keys(c.monthly).length === 0) return true;
    return c.monthly[month] !== undefined;
  });
}

export function getRegions(conflicts: Conflict[]): string[] {
  return [...new Set(conflicts.map(c => c.region))].sort();
}

export function getMonthRange(conflicts: Conflict[]): string[] {
  const months = new Set<string>();
  for (const c of conflicts) {
    if (c.monthly) {
      for (const m of Object.keys(c.monthly)) {
        months.add(m);
      }
    }
  }
  return [...months].sort();
}

export function getArcsForConflict(conflictId: string): DisplacementArc[] {
  return _arcs.filter(a => a.conflictId === conflictId);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return Math.round(n / 1_000) + 'K';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function formatNumberFull(n: number): string {
  return n.toLocaleString();
}
