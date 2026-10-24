// superpose-api defines the topology but not screen coordinates. These positions
// curve that exact graph for the demo; no synthetic roads or nodes are added.
const backendNodes = [
  { id: 'NODO_A', label: 'A', x: 92, y: 304 },
  { id: 'NODO_B', label: 'B', x: 292, y: 505 },
  { id: 'NODO_C', label: 'C', x: 292, y: 112 },
  { id: 'NODO_D', label: 'D', x: 610, y: 244 },
  { id: 'NODO_E', label: 'E', x: 610, y: 488 },
  { id: 'NODO_F', label: 'F', x: 910, y: 304 },
]

const backendRoads = [
  {
    id: 'NODO_A--NODO_C', from: 'NODO_A', to: 'NODO_C', label: 'Vía central A–C', kind: 'primary',
    baseTime: 7, basePenalty: 12, capacity: 40,
    geometry: [[92, 304], [120, 255], [168, 196], [224, 145], [292, 112]], labelAt: [174, 178],
  },
  {
    id: 'NODO_C--NODO_D', from: 'NODO_C', to: 'NODO_D', label: 'Vía central C–D', kind: 'primary',
    baseTime: 5, basePenalty: 15, capacity: 35,
    geometry: [[292, 112], [366, 100], [446, 122], [530, 173], [610, 244]], labelAt: [447, 116],
  },
  {
    id: 'NODO_D--NODO_F', from: 'NODO_D', to: 'NODO_F', label: 'Vía central D–F', kind: 'primary',
    baseTime: 6, basePenalty: 15, capacity: 40,
    geometry: [[610, 244], [682, 224], [760, 229], [838, 258], [910, 304]], labelAt: [766, 219],
  },
  {
    id: 'NODO_A--NODO_B', from: 'NODO_A', to: 'NODO_B', label: 'Periférica norte A–B', kind: 'secondary',
    baseTime: 12, basePenalty: 6, capacity: 50,
    geometry: [[92, 304], [120, 362], [166, 420], [226, 472], [292, 505]], labelAt: [166, 431],
  },
  {
    id: 'NODO_B--NODO_D', from: 'NODO_B', to: 'NODO_D', label: 'Cruce B–D', kind: 'secondary',
    baseTime: 8, basePenalty: 8, capacity: 40,
    geometry: [[292, 505], [358, 473], [430, 421], [500, 358], [558, 296], [610, 244]], labelAt: [459, 380],
  },
  {
    id: 'NODO_B--NODO_E', from: 'NODO_B', to: 'NODO_E', label: 'Periférica norte B–E', kind: 'secondary',
    baseTime: 10, basePenalty: 6, capacity: 45,
    geometry: [[292, 505], [362, 529], [440, 529], [526, 512], [610, 488]], labelAt: [448, 548],
  },
  {
    id: 'NODO_E--NODO_F', from: 'NODO_E', to: 'NODO_F', label: 'Periférica E–F', kind: 'secondary',
    baseTime: 11, basePenalty: 6, capacity: 45,
    geometry: [[610, 488], [682, 476], [758, 442], [838, 382], [910, 304]], labelAt: [780, 441],
  },
  {
    id: 'NODO_C--NODO_E', from: 'NODO_C', to: 'NODO_E', label: 'Periférica sur C–E', kind: 'secondary',
    baseTime: 14, basePenalty: 6, capacity: 45,
    geometry: [[292, 112], [320, 182], [374, 266], [446, 350], [530, 434], [610, 488]], labelAt: [382, 281],
  },
]

const map = { width: 1000, height: 620, nodes: backendNodes, roads: backendRoads, areas: [], labels: [], badges: [] }
const roadByPair = new Map(backendRoads.flatMap((road) => [
  [`${road.from}|${road.to}`, { road, reversed: false }],
  [`${road.to}|${road.from}`, { road, reversed: true }],
]))

function geometryForPath(nodePath) {
  return nodePath.slice(0, -1).flatMap((nodeId, index) => {
    const nextId = nodePath[index + 1]
    const match = roadByPair.get(`${nodeId}|${nextId}`)
    if (!match) throw new Error(`La ruta usa una arista inexistente: ${nodeId} → ${nextId}`)
    const points = match.reversed ? [...match.road.geometry].reverse() : match.road.geometry
    return index === 0 ? points : points.slice(1)
  })
}

