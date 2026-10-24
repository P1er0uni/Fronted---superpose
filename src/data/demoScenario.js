const routePalette = ['#73d5ff', '#9ee493', '#ffd166', '#ff8f70']

const routeSets = {
  initial: [
    [[92, 520], [205, 468], [330, 430], [455, 360], [590, 310], [735, 238], [900, 116]],
    [[92, 520], [185, 506], [300, 520], [430, 492], [560, 430], [710, 374], [900, 300]],
    [[92, 520], [160, 420], [270, 350], [390, 300], [520, 245], [690, 184], [900, 116]],
    [[92, 520], [205, 468], [310, 400], [430, 330], [548, 350], [690, 404], [900, 430]],
  ],
  incident: [
    [[92, 520], [205, 468], [330, 430], [430, 492], [560, 430], [710, 374], [900, 300]],
    [[92, 520], [185, 506], [300, 520], [420, 555], [590, 538], [760, 492], [900, 430]],
    [[92, 520], [160, 420], [270, 350], [350, 245], [470, 180], [640, 126], [900, 116]],
    [[92, 520], [205, 468], [310, 400], [390, 300], [520, 245], [690, 184], [900, 116]],
  ],
}

const nodes = [
  { id: 'origin', x: 92, y: 520, kind: 'origin' },
  { id: 'n1', x: 160, y: 420 }, { id: 'n2', x: 205, y: 468 },
  { id: 'n3', x: 185, y: 506 }, { id: 'n4', x: 270, y: 350 },
  { id: 'n5', x: 300, y: 520 }, { id: 'n6', x: 310, y: 400 },
  { id: 'n7', x: 350, y: 245 }, { id: 'n8', x: 390, y: 300 },
  { id: 'n9', x: 430, y: 330 }, { id: 'n10', x: 430, y: 492 },
  { id: 'n11', x: 420, y: 555 }, { id: 'n12', x: 470, y: 180 },
  { id: 'n13', x: 520, y: 245 }, { id: 'n14', x: 548, y: 350 },
  { id: 'n15', x: 560, y: 430 }, { id: 'n16', x: 590, y: 310 },
  { id: 'n17', x: 590, y: 538 }, { id: 'n18', x: 640, y: 126 },
  { id: 'n19', x: 690, y: 184 }, { id: 'n20', x: 690, y: 404 },
  { id: 'n21', x: 710, y: 374 }, { id: 'n22', x: 735, y: 238 },
  { id: 'n23', x: 760, y: 492 },
  { id: 'destination-north', x: 900, y: 116, kind: 'destination' },
  { id: 'destination-centre', x: 900, y: 300, kind: 'destination' },
  { id: 'destination-south', x: 900, y: 430, kind: 'destination' },
]

const roads = [
  { id: 'via-metropolitana', label: 'Vía Metropolitana', kind: 'highway', geometry: [[70, 548], [185, 506], [300, 470], [430, 420], [590, 345], [735, 238], [930, 94]] },
  { id: 'av-central', label: 'Av. Central', kind: 'primary', geometry: [[62, 520], [185, 506], [300, 520], [430, 492], [560, 430], [710, 374], [930, 294]] },
  { id: 'corredor-verde', label: 'Corredor Verde', kind: 'primary', geometry: [[80, 542], [160, 420], [270, 350], [390, 300], [520, 245], [690, 184], [930, 104]] },
  { id: 'av-del-parque', label: 'Av. del Parque', kind: 'primary', geometry: [[82, 520], [205, 468], [310, 400], [430, 330], [548, 350], [690, 404], [930, 438]] },
  { id: 'circuito-sur', label: 'Circuito Sur', kind: 'primary', geometry: [[88, 526], [185, 506], [300, 520], [420, 555], [590, 538], [760, 492], [930, 426]] },
  { id: 'av-norte', label: 'Av. Norte', kind: 'primary', geometry: [[80, 518], [160, 420], [270, 350], [350, 245], [470, 180], [640, 126], [930, 104]] },
  { id: 'calle-01', geometry: [[50, 92], [950, 92]] }, { id: 'calle-02', geometry: [[42, 142], [950, 142]] },
  { id: 'calle-03', geometry: [[34, 194], [946, 194]] }, { id: 'calle-04', geometry: [[30, 246], [955, 246]] },
  { id: 'calle-05', geometry: [[28, 300], [960, 300]] }, { id: 'calle-06', geometry: [[25, 352], [960, 352]] },
  { id: 'calle-07', geometry: [[20, 404], [960, 404]] }, { id: 'calle-08', geometry: [[18, 458], [962, 458]] },
  { id: 'calle-09', geometry: [[15, 510], [965, 510]] }, { id: 'calle-10', geometry: [[12, 560], [970, 560]] },
  { id: 'calle-a', geometry: [[90, 48], [92, 580]] }, { id: 'calle-b', geometry: [[150, 42], [160, 585]] },
  { id: 'calle-c', geometry: [[220, 38], [230, 588]] }, { id: 'calle-d', geometry: [[292, 32], [300, 592]] },
  { id: 'calle-e', geometry: [[365, 28], [370, 595]] }, { id: 'calle-f', geometry: [[442, 25], [445, 598]] },
  { id: 'calle-g', geometry: [[520, 22], [520, 600]] }, { id: 'calle-h', geometry: [[600, 20], [598, 602]] },
  { id: 'calle-i', geometry: [[678, 18], [680, 604]] }, { id: 'calle-j', geometry: [[758, 16], [760, 606]] },
  { id: 'calle-k', geometry: [[838, 14], [840, 608]] }, { id: 'calle-l', geometry: [[915, 12], [920, 610]] },
  { id: 'diagonal-oeste', geometry: [[30, 390], [180, 300], [330, 250], [480, 210]] },
  { id: 'diagonal-este', geometry: [[510, 500], [640, 430], [770, 360], [950, 250]] },
  { id: 'anillo-centro', geometry: [[350, 210], [410, 170], [500, 168], [565, 215], [575, 285], [530, 334], [445, 342], [375, 300], [350, 210]], closed: true },
]

