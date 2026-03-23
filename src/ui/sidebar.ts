import { SEVERITY_CONFIG, CATEGORY_LABELS, type Conflict, type Severity } from '../schema';
import { filterBySeverity, filterByRegion, filterByTime, getRegions, formatNumber } from '../data';

export type SidebarCallbacks = {
  onConflictClick: (conflict: Conflict, el: HTMLElement) => void;
  onFilterChange: () => void;
};

let activeSeverities = new Set<Severity>(['critical', 'high', 'medium', 'low']);
let activeRegion = 'all';
let activeMonth: string | null = null;
let callbacks: SidebarCallbacks;

export function getActiveSeverities(): Set<Severity> { return activeSeverities; }
export function getActiveRegion(): string { return activeRegion; }
export function getActiveMonth(): string | null { return activeMonth; }
export function setActiveMonth(month: string | null) { activeMonth = month; }

export function initSidebar(allConflicts: Conflict[], cbs: SidebarCallbacks): void {
  callbacks = cbs;
  buildLegend(allConflicts);
  buildFilterBar(allConflicts);
  buildConflictList(allConflicts);
}

function buildLegend(allConflicts: Conflict[]): void {
  const legend = document.getElementById('legend')!;
  legend.innerHTML = '';
  for (const [key, sev] of Object.entries(SEVERITY_CONFIG)) {
    const count = allConflicts.filter(c => c.severity === key).length;
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.setAttribute('role', 'checkbox');
    item.setAttribute('aria-checked', 'true');
    item.setAttribute('tabindex', '0');
    item.innerHTML = `<span class="legend-dot" style="background:${sev.color}"></span>${sev.label} (${count})`;
    item.onclick = () => toggleSeverity(key as Severity, item);
    item.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSeverity(key as Severity, item); } };
    legend.appendChild(item);
  }
}

function toggleSeverity(key: Severity, item: HTMLElement): void {
  if (activeSeverities.has(key)) {
    activeSeverities.delete(key);
    item.classList.add('dimmed');
    item.setAttribute('aria-checked', 'false');
  } else {
    activeSeverities.add(key);
    item.classList.remove('dimmed');
    item.setAttribute('aria-checked', 'true');
  }
  callbacks.onFilterChange();
}

function buildFilterBar(allConflicts: Conflict[]): void {
  const bar = document.getElementById('filter-bar')!;
  bar.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'All';
  allBtn.onclick = () => setRegion('all');
  bar.appendChild(allBtn);

  for (const region of getRegions(allConflicts)) {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = region;
    btn.onclick = () => setRegion(region);
    bar.appendChild(btn);
  }
}

function setRegion(region: string): void {
  activeRegion = region;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === (region === 'all' ? 'All' : region));
  });
  callbacks.onFilterChange();
}

export function getVisibleConflicts(allConflicts: Conflict[]): Conflict[] {
  let filtered = filterBySeverity(allConflicts, activeSeverities);
  filtered = filterByRegion(filtered, activeRegion);
  filtered = filterByTime(filtered, activeMonth);
  return filtered;
}

export function buildConflictList(allConflicts: Conflict[]): void {
  const list = document.getElementById('conflicts-list')!;
  const badge = document.getElementById('count-badge')!;
  list.innerHTML = '';

  const visible = getVisibleConflicts(allConflicts);

  if (visible.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <p>No conflicts match your filters.</p>
      <button onclick="document.querySelector('.filter-btn').click()">Reset Filters</button>
    </div>`;
    badge.textContent = '';
    return;
  }

  for (const conflict of visible) {
    const sev = SEVERITY_CONFIG[conflict.severity];
    const li = document.createElement('li');
    li.setAttribute('tabindex', '0');
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `${conflict.name}, ${sev.label} severity`);
    li.innerHTML = `
      <span class="li-dot" style="background:${sev.color}"></span>
      <span class="li-name">${conflict.name}</span>
      <span class="li-casualties">${formatNumber(conflict.casualties.killed)} killed</span>
      <span class="li-severity">${sev.label}</span>
    `;
    li.onclick = () => callbacks.onConflictClick(conflict, li);
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); callbacks.onConflictClick(conflict, li); } };
    list.appendChild(li);
  }

  badge.textContent = `Showing ${visible.length} of ${allConflicts.length} conflicts`;
}

export function setActiveListItem(el: HTMLElement | null): void {
  document.querySelectorAll('#conflicts-list li').forEach(li => li.classList.remove('active'));
  if (el) el.classList.add('active');
}