const flowPalette = { usuario: '#59d9ff', fondo_1: '#ffca5f', fondo_2: '#80e39d' }
const flows = [
  { id: 'usuario', originId: 'NODO_A', destinationId: 'NODO_F', label: 'Usuario · Nodo A → Nodo F' },
  { id: 'fondo_1', originId: 'NODO_B', destinationId: 'NODO_F', label: 'Flujo de fondo 1 · Nodo B → Nodo F' },
  { id: 'fondo_2', originId: 'NODO_A', destinationId: 'NODO_E', label: 'Flujo de fondo 2 · Nodo A → Nodo E' },
]

function route(id, flowId, nodePath, label) {
  return { id, flowId, nodePath, label, color: flowPalette[flowId], points: geometryForPath(nodePath) }
}

const candidates = {
  usuarioCentral: route('usuario-central', 'usuario', ['NODO_A', 'NODO_C', 'NODO_D', 'NODO_F'], 'A → F'),
  usuarioPeriferica: route('usuario-periferica', 'usuario', ['NODO_A', 'NODO_B', 'NODO_E', 'NODO_F'], 'A → F'),
  fondo1Central: route('fondo-1-central', 'fondo_1', ['NODO_B', 'NODO_D', 'NODO_F'], 'B → F'),
  fondo1Periferica: route('fondo-1-periferica', 'fondo_1', ['NODO_B', 'NODO_E', 'NODO_F'], 'B → F'),
  fondo2Norte: route('fondo-2-norte', 'fondo_2', ['NODO_A', 'NODO_B', 'NODO_E'], 'A → E'),
  fondo2Sur: route('fondo-2-sur', 'fondo_2', ['NODO_A', 'NODO_C', 'NODO_E'], 'A → E'),
}

const allCandidateRoutes = Object.values(candidates)
const normalRoutes = [candidates.usuarioCentral, candidates.fondo1Central, candidates.fondo2Norte]
const selectedRoutesByScenario = {
  'accident-cd': [candidates.usuarioPeriferica, candidates.fondo1Central, candidates.fondo2Norte],
  'roadwork-bd': [candidates.usuarioCentral, candidates.fondo1Periferica, candidates.fondo2Norte],
  'traffic-ab': [candidates.usuarioCentral, candidates.fondo1Central, candidates.fondo2Sur],
}

export const MOCK_INCIDENTS = [
  {
    id: 'accident-cd', label: 'Accidente · Central C–D', roadId: 'NODO_C--NODO_D', roadLabel: 'Vía central C–D', type: 'accident',
    finding: 'El flujo del usuario evita C–D y la asignación conjunta conserva libres las alternativas del resto.',
    reroutedFlowIds: ['usuario'], metrics: { computeMs: 104.2, averageTravelSeconds: 23.4, maxCongestionPct: 74 },
    baseline: { averageTravelSeconds: 31.8, maxCongestionPct: 96, lastArrivalSeconds: 42.6 },
  },
  {
    id: 'roadwork-bd', label: 'Obras · Cruce B–D', roadId: 'NODO_B--NODO_D', roadLabel: 'Cruce B–D', type: 'roadworks',
    finding: 'El flujo B → F usa la periférica B–E–F sin alterar innecesariamente los otros dos flujos.',
    reroutedFlowIds: ['fondo_1'], metrics: { computeMs: 128.7, averageTravelSeconds: 25.1, maxCongestionPct: 78 },
    baseline: { averageTravelSeconds: 36.2, maxCongestionPct: 100, lastArrivalSeconds: 48.9 },
  },
  {
    id: 'traffic-ab', label: 'Congestión · Periférica A–B', roadId: 'NODO_A--NODO_B', roadLabel: 'Periférica norte A–B', type: 'traffic_jam',
    finding: 'El flujo A → E cambia a A–C–E para descargar la periférica A–B.',
    reroutedFlowIds: ['fondo_2'], metrics: { computeMs: 96.5, averageTravelSeconds: 22.7, maxCongestionPct: 71 },
    baseline: { averageTravelSeconds: 29.4, maxCongestionPct: 94, lastArrivalSeconds: 39.8 },
  },
]

