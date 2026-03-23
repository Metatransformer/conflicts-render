/**
 * ACLED Data Pipeline
 *
 * PIPELINE FLOW:
 * ACLED API → raw events → group by conflict → classify severity
 *                                             → compute monthly aggregates
 *                                             → merge context cards
 *                                             → validate with Zod
 *                                             → write conflicts.json
 *
 * Usage:
 *   ACLED_API_KEY=xxx ACLED_EMAIL=xxx npx tsx pipeline/run.ts
 *
 * For initial seed, download ACLED's full CSV export and place in pipeline/seed/
 * The API is used for incremental weekly updates only.
 */

import { fetchACLEDEvents, type ACLEDEvent } from './fetch-acled';
import { aggregateToConflicts, CONFLICT_DEFINITIONS } from './aggregate';
import { ConflictsDataSchema } from '../src/schema';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve(__dirname, '..', 'data');

async function main() {
  console.log('🌍 ACLED Data Pipeline');
  console.log('━'.repeat(50));

  const apiKey = process.env.ACLED_API_KEY;
  const email = process.env.ACLED_EMAIL;

  if (!apiKey || !email) {
    console.error('❌ Missing ACLED_API_KEY or ACLED_EMAIL environment variables.');
    console.error('   Register at https://developer.acleddata.com/ (free)');
    console.error('');
    console.error('   Falling back to existing data/conflicts.json');
    process.exit(0);
  }

  // Fetch events from ACLED for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate = sixMonthsAgo.toISOString().split('T')[0];

  console.log(`📡 Fetching ACLED events since ${startDate}...`);

  let events: ACLEDEvent[];
  try {
    events = await fetchACLEDEvents(apiKey, email, startDate);
    console.log(`   ✓ ${events.length} events fetched`);
  } catch (err) {
    console.error(`❌ ACLED API error: ${err}`);
    console.error('   Keeping existing data/conflicts.json');
    process.exit(1);
  }

  // Aggregate into conflict objects
  console.log('🔧 Aggregating events into conflict summaries...');
  const conflicts = aggregateToConflicts(events);
  console.log(`   ✓ ${conflicts.length} conflicts produced`);

  // Merge context cards from data/context/
  const contextDir = path.join(DATA_DIR, 'context');
  if (fs.existsSync(contextDir)) {
    const contextFiles = fs.readdirSync(contextDir).filter(f => f.endsWith('.json'));
    for (const file of contextFiles) {
      const id = file.replace('.json', '');
      const conflict = conflicts.find(c => c.id === id);
      if (conflict) {
        try {
          const ctx = JSON.parse(fs.readFileSync(path.join(contextDir, file), 'utf-8'));
          conflict.context = ctx;
          if (ctx.severityOverride) {
            conflict.severity = ctx.severityOverride;
          }
        } catch (err) {
          console.warn(`   ⚠ Failed to parse context/${file}: ${err}`);
        }
      }
    }
    console.log(`   ✓ ${contextFiles.length} context cards merged`);
  }

  // Validate
  console.log('✅ Validating output schema...');
  try {
    ConflictsDataSchema.parse(conflicts);
    console.log('   ✓ Schema valid');
  } catch (err) {
    console.error(`❌ Schema validation failed: ${err}`);
    process.exit(1);
  }

  // Write output
  const outPath = path.join(DATA_DIR, 'conflicts.json');
  fs.writeFileSync(outPath, JSON.stringify(conflicts, null, 2));
  console.log(`📁 Written to ${outPath}`);
  console.log(`   ${conflicts.length} conflicts, ${events.length} source events`);
  console.log('━'.repeat(50));
  console.log('✅ Pipeline complete');
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
