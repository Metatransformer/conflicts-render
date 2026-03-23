import Globe, { type GlobeInstance } from 'globe.gl';
import { SEVERITY_CONFIG, type Conflict, type DisplacementArc } from './schema';

let globe: GlobeInstance | null = null;

export function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function initGlobe(
  container: HTMLElement,
  conflicts: Conflict[],
  onConflictClick: (conflict: Conflict) => void,
  onReady: () => void,
): GlobeInstance {
  globe = new Globe(container)
    .globeImageUrl('./2k_earth_daymap.jpg')
    .bumpImageUrl('./2k_earth_daymap.jpg')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .showAtmosphere(true)
    .atmosphereColor('#3a75c4')
    .atmosphereAltitude(0.15)
    .pointsData(conflicts)
    .pointLat((d: object) => (d as Conflict).lat)
    .pointLng((d: object) => (d as Conflict).lng)
    .pointColor((d: object) => SEVERITY_CONFIG[(d as Conflict).severity].color)
    .pointAltitude(0.06)
    .pointRadius((d: object) => SEVERITY_CONFIG[(d as Conflict).severity].size)
    .pointLabel((d: object) => {
      const c = d as Conflict;
      return `<b>${c.name}</b><br/>${SEVERITY_CONFIG[c.severity].label} severity`;
    })
    .onPointClick((d: object) => onConflictClick(d as Conflict))
    .arcsData([])
    .arcStartLat((d: object) => (d as DisplacementArc).fromLat)
    .arcStartLng((d: object) => (d as DisplacementArc).fromLng)
    .arcEndLat((d: object) => (d as DisplacementArc).toLat)
    .arcEndLng((d: object) => (d as DisplacementArc).toLng)
    .arcColor(() => ['rgba(147, 197, 253, 0.6)', 'rgba(147, 197, 253, 0.2)'])
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    .arcStroke(0.5)
    .arcLabel((d: object) => (d as DisplacementArc).label)
    .onGlobeReady(onReady);

  // Disable auto-rotate
  const controls = globe.controls();
  controls.autoRotate = false;
  controls.enableDamping = true;

  return globe;
}

export function updatePoints(conflicts: Conflict[]): void {
  if (!globe) return;
  globe.pointsData(conflicts);
}

export function updateArcs(arcs: DisplacementArc[]): void {
  if (!globe) return;
  globe.arcsData(arcs);
}

export function focusOnConflict(conflict: Conflict): void {
  if (!globe) return;
  globe.pointOfView({ lat: conflict.lat, lng: conflict.lng, altitude: 1.8 }, 1000);
}

export function getGlobe() {
  return globe;
}