function timelineFor(points, index, duration) {
  const delay = (index % 5) * 480
  return points.map(([x, y], pointIndex) => ({
    x: x + ((index % 3) - 1) * 3,
    y: y + ((index % 4) - 1.5) * 2.4,
    atMs: delay + Math.round((duration * pointIndex) / (points.length - 1)),
  }))
}

function vehiclesFor(routes, count, reroutedFlowIds = []) {
  const reroutedFlows = new Set(reroutedFlowIds)
  return Array.from({ length: count }, (_, index) => {
    const flow = flows[index % flows.length]
    const assignedRoute = routes.find((item) => item.flowId === flow.id)
    const rerouted = reroutedFlows.has(flow.id)
    const duration = 17800 + (index % 4) * 900 + (rerouted ? 1800 : 0)
    return {
      id: `auto-${String(index + 1).padStart(2, '0')}`,
      color: assignedRoute.color,
      flowId: flow.id, flowLabel: flow.label, originId: flow.originId, destinationId: flow.destinationId,
      routeId: assignedRoute.id, rerouted, estimatedTravelSeconds: Number((duration / 1000).toFixed(1)),
      explanation: rerouted
        ? 'Qflow reasignó este flujo para reducir el costo total de la red.'
        : 'Qflow mantiene esta ruta porque sigue siendo compatible con la mejor asignación conjunta.',
      timeline: timelineFor(assignedRoute.points, index, duration),
    }
  })
}

function solverPreview(vehicleCount, computeMs) {
  const encodeMs = Number((computeMs * 0.18).toFixed(1))
  const solveMs = Number((computeMs * 0.69).toFixed(1))
  const decodeMs = Number((computeMs - encodeMs - solveMs).toFixed(1))
  return {
    framework: 'Qiskit', execution: 'simulated', mode: 'QUBO híbrido',
    problem: { binaryVariables: 6, constraints: 3, candidateRoutes: 6, visualVehicles: vehicleCount },
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

function reroutedVehicleCount(vehicleCount, reroutedFlowIds) {
  return Array.from({ length: vehicleCount }, (_, index) => flows[index % flows.length])
    .filter((flow) => reroutedFlowIds.includes(flow.id)).length
}

export function createMockSession(vehicleCount = 20) {
  const metrics = { computeMs: 82.4, reroutedVehicles: 0, averageTravelSeconds: 20.8, maxCongestionPct: 68 }
  return {
    sessionId: 'preview-qiskit-01', revision: 1, source: 'mock-backend', map, flows,
    dataNotice: `Respuesta simulada: ${vehicleCount} autos visualizan 3 flujos agregados y 6 decisiones binarias.`,
    routes: normalRoutes, vehicles: vehiclesFor(normalRoutes, vehicleCount),
    solver: solverPreview(vehicleCount, metrics.computeMs),
    comparison: comparisonFor(metrics, { averageTravelSeconds: 24.6, maxCongestionPct: 86, lastArrivalSeconds: 34.2 }),
    metrics,
  }
}

export function applyMockIncident(currentSession, incident) {
  const scenario = MOCK_INCIDENTS.find((item) => item.id === incident.scenarioId) || MOCK_INCIDENTS[0]
  const assignedRoutes = selectedRoutesByScenario[scenario.id]
  const vehicleCount = currentSession.vehicles.length
  const metrics = {
    ...scenario.metrics,
    reroutedVehicles: reroutedVehicleCount(vehicleCount, scenario.reroutedFlowIds),
  }
  return {
    ...currentSession, revision: currentSession.revision + 1, routes: assignedRoutes,
    vehicles: vehiclesFor(assignedRoutes, vehicleCount, scenario.reroutedFlowIds),
    solver: solverPreview(vehicleCount, metrics.computeMs), comparison: comparisonFor(metrics, scenario.baseline),
    incident: { ...incident, scenarioId: scenario.id, finding: scenario.finding }, metrics,
  }
}

console.assert(flows.length === 3, 'La vista previa debe conservar tres flujos origen-destino.')
console.assert(allCandidateRoutes.length === 6, 'El QUBO debe conservar seis rutas candidatas.')
console.assert(MOCK_INCIDENTS.every((scenario) => selectedRoutesByScenario[scenario.id]?.length === 3), 'Cada incidente debe mostrar tres rutas asignadas.')
