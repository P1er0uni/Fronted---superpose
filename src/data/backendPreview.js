// superpose-api defines the topology but not screen coordinates. This projection
// turns the exact graph into two urban corridors and two diagonal connectors.
// No synthetic road or node is added.
const backendNodes = [
  { id: 'NODO_A', label: 'A', x: 85, y: 310 },
  { id: 'NODO_B', label: 'B', x: 295, y: 500 },
  { id: 'NODO_C', label: 'C', x: 295, y: 120 },
  { id: 'NODO_D', label: 'D', x: 705, y: 120 },
  { id: 'NODO_E', label: 'E', x: 705, y: 500 },
  { id: 'NODO_F', label: 'F', x: 915, y: 310 },
]

const backendRoads = [
  {
    id: 'NODO_A--NODO_C', from: 'NODO_A', to: 'NODO_C', label: 'Vía central A–C', kind: 'primary',
    baseTime: 7, basePenalty: 12, capacity: 40,
    geometry: [[85, 310], [85, 120], [295, 120]], labelAt: [170, 104],
  },
  {
    id: 'NODO_C--NODO_D', from: 'NODO_C', to: 'NODO_D', label: 'Vía central C–D', kind: 'primary',
    baseTime: 5, basePenalty: 15, capacity: 35,
    geometry: [[295, 120], [500, 120], [705, 120]], labelAt: [500, 104],
  },
  {
    id: 'NODO_D--NODO_F', from: 'NODO_D', to: 'NODO_F', label: 'Vía central D–F', kind: 'primary',
    baseTime: 6, basePenalty: 15, capacity: 40,
    geometry: [[705, 120], [915, 120], [915, 310]], labelAt: [830, 104],
  },
  {
    id: 'NODO_A--NODO_B', from: 'NODO_A', to: 'NODO_B', label: 'Periférica norte A–B', kind: 'secondary',
    baseTime: 12, basePenalty: 6, capacity: 50,
    geometry: [[85, 310], [85, 500], [295, 500]], labelAt: [170, 522],
  },
  {
    id: 'NODO_B--NODO_D', from: 'NODO_B', to: 'NODO_D', label: 'Cruce B–D', kind: 'secondary',
    baseTime: 8, basePenalty: 8, capacity: 40,
    geometry: [[295, 500], [365, 435], [435, 372], [500, 310], [570, 245], [638, 182], [705, 120]], labelAt: [430, 390],
  },
  {
    id: 'NODO_B--NODO_E', from: 'NODO_B', to: 'NODO_E', label: 'Periférica norte B–E', kind: 'secondary',
    baseTime: 10, basePenalty: 6, capacity: 45,
    geometry: [[295, 500], [500, 500], [705, 500]], labelAt: [500, 522],
  },
  {
    id: 'NODO_E--NODO_F', from: 'NODO_E', to: 'NODO_F', label: 'Periférica E–F', kind: 'secondary',
    baseTime: 11, basePenalty: 6, capacity: 45,
    geometry: [[705, 500], [915, 500], [915, 310]], labelAt: [830, 522],
  },
  {
    id: 'NODO_C--NODO_E', from: 'NODO_C', to: 'NODO_E', label: 'Periférica sur C–E', kind: 'secondary',
    baseTime: 14, basePenalty: 6, capacity: 45,
    geometry: [[295, 120], [362, 182], [430, 245], [500, 310], [565, 372], [635, 435], [705, 500]], labelAt: [570, 390],
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
  usuarioPeriferica: route('usuario-periferica', 'usuario', ['NODO_A', 'NODO_B', 'NODO_D', 'NODO_F'], 'A → F'),
  fondo1Central: route('fondo-1-central', 'fondo_1', ['NODO_B', 'NODO_D', 'NODO_F'], 'B → F'),
  fondo1Periferica: route('fondo-1-periferica', 'fondo_1', ['NODO_B', 'NODO_E', 'NODO_F'], 'B → F'),
  fondo2Norte: route('fondo-2-norte', 'fondo_2', ['NODO_A', 'NODO_B', 'NODO_E'], 'A → E'),
  fondo2Sur: route('fondo-2-sur', 'fondo_2', ['NODO_A', 'NODO_C', 'NODO_E'], 'A → E'),
}

const allCandidateRoutes = Object.values(candidates)
const coordinatedNormalRoutes = [candidates.usuarioCentral, candidates.fondo1Central, candidates.fondo2Norte]
const traditionalNormalRoutes = [candidates.usuarioCentral, candidates.fondo1Central, candidates.fondo2Sur]

const coordinatedRoutesByScenario = {
  'accident-cd': [candidates.usuarioPeriferica, candidates.fondo1Periferica, candidates.fondo2Norte],
  'roadwork-bd': [candidates.usuarioCentral, candidates.fondo1Periferica, candidates.fondo2Norte],
  'traffic-ab': [candidates.usuarioCentral, candidates.fondo1Periferica, candidates.fondo2Sur],
}

const traditionalRoutesByScenario = {
  'accident-cd': [candidates.usuarioPeriferica, candidates.fondo1Central, candidates.fondo2Sur],
  'roadwork-bd': [candidates.usuarioCentral, candidates.fondo1Periferica, candidates.fondo2Sur],
  'traffic-ab': [candidates.usuarioCentral, candidates.fondo1Central, candidates.fondo2Sur],
}

export const MOCK_INCIDENTS = [
  {
    id: 'accident-cd', label: 'Accidente · Central C–D', roadId: 'NODO_C--NODO_D', roadLabel: 'Vía central C–D', type: 'accident',
    finding: 'Qflow separa los dos flujos que intentarían usar B–D después del accidente.',
    coordinatedReroutedFlowIds: ['usuario', 'fondo_1'], traditionalReroutedFlowIds: ['usuario'],
    metrics: { computeMs: 104.2, averageTravelSeconds: 23.4, maxCongestionPct: 74 },
    baseline: { computeMs: 7.8, averageTravelSeconds: 31.8, maxCongestionPct: 96, lastArrivalSeconds: 42.6 },
  },
  {
    id: 'roadwork-bd', label: 'Obras · Cruce B–D', roadId: 'NODO_B--NODO_D', roadLabel: 'Cruce B–D', type: 'roadworks',
    finding: 'El flujo B → F usa la periférica B–E–F sin alterar innecesariamente los otros dos flujos.',
    coordinatedReroutedFlowIds: ['fondo_1'], traditionalReroutedFlowIds: ['fondo_1'],
    metrics: { computeMs: 128.7, averageTravelSeconds: 25.1, maxCongestionPct: 78 },
    baseline: { computeMs: 8.1, averageTravelSeconds: 36.2, maxCongestionPct: 100, lastArrivalSeconds: 48.9 },
  },
  {
    id: 'traffic-ab', label: 'Congestión · Periférica A–B', roadId: 'NODO_A--NODO_B', roadLabel: 'Periférica norte A–B', type: 'traffic_jam',
    finding: 'Qflow mueve A → E a A–C–E y B → F a B–E–F para descargar A–B sin concentrar todos los autos en la vía central.',
    coordinatedReroutedFlowIds: ['fondo_1', 'fondo_2'], traditionalReroutedFlowIds: [],
    metrics: { computeMs: 96.5, averageTravelSeconds: 22.7, maxCongestionPct: 71 },
    baseline: { computeMs: 6.9, averageTravelSeconds: 29.4, maxCongestionPct: 94, lastArrivalSeconds: 39.8 },
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

function vehiclesFor(routes, count, reroutedFlowIds = [], strategy = 'coordinated') {
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
      explanation: strategy === 'traditional'
        ? 'Dijkstra elige la ruta más rápida de este flujo sin anticipar las decisiones de los demás.'
        : (rerouted
          ? 'Qflow reasignó este flujo para reducir el costo total de la red.'
          : 'Qflow mantiene esta ruta porque sigue siendo compatible con la mejor asignación conjunta.'),
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

function traditionalSolverPreview(vehicleCount, computeMs) {
  const graphMs = Number((computeMs * 0.28).toFixed(1))
  const routeMs = Number((computeMs * 0.56).toFixed(1))
  const assignMs = Number((computeMs - graphMs - routeMs).toFixed(1))
  return {
    framework: 'NetworkX', execution: 'simulated', mode: 'Dijkstra individual',
    problem: { binaryVariables: 0, constraints: 0, candidateRoutes: 3, visualVehicles: vehicleCount },
    stages: [
      { id: 'graph', label: 'Leer grafo', durationMs: graphMs },
      { id: 'route', label: 'Ruta mínima', durationMs: routeMs },
      { id: 'assign', label: 'Asignar', durationMs: assignMs },
    ],
  }
}

function comparisonFor(coordinated, individual) {
  return {
    individual,
    coordinated: {
      computeMs: coordinated.computeMs,
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

function strategyView(strategy, routes, vehicleCount, metrics, reroutedFlowIds = []) {
  const coordinated = strategy === 'coordinated'
  return {
    strategy,
    strategyLabel: coordinated ? 'Qflow · asignación conjunta' : 'Tradicional · rutas individuales',
    strategyDescription: coordinated
      ? 'Qiskit evalúa la combinación de los 3 flujos.'
      : 'Dijkstra resuelve cada origen y destino por separado.',
    routes,
    vehicles: vehiclesFor(routes, vehicleCount, reroutedFlowIds, strategy),
    metrics,
    solver: coordinated
      ? solverPreview(vehicleCount, metrics.computeMs)
      : traditionalSolverPreview(vehicleCount, metrics.computeMs),
  }
}

function firstDifferentDecision(strategyViews) {
  const traditionalRoutes = strategyViews.traditional.routes
  const coordinatedRoutes = strategyViews.coordinated.routes
  const coordinatedRoute = coordinatedRoutes.find((route) => {
    const traditionalRoute = traditionalRoutes.find((candidate) => candidate.flowId === route.flowId)
    return traditionalRoute?.nodePath.join('|') !== route.nodePath.join('|')
  })
  if (!coordinatedRoute) return null
  const traditionalRoute = traditionalRoutes.find((route) => route.flowId === coordinatedRoute.flowId)
  const flow = flows.find((candidate) => candidate.id === coordinatedRoute.flowId)
  return {
    flowLabel: flow.label,
    traditionalPath: traditionalRoute.nodePath.map((node) => node.replace('NODO_', '')).join(' → '),
    coordinatedPath: coordinatedRoute.nodePath.map((node) => node.replace('NODO_', '')).join(' → '),
  }
}

export function createMockSession(vehicleCount = 20) {
  const coordinatedMetrics = { computeMs: 82.4, reroutedVehicles: 0, averageTravelSeconds: 20.8, maxCongestionPct: 68 }
  const traditionalMetrics = { computeMs: 6.4, reroutedVehicles: 0, averageTravelSeconds: 24.6, maxCongestionPct: 86 }
  const comparison = comparisonFor(coordinatedMetrics, { ...traditionalMetrics, lastArrivalSeconds: 34.2 })
  const strategyViews = {
    traditional: strategyView('traditional', traditionalNormalRoutes, vehicleCount, traditionalMetrics),
    coordinated: strategyView('coordinated', coordinatedNormalRoutes, vehicleCount, coordinatedMetrics),
  }
  const keyDecision = firstDifferentDecision(strategyViews)
  return {
    sessionId: 'preview-qiskit-01', revision: 1, source: 'mock-backend', map, flows,
    dataNotice: `Respuesta simulada: ${vehicleCount} autos visualizan 3 flujos agregados y 6 decisiones binarias.`,
    ...strategyViews.coordinated,
    strategyViews,
    keyDecision,
    comparison,
  }
}

export function applyMockIncident(currentSession, incident) {
  const scenario = MOCK_INCIDENTS.find((item) => item.id === incident.scenarioId) || MOCK_INCIDENTS[0]
  const vehicleCount = currentSession.vehicles.length
  const coordinatedMetrics = {
    ...scenario.metrics,
    reroutedVehicles: reroutedVehicleCount(vehicleCount, scenario.coordinatedReroutedFlowIds),
  }
  const traditionalMetrics = {
    ...scenario.baseline,
    reroutedVehicles: reroutedVehicleCount(vehicleCount, scenario.traditionalReroutedFlowIds),
  }
  const strategyViews = {
    traditional: strategyView('traditional', traditionalRoutesByScenario[scenario.id], vehicleCount, traditionalMetrics, scenario.traditionalReroutedFlowIds),
    coordinated: strategyView('coordinated', coordinatedRoutesByScenario[scenario.id], vehicleCount, coordinatedMetrics, scenario.coordinatedReroutedFlowIds),
  }
  return {
    ...currentSession,
    revision: currentSession.revision + 1,
    ...strategyViews.coordinated,
    strategyViews,
    keyDecision: firstDifferentDecision(strategyViews),
    comparison: comparisonFor(coordinatedMetrics, { ...traditionalMetrics, lastArrivalSeconds: scenario.baseline.lastArrivalSeconds }),
    incident: { ...incident, scenarioId: scenario.id, finding: scenario.finding },
  }
}

console.assert(flows.length === 3, 'La vista previa debe conservar tres flujos origen-destino.')
console.assert(allCandidateRoutes.length === 6, 'El QUBO debe conservar seis rutas candidatas.')
console.assert(MOCK_INCIDENTS.every((scenario) => coordinatedRoutesByScenario[scenario.id]?.length === 3), 'Cada incidente debe mostrar tres rutas Qflow.')
console.assert(MOCK_INCIDENTS.every((scenario) => traditionalRoutesByScenario[scenario.id]?.length === 3), 'Cada incidente debe mostrar tres rutas tradicionales.')
