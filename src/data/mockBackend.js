import { DEMO_MAP } from './demoScenario'

const palette = ['#73d5ff', '#9ee493', '#ffd166', '#ff8f70']

const flows = [
  { id: 'norte', originId: 'origin-north', destinationId: 'destination-north', label: 'Distrito Norte → Terminal Norte' },
  { id: 'centro', originId: 'origin-centre', destinationId: 'destination-centre', label: 'Distrito Oeste → Centro Qflow' },
  { id: 'sur', originId: 'origin-south', destinationId: 'destination-south', label: 'Ribera Oeste → Ribera Este' },
]

const map = {
  ...DEMO_MAP,
  nodes: [
    ...DEMO_MAP.nodes.filter((node) => node.id !== 'origin'),
    { id: 'origin-north', x: 92, y: 142, kind: 'origin' },
    { id: 'origin-centre', x: 62, y: 300, kind: 'origin' },
    { id: 'origin-south', x: 92, y: 520, kind: 'origin' },
  ],
}

const normalRoutes = [
  ['norte-a', 'norte', palette[0], [[92, 142], [220, 142], [350, 160], [470, 180], [640, 126], [900, 116]]],
  ['norte-b', 'norte', palette[1], [[92, 142], [150, 220], [270, 246], [390, 210], [520, 170], [690, 184], [900, 116]]],
  ['centro-a', 'centro', palette[2], [[62, 300], [180, 300], [300, 300], [430, 300], [590, 310], [735, 300], [900, 300]]],
  ['centro-b', 'centro', palette[0], [[62, 300], [160, 352], [310, 400], [430, 330], [548, 350], [710, 374], [900, 300]]],
  ['sur-a', 'sur', palette[1], [[92, 520], [185, 506], [300, 520], [430, 492], [560, 430], [710, 374], [900, 430]]],
  ['sur-b', 'sur', palette[3], [[92, 520], [205, 468], [310, 400], [430, 330], [548, 350], [690, 404], [900, 430]]],
]

const routesByScenario = {
  'accident-metropolitana': [
    normalRoutes[0],
    ['norte-desvio', 'norte', palette[1], [[92, 142], [150, 220], [270, 246], [350, 245], [470, 180], [640, 126], [900, 116]]],
    normalRoutes[2],
    ['centro-desvio', 'centro', palette[0], [[62, 300], [160, 352], [310, 400], [430, 420], [560, 430], [710, 374], [900, 300]]],
    normalRoutes[4], normalRoutes[5],
  ],
  'closure-central': [
    normalRoutes[0], normalRoutes[1],
    ['centro-norte', 'centro', palette[2], [[62, 300], [160, 246], [270, 246], [390, 210], [520, 245], [690, 246], [900, 300]]],
    ['centro-sur', 'centro', palette[0], [[62, 300], [160, 352], [310, 400], [430, 420], [590, 405], [760, 352], [900, 300]]],
    ['sur-circuito', 'sur', palette[1], [[92, 520], [185, 506], [300, 520], [420, 555], [590, 538], [760, 492], [900, 430]]],
    ['sur-parque', 'sur', palette[3], [[92, 520], [205, 468], [310, 400], [430, 330], [548, 350], [690, 404], [900, 430]]],
  ],
  'demand-centre': [
    ['norte-exterior', 'norte', palette[0], [[92, 142], [220, 92], [365, 92], [520, 92], [678, 92], [900, 116]]],
    normalRoutes[1], normalRoutes[2],
    ['centro-norte', 'centro', palette[0], [[62, 300], [160, 246], [270, 246], [390, 210], [520, 245], [690, 246], [900, 300]]],
    ['sur-circuito', 'sur', palette[1], [[92, 520], [185, 506], [300, 520], [420, 555], [590, 538], [760, 492], [900, 430]]],
    ['sur-ribera', 'sur', palette[3], [[92, 520], [205, 510], [365, 510], [520, 500], [680, 470], [820, 445], [900, 430]]],
  ],
}

export const MOCK_INCIDENTS = [
  {
    id: 'accident-metropolitana', label: 'Accidente · Vía Metropolitana', roadId: 'via-metropolitana', roadLabel: 'Vía Metropolitana', type: 'accident',
    finding: 'Los vehículos se reparten entre dos corredores para evitar concentrar el desvío.', reroutedShare: 0.6,
    metrics: { computeMs: 104.2, averageTravelSeconds: 23.4, maxCongestionPct: 74 },
    baseline: { averageTravelSeconds: 31.8, maxCongestionPct: 96, lastArrivalSeconds: 42.6 },
  },
  {
    id: 'closure-central', label: 'Cierre total · Av. Central', roadId: 'av-central', roadLabel: 'Av. Central', type: 'closure',
    finding: 'La vía se elimina de la solución y el tráfico se divide entre el norte y el sur.', reroutedShare: 0.75,
    metrics: { computeMs: 128.7, averageTravelSeconds: 25.1, maxCongestionPct: 78 },
    baseline: { averageTravelSeconds: 36.2, maxCongestionPct: 100, lastArrivalSeconds: 48.9 },
  },
  {
    id: 'demand-centre', label: 'Alta demanda · Centro Qflow', roadId: 'av-del-parque', roadLabel: 'Av. del Parque', type: 'demand_spike',
    finding: 'El flujo se distribuye antes de llegar al centro para reducir la cola máxima.', reroutedShare: 0.45,
    metrics: { computeMs: 96.5, averageTravelSeconds: 22.7, maxCongestionPct: 71 },
    baseline: { averageTravelSeconds: 29.4, maxCongestionPct: 94, lastArrivalSeconds: 39.8 },
  },
]