export const DEMO_MAP = {
  width: 1000,
  height: 620,
  nodes,
  roads,
  areas: [
    { id: 'parque-norte', kind: 'park', points: [[560, 52], [660, 45], [692, 105], [622, 130], [550, 112]] },
    { id: 'parque-central', kind: 'park', points: [[705, 265], [792, 252], [824, 326], [748, 348], [690, 318]] },
    { id: 'parque-oeste', kind: 'park', points: [[108, 250], [190, 226], [222, 292], [155, 324], [94, 302]] },
    { id: 'rio', kind: 'water', points: [[0, 570], [210, 545], [420, 578], [650, 562], [1000, 520], [1000, 620], [0, 620]] },
  ],
  labels: [
    { text: 'Distrito Norte', x: 120, y: 74, kind: 'district' },
    { text: 'Centro Qflow', x: 392, y: 282, kind: 'district' },
    { text: 'Parque Norte', x: 572, y: 82, kind: 'park' },
    { text: 'Parque Central', x: 704, y: 292, kind: 'park' },
    { text: 'Av. Central', x: 598, y: 418, kind: 'street' },
    { text: 'Av. del Parque', x: 506, y: 372, kind: 'street' },
    { text: 'Vía Metropolitana', x: 610, y: 286, kind: 'street' },
    { text: 'Ribera Sur', x: 730, y: 548, kind: 'district' },
  ],
  badges: [
    { text: 'M1', x: 748, y: 220 },
    { text: 'C8', x: 290, y: 454 },
  ],
}

// These timelines only schedule animation along authored points; they do not find or optimise a route.
function timelineFor(points, index, duration = 19000) {
  const delay = (index % 5) * 480
  return points.map(([x, y], pointIndex) => ({
    x: x + ((index % 3) - 1) * 4,
    y: y + ((index % 4) - 1.5) * 3,
    atMs: delay + Math.round((duration * pointIndex) / (points.length - 1)),
  }))
}

function buildVehicles(setName, count = 20) {
  return Array.from({ length: count }, (_, index) => {
    const routeIndex = index % routeSets[setName].length
    return {
      id: `auto-${index + 1}`,
      color: routePalette[routeIndex],
      timeline: timelineFor(routeSets[setName][routeIndex], index, 17800 + routeIndex * 1500),
    }
  })
}

function buildRoutes(setName) {
  return routeSets[setName].map((points, index) => ({ id: `route-${index + 1}`, color: routePalette[index], points }))
}

export function createDemoSession(vehicleCount = 20) {
  const vehicles = buildVehicles('initial', vehicleCount)
  return {
    sessionId: 'demo-qflow',
    revision: 1,
    source: 'demo',
    map: DEMO_MAP,
    routes: buildRoutes('initial'),
    vehicles,
    metrics: {
      computeMs: null,
      reroutedVehicles: 0,
      averageTravelSeconds: 20.8,
      maxCongestionPct: 68,
    },
  }
}

export function applyDemoIncident(currentSession, incident) {
  const vehicles = buildVehicles('incident', currentSession.vehicles.length)
  return {
    ...currentSession,
    revision: currentSession.revision + 1,
    routes: buildRoutes('incident'),
    vehicles,
    incident,
    metrics: {
      computeMs: null,
      reroutedVehicles: Math.min(15, Math.max(6, Math.round(vehicles.length * 0.6))),
      averageTravelSeconds: 23.4,
      maxCongestionPct: 74,
    },
  }
}
