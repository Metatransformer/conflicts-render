import './styles/main.css';
import { loadConflicts, loadArcs, getConflicts, getArcsForConflict } from './data';
import { checkWebGL, initGlobe, updatePoints, updateArcs, focusOnConflict } from './globe';
import { initSidebar, buildConflictList, getVisibleConflicts, setActiveListItem, setActiveMonth } from './ui/sidebar';
import { showInfoPanel, hideInfoPanel, showComparison } from './ui/info-panel';
import { initTimeSlider } from './ui/time-slider';
import { exportCSV, exportJSON, updateExportButtons } from './ui/export';
import { decodeState, pushState } from './state';
import { type Conflict } from './schema';

let selectedConflict: Conflict | null = null;
let compareConflict: Conflict | null = null;
const hasWebGL = checkWebGL();

async function main() {
  // Load data first (needed for both WebGL and fallback)
  let conflicts: Conflict[];
  try {
    conflicts = await loadConflicts();
  } catch (err) {
    document.getElementById('loading')!.innerHTML = `
      <p style="color:#f87171;font-size:14px">Unable to load conflict data.</p>
      <button onclick="location.reload()" style="margin-top:12px;background:#3b82f6;color:#fff;border:none;padding:8px 20px;border-radius:14px;cursor:pointer">Retry</button>
    `;
    console.error('Failed to load conflicts:', err);
    return;
  }

  await loadArcs();

  // ── Shared setup (works in both WebGL and fallback mode) ──

  // Set subtitle
  const lastUpdated = conflicts[0]?.lastUpdated;
  const subtitle = document.getElementById('subtitle')!;
  subtitle.textContent = lastUpdated
    ? `${conflicts.length} active conflicts · Data as of ${new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : `${conflicts.length} active conflicts`;

  // Check data freshness
  if (lastUpdated) {
    const age = Date.now() - new Date(lastUpdated).getTime();
    const daysSince = age / (1000 * 60 * 60 * 24);
    if (daysSince > 14) {
      const dismissed = sessionStorage.getItem('freshness-dismissed');
      if (!dismissed) {
        const banner = document.getElementById('freshness-banner')!;
        document.getElementById('freshness-message')!.textContent =
          `Data last updated ${Math.floor(daysSince)} days ago — some information may be outdated.`;
        banner.classList.remove('hidden');
        document.getElementById('freshness-dismiss')!.onclick = () => {
          banner.classList.add('hidden');
          sessionStorage.setItem('freshness-dismissed', '1');
        };
      }
    }
    document.getElementById('data-freshness')!.textContent = `Updated: ${new Date(lastUpdated).toLocaleDateString()}`;
  }

  // Init sidebar
  initSidebar(conflicts, {
    onConflictClick: handleConflictClick,
    onFilterChange: handleFilterChange,
  });

  // Init time slider
  initTimeSlider(conflicts, (month) => {
    setActiveMonth(month);
    handleFilterChange();
  });

  // Export buttons
  document.getElementById('btn-export-csv')!.onclick = () => exportCSV(getVisibleConflicts(conflicts));
  document.getElementById('btn-export-json')!.onclick = () => exportJSON(getVisibleConflicts(conflicts));

  // Info panel close
  document.getElementById('info-close')!.onclick = () => {
    hideInfoPanel();
    selectedConflict = null;
    compareConflict = null;
    if (hasWebGL) updateArcs([]);
  };

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideInfoPanel();
      document.getElementById('comparison-panel')!.classList.add('hidden');
      selectedConflict = null;
      compareConflict = null;
      if (hasWebGL) updateArcs([]);
    }
  });

  // ── Mode-specific setup ──

  if (!hasWebGL) {
    // Fallback mode: no globe, just sidebar + flat map image
    document.getElementById('loading')!.classList.add('hidden');
    document.getElementById('webgl-fallback')!.classList.remove('hidden');
    document.getElementById('globe-container')!.classList.add('hidden');
    document.getElementById('sidebar')!.style.position = 'static';
    document.getElementById('sidebar')!.style.width = '100%';

    // Show onboarding for first-time visitors (even in fallback)
    showOnboarding();
    return;
  }

  // WebGL mode: full globe experience
  const container = document.getElementById('globe-container')!;
  initGlobe(container, conflicts, handleConflictClick, () => {
    // Globe ready — hide loading
    const loading = document.getElementById('loading')!;
    loading.classList.add('fade-out');
    setTimeout(() => loading.classList.add('hidden'), 1000);

    showOnboarding();
    restoreState(conflicts);
  });
}

function showOnboarding(): void {
  if (!localStorage.getItem('onboarding-seen')) {
    const onboarding = document.getElementById('onboarding')!;
    onboarding.classList.remove('hidden');
    document.getElementById('onboarding-dismiss')!.onclick = () => {
      onboarding.classList.add('hidden');
      localStorage.setItem('onboarding-seen', '1');
    };
  }
}

function handleConflictClick(conflict: Conflict, el?: HTMLElement): void {
  // Shift+click for comparison
  if (selectedConflict && (window.event as MouseEvent)?.shiftKey && selectedConflict.id !== conflict.id) {
    compareConflict = conflict;
    showComparison(selectedConflict, compareConflict);
    if (hasWebGL) updateArcs([]);
    return;
  }

  selectedConflict = conflict;
  compareConflict = null;

  if (hasWebGL) focusOnConflict(conflict);
  showInfoPanel(conflict);

  if (el) setActiveListItem(el);

  // Show arcs for this conflict (WebGL only)
  if (hasWebGL) {
    const arcs = getArcsForConflict(conflict.id);
    updateArcs(arcs);
  }

  // Update URL state
  pushState({
    lat: conflict.lat,
    lng: conflict.lng,
    alt: 1.8,
    conflict: conflict.id,
  });
}

function handleFilterChange(): void {
  const conflicts = getConflicts();
  const visible = getVisibleConflicts(conflicts);
  buildConflictList(conflicts);
  if (hasWebGL) updatePoints(visible);
  updateExportButtons(visible);
}

function restoreState(conflicts: Conflict[]): void {
  const state = decodeState();
  if (state.conflict) {
    const conflict = conflicts.find(c => c.id === state.conflict);
    if (conflict) {
      setTimeout(() => handleConflictClick(conflict), 500);
    }
  }
}

// Disclaimer modal
document.getElementById('disclaimer-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('disclaimer-modal')?.classList.remove('hidden');
});
document.getElementById('disclaimer-close')?.addEventListener('click', () => {
  document.getElementById('disclaimer-modal')?.classList.add('hidden');
});
document.getElementById('disclaimer-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('disclaimer-modal')?.classList.add('hidden');
  }
});

main();