function normaliseRoutes(rows) {
  return rows.map(([id, flowId, color, points]) => ({ id, flowId, color, points }))
}

function timelineFor(points, index, duration) {
  const delay = (index % 5) * 480
  return points.map(([x, y], pointIndex) => ({
    x: x + ((index % 3) - 1) * 4,
    y: y + ((index % 4) - 1.5) * 3,
    atMs: delay + Math.round((duration * pointIndex) / (points.length - 1)),
  }))
}

function vehiclesFor(routeRows, count, reroutedShare = 0) {
  const routes = normaliseRoutes(routeRows)
  const reroutedCount = Math.round(count * reroutedShare)
  return Array.from({ length: count }, (_, index) => {
    const flow = flows[index % flows.length]
    const candidates = routes.filter((route) => route.flowId === flow.id)
    const route = candidates[Math.floor(index / flows.length) % candidates.length]
    const rerouted = index < reroutedCount
    const duration = 17800 + (index % 4) * 900 + (rerouted ? 1800 : 0)
    return {
      id: `auto-${String(index + 1).padStart(2, '0')}`,
      color: route.color,
      flowId: flow.id,
      flowLabel: flow.label,
      originId: flow.originId,
      destinationId: flow.destinationId,
      routeId: route.id,
      rerouted,
      estimatedTravelSeconds: Number((duration / 1000).toFixed(1)),
      explanation: rerouted
        ? 'Ruta coordinada para evitar concentrar vehículos en el mismo desvío.'
        : 'La ruta se mantiene porque no aumenta la congestión del conjunto.',
      timeline: timelineFor(route.points, index, duration),
    }
  })
}

function solverPreview(vehicleCount, computeMs) {
  const encodeMs = Number((computeMs * 0.18).toFixed(1))
  const solveMs = Number((computeMs * 0.69).toFixed(1))
  const decodeMs = Number((computeMs - encodeMs - solveMs).toFixed(1))
  return {
    framework: 'Qiskit', execution: 'simulated', mode: 'QUBO híbrido',
    problem: { binaryVariables: vehicleCount * 3, constraints: vehicleCount + 6, candidateRoutes: vehicleCount * 3 },
    stages: [
      { id: 'encode', label: 'Formular QUBO', durationMs: encodeMs },
      { id: 'solve', label: 'Resolver', durationMs: solveMs },
      { id: 'decode', label: 'Decodificar', durationMs: decodeMs },
    ],
  }
}

function comparisonFor(coordinated, individual) {
  return {
    individual,
    coordinated: {
      averageTravelSeconds: coordinated.averageTravelSeconds,
      maxCongestionPct: coordinated.maxCongestionPct,
      lastArrivalSeconds: Number((coordinated.averageTravelSeconds * 1.35).toFixed(1)),
    },
  }
}

export function createMockSession(vehicleCount = 20) {
  const metrics = { computeMs: 82.4, reroutedVehicles: 0, averageTravelSeconds: 20.8, maxCongestionPct: 68 }
  return {
    sessionId: 'preview-qiskit-01', revision: 1, source: 'mock-backend', map, flows,
    dataNotice: 'Respuesta simulada. Qiskit todavía no se ejecuta.',
    routes: normaliseRoutes(normalRoutes), vehicles: vehiclesFor(normalRoutes, vehicleCount),
    solver: solverPreview(vehicleCount, metrics.computeMs),
    comparison: comparisonFor(metrics, { averageTravelSeconds: 24.6, maxCongestionPct: 86, lastArrivalSeconds: 34.2 }),
    metrics,
  }
}

export function applyMockIncident(currentSession, incident) {
  const scenario = MOCK_INCIDENTS.find((item) => item.id === incident.scenarioId) || MOCK_INCIDENTS[0]
  const routeRows = routesByScenario[scenario.id]
  const vehicleCount = currentSession.vehicles.length
  const metrics = { ...scenario.metrics, reroutedVehicles: Math.round(vehicleCount * scenario.reroutedShare) }
  return {
    ...currentSession,
    revision: currentSession.revision + 1,
    routes: normaliseRoutes(routeRows),
    vehicles: vehiclesFor(routeRows, vehicleCount, scenario.reroutedShare),
    solver: solverPreview(vehicleCount, metrics.computeMs),
    comparison: comparisonFor(metrics, scenario.baseline),
    incident: { ...incident, scenarioId: scenario.id, finding: scenario.finding },
    metrics,
  }
}

console.assert(flows.length === 3, 'La vista previa debe conservar tres flujos origen-destino.')
console.assert(MOCK_INCIDENTS.every((scenario) => routesByScenario[scenario.id]?.length === 6), 'Cada incidente debe devolver seis rutas.')
