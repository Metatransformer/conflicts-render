import { getMonthRange } from '../data';
import { type Conflict } from '../schema';

let months: string[] = [];
let currentIndex = 0;
let playing = false;
let playInterval: ReturnType<typeof setInterval> | null = null;
let onChange: ((month: string | null) => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(m: string): string {
  const [year, month] = m.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

export function initTimeSlider(conflicts: Conflict[], cb: (month: string | null) => void): void {
  onChange = cb;
  months = getMonthRange(conflicts);

  if (months.length === 0) {
    document.getElementById('time-controls')?.classList.add('hidden');
    document.getElementById('mobile-time')?.classList.add('hidden');
    return;
  }

  // Extra position at the end = "All time" (null month)
  currentIndex = months.length; // "All" position

  const slider = document.getElementById('time-slider') as HTMLInputElement;
  slider.min = '0';
  slider.max = String(months.length); // includes "All" at end
  slider.value = String(currentIndex);
  slider.oninput = () => {
    currentIndex = parseInt(slider.value, 10);
    updateLabels();
    debouncedChange();
  };

  document.getElementById('time-prev')!.onclick = () => step(-1);
  document.getElementById('time-next')!.onclick = () => step(1);
  document.getElementById('time-play')!.onclick = togglePlay;

  // Mobile controls
  document.getElementById('mobile-time-prev')!.onclick = () => step(-1);
  document.getElementById('mobile-time-next')!.onclick = () => step(1);

  updateLabels();
}

function step(delta: number): void {
  currentIndex = Math.max(0, Math.min(months.length, currentIndex + delta));
  (document.getElementById('time-slider') as HTMLInputElement).value = String(currentIndex);
  updateLabels();
  debouncedChange();
}

function getCurrentMonthValue(): string | null {
  if (currentIndex >= months.length) return null; // "All time"
  return months[currentIndex] || null;
}

function debouncedChange(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    onChange?.(getCurrentMonthValue());
  }, 100);
}

function updateLabels(): void {
  const monthVal = getCurrentMonthValue();
  const label = monthVal ? formatMonth(monthVal) : 'All time';
  document.getElementById('time-label')!.textContent = label;
  document.getElementById('mobile-time-label')!.textContent = label;
}

function togglePlay(): void {
  playing = !playing;
  const btn = document.getElementById('time-play')!;
  if (playing) {
    btn.innerHTML = '&#9646;&#9646;';
    btn.setAttribute('aria-label', 'Pause auto-play');
    playInterval = setInterval(() => {
      if (currentIndex >= months.length) {
        currentIndex = 0;
      } else {
        currentIndex++;
      }
      (document.getElementById('time-slider') as HTMLInputElement).value = String(currentIndex);
      updateLabels();
      onChange?.(months[currentIndex] || null);
    }, 1000);
  } else {
    btn.innerHTML = '&#9654;';
    btn.setAttribute('aria-label', 'Auto-play');
    if (playInterval) clearInterval(playInterval);
    playInterval = null;
  }
}

export function getCurrentMonth(): string | null {
  return getCurrentMonthValue();
}
