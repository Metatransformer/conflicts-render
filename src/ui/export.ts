import { type Conflict } from '../schema';
import { formatNumber } from '../data';

export function exportCSV(conflicts: Conflict[]): void {
  if (conflicts.length === 0) return;

  const headers = ['Name', 'Severity', 'Category', 'Region', 'Started', 'Killed', 'Wounded', 'Displaced', 'Refugees', 'Latitude', 'Longitude', 'Description'];
  const rows = conflicts.map(c => [
    csvEscape(c.name),
    c.severity,
    c.category,
    csvEscape(c.region),
    csvEscape(c.started),
    c.casualties.killed,
    c.casualties.wounded,
    c.casualties.displaced,
    c.casualties.refugees,
    c.lat,
    c.lng,
    csvEscape(c.description),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  download(csv, 'world-conflicts.csv', 'text/csv');
}

export function exportJSON(conflicts: Conflict[]): void {
  if (conflicts.length === 0) return;
  const json = JSON.stringify(conflicts, null, 2);
  download(json, 'world-conflicts.json', 'application/json');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function download(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function updateExportButtons(conflicts: Conflict[]): void {
  const csvBtn = document.getElementById('btn-export-csv') as HTMLButtonElement;
  const jsonBtn = document.getElementById('btn-export-json') as HTMLButtonElement;
  const disabled = conflicts.length === 0;
  csvBtn.disabled = disabled;
  jsonBtn.disabled = disabled;
  csvBtn.title = disabled ? 'No data to export' : 'Export as CSV';
  jsonBtn.title = disabled ? 'No data to export' : 'Export as JSON';
}
