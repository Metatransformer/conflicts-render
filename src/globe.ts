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
    .atmosphereColor('#4a8fe7')
    .atmosphereAltitude(0.2)

    // Conflict markers
    .pointsData(conflicts)
    .pointLat((d: object) => (d as Conflict).lat)
    .pointLng((d: object) => (d as Conflict).lng)
    .pointColor((d: object) => SEVERITY_CONFIG[(d as Conflict).severity].color)
    .pointAltitude(0.06)
    .pointRadius((d: object) => SEVERITY_CONFIG[(d as Conflict).severity].size)
    .pointsMerge(false)
    .pointLabel((d: object) => {
      const c = d as Conflict;
      const sev = SEVERITY_CONFIG[c.severity];
      const killed = c.casualties.killed > 0 ? `<br/>${c.casualties.killed.toLocaleString()} killed` : '';
      return `<div style="text-align:center;font-family:system-ui;line-height:1.4">
        <b style="color:${sev.color}">${c.name}</b>
        <br/><span style="color:#94a3b8;font-size:11px">${sev.label} · ${c.region}</span>
        <span style="color:#f87171;font-size:11px">${killed}</span>
      </div>`;
    })
    .onPointClick((d: object) => onConflictClick(d as Conflict))

    // Displacement arcs
    .arcsData([])
    .arcStartLat((d: object) => (d as DisplacementArc).fromLat)
    .arcStartLng((d: object) => (d as DisplacementArc).fromLng)
    .arcEndLat((d: object) => (d as DisplacementArc).toLat)
    .arcEndLng((d: object) => (d as DisplacementArc).toLng)
    .arcColor(() => ['rgba(251, 191, 36, 0.7)', 'rgba(251, 191, 36, 0.15)'])
    .arcDashLength(0.6)
    .arcDashGap(0.3)
    .arcDashAnimateTime(1500)
    .arcStroke(0.8)
    .arcLabel((d: object) => {
      const a = d as DisplacementArc;
      return `<div style="font-family:system-ui;font-size:12px;color:#fbbf24">
        ${a.label}<br/>
        <span style="color:#94a3b8">${a.population.toLocaleString()} refugees</span>
      </div>`;
    })

    .onGlobeReady(onReady);

  // Camera controls
  const controls = globe.controls();
  controls.autoRotate = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 120;
  controls.maxDistance = 500;

  // Add clouds via the underlying three-globe (not typed in globe.gl)
  try {
    const threeGlobe = (globe as any).__globeObj;
    if (threeGlobe && typeof threeGlobe.cloudsImgUrl === 'function') {
      threeGlobe.cloudsImgUrl('./2k_earth_clouds.jpg');
    }
  } catch { /* clouds are cosmetic — fail silently */ }

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

export function getGlobe(): GlobeInstance | null {
  return globe;
}
