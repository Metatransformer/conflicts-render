import { z } from 'zod';

export const SeverityEnum = z.enum(['critical', 'high', 'medium', 'low']);
export type Severity = z.infer<typeof SeverityEnum>;

export const CategoryEnum = z.enum([
  'war', 'civil_war', 'insurgency', 'territorial', 'political', 'drug_war',
]);

export const SEVERITY_CONFIG = {
  critical: { color: '#ff2244', glColor: 0xff2244, label: 'Critical', size: 0.55, shape: '●' },
  high:     { color: '#ff8800', glColor: 0xff8800, label: 'High',     size: 0.45, shape: '◆' },
  medium:   { color: '#ffcc00', glColor: 0xffcc00, label: 'Medium',   size: 0.35, shape: '▲' },
  low:      { color: '#66aaff', glColor: 0x66aaff, label: 'Low',      size: 0.28, shape: '■' },
} as const;

export const CATEGORY_LABELS: Record<string, string> = {
  war: 'War',
  civil_war: 'Civil War',
  insurgency: 'Insurgency',
  territorial: 'Territorial',
  political: 'Political Violence',
  drug_war: 'Drug/Gang War',
};

export const ContextSourceSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  label: z.string(),
});

export const ConflictSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  severity: SeverityEnum,
  category: CategoryEnum,
  region: z.string(),
  started: z.string(),
  parties: z.string(),
  description: z.string(),
  impact: z.string(),
  casualties: z.object({
    killed: z.number().min(0),
    wounded: z.number().min(0),
    displaced: z.number().min(0),
    refugees: z.number().min(0),
  }),
  locations: z.array(z.string()),
  monthly: z.record(z.string(), z.object({
    events: z.number(),
    fatalities: z.number(),
  })).optional().default({}),
  context: z.object({
    background: z.string(),
    sources: z.array(ContextSourceSchema),
  }).optional(),
  lastUpdated: z.string().optional(),
});

export type Conflict = z.infer<typeof ConflictSchema>;

export const DisplacementArcSchema = z.object({
  fromLat: z.number(),
  fromLng: z.number(),
  toLat: z.number(),
  toLng: z.number(),
  conflictId: z.string(),
  population: z.number(),
  destinationCountry: z.string(),
  label: z.string(),
  year: z.number().optional(),
});

export type DisplacementArc = z.infer<typeof DisplacementArcSchema>;

export const ConflictsDataSchema = z.array(ConflictSchema);
export const ArcsDataSchema = z.array(DisplacementArcSchema);
