import { SEVERITY_CONFIG, CATEGORY_LABELS, type Conflict } from '../schema';
import { formatNumberFull } from '../data';

export function showInfoPanel(conflict: Conflict): void {
  const panel = document.getElementById('info-panel')!;
  const compPanel = document.getElementById('comparison-panel')!;
  compPanel.classList.add('hidden');

  document.getElementById('info-name')!.textContent = conflict.name;

  const badge = document.getElementById('info-severity-badge')!;
  const sev = SEVERITY_CONFIG[conflict.severity];
  badge.textContent = sev.label;
  badge.style.background = sev.color + '22';
  badge.style.color = sev.color;

  document.getElementById('info-desc')!.textContent = conflict.description;

  const stats = document.getElementById('info-stats')!;
  const c = conflict.casualties;
  stats.innerHTML = '';
  if (c.killed > 0) stats.innerHTML += `<div class="stat-box"><div class="stat-value killed">${formatNumberFull(c.killed)}</div><div class="stat-label">Killed</div></div>`;
  if (c.wounded > 0) stats.innerHTML += `<div class="stat-box"><div class="stat-value wounded">${formatNumberFull(c.wounded)}</div><div class="stat-label">Wounded</div></div>`;
  if (c.displaced > 0) stats.innerHTML += `<div class="stat-box"><div class="stat-value displaced">${formatNumberFull(c.displaced)}</div><div class="stat-label">Displaced</div></div>`;
  if (c.refugees > 0) stats.innerHTML += `<div class="stat-box"><div class="stat-value refugees">${formatNumberFull(c.refugees)}</div><div class="stat-label">Refugees</div></div>`;

  document.getElementById('info-parties')!.innerHTML = `<strong>Parties:</strong> <span>${conflict.parties}</span>`;
  document.getElementById('info-impact')!.innerHTML = `<strong>Impact:</strong> <span>${conflict.impact}</span>`;
  document.getElementById('info-started')!.innerHTML = `<strong>Started:</strong> <span>${conflict.started}</span>`;
  document.getElementById('info-region')!.innerHTML = `<strong>Region:</strong> <span>${conflict.region} · ${CATEGORY_LABELS[conflict.category] || conflict.category}</span>`;

  const contextEl = document.getElementById('info-context')!;
  if (conflict.context) {
    let html = '<div class="context-card"><h3>Learn More</h3>';
    html += `<p>${conflict.context.background}</p>`;
    html += '<div class="context-sources">';
    for (const src of conflict.context.sources) {
      html += `<a href="${src.url}" target="_blank" rel="noopener">${src.name} — ${src.label}</a>`;
    }
    html += '</div></div>';
    contextEl.innerHTML = html;
  } else {
    contextEl.innerHTML = '';
  }

  panel.classList.remove('hidden');
}

export function hideInfoPanel(): void {
  document.getElementById('info-panel')!.classList.add('hidden');
}

export function showComparison(a: Conflict, b: Conflict): void {
  const panel = document.getElementById('comparison-panel')!;
  document.getElementById('info-panel')!.classList.add('hidden');

  panel.innerHTML = `
    <button onclick="document.getElementById('comparison-panel').classList.add('hidden')" style="position:absolute;top:10px;right:14px;background:none;border:none;color:#64748b;font-size:18px;cursor:pointer;min-width:44px;min-height:44px">&times;</button>
    <div class="comparison-grid">
      ${comparisonSide(a)}
      ${comparisonSide(b)}
    </div>
  `;
  panel.classList.remove('hidden');
}

function comparisonSide(c: Conflict): string {
  const sev = SEVERITY_CONFIG[c.severity];
  return `
    <div class="comparison-side">
      <h3><span class="li-dot" style="background:${sev.color};display:inline-block;width:10px;height:10px;border-radius:50%"></span> ${c.name}</h3>
      <div class="stats-grid">
        ${c.casualties.killed > 0 ? `<div class="stat-box"><div class="stat-value killed">${formatNumberFull(c.casualties.killed)}</div><div class="stat-label">Killed</div></div>` : ''}
        ${c.casualties.displaced > 0 ? `<div class="stat-box"><div class="stat-value displaced">${formatNumberFull(c.casualties.displaced)}</div><div class="stat-label">Displaced</div></div>` : ''}
      </div>
      <div class="info-meta"><strong>Started:</strong> ${c.started}</div>
      <div class="info-meta"><strong>Region:</strong> ${c.region}</div>
    </div>
  `;
}
