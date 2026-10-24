const MAP_WIDTH = 1000
const MAP_HEIGHT = 620
const MAP_PADDING = { left: 86, right: 92, top: 82, bottom: 82 }

const FLOW_COLORS = {
  usuario: '#5be7ef',
  fondo_1: '#f0c96a',
  fondo_2: '#91d6a8',
}

const EDGE_CURVATURE = {
  'NODO_A--NODO_B': -18,
  'NODO_A--NODO_C': 18,
  'NODO_B--NODO_D': -42,
  'NODO_B--NODO_E': 10,
  'NODO_C--NODO_D': 12,
  'NODO_C--NODO_E': -12,
  'NODO_D--NODO_F': -20,
  'NODO_E--NODO_F': -48,
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function edgeId(source, target) {
  return [source, target].sort().join('--')
}

function shortNode(nodeId) {
  return nodeId.replace('NODO_', '')
}

function sampleQuadratic(from, to, bend = 0, segments = 12) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const control = {
    x: (from.x + to.x) / 2 + (-dy / length) * bend,
    y: (from.y + to.y) / 2 + (dx / length) * bend,
  }
  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments
    const inverse = 1 - t
    return [
      inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
      inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
    ]
  })
}

function readableAngle(points) {
  const middle = Math.floor(points.length / 2)
  const previous = points[Math.max(0, middle - 1)]
  const next = points[Math.min(points.length - 1, middle + 1)]
  let angle = Math.atan2(next[1] - previous[1], next[0] - previous[0]) * (180 / Math.PI)
  if (angle > 90 || angle < -90) angle += 180
  return angle
}

function projectNodes(nodeDetails) {
  const lats = nodeDetails.map((node) => node.lat)
  const lons = nodeDetails.map((node) => node.lon)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const usableWidth = MAP_WIDTH - MAP_PADDING.left - MAP_PADDING.right
  const usableHeight = MAP_HEIGHT - MAP_PADDING.top - MAP_PADDING.bottom

  return nodeDetails.map((node) => ({
    ...node,
    label: shortNode(node.id),
    district: node.label,
    x: MAP_PADDING.left + ((node.lon - minLon) / (maxLon - minLon || 1)) * usableWidth,
    y: MAP_PADDING.top + ((maxLat - node.lat) / (maxLat - minLat || 1)) * usableHeight,
  }))
}

function loadFor(edgeLoads, source, target) {
  return edgeLoads.find((edge) => edgeId(edge.source, edge.target) === edgeId(source, target))
}

export function buildSuperposeMap(topology, strategy = 'coordinated', edgeLoads = []) {
  const nodes = projectNodes(topology.node_details || [])
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const roads = (topology.edges || []).map((edge) => {
    const id = edgeId(edge.source, edge.target)
    const from = nodesById.get(edge.source)
    const to = nodesById.get(edge.target)
    const geometry = sampleQuadratic(from, to, EDGE_CURVATURE[id] || 0)
    const load = loadFor(edgeLoads, edge.source, edge.target)
    const saturation = strategy === 'coordinated'
      ? (load?.saturation_optimized ?? edge.saturation ?? 0)
      : (load?.saturation_selfish ?? 0)
    const vehicles = strategy === 'coordinated'
      ? (load?.vehicles_optimized ?? edge.load ?? 0)
      : (load?.vehicles_selfish ?? 0)
    return {
      id,
      from: edge.source,
      to: edge.target,
      label: `${shortNode(edge.source)}–${shortNode(edge.target)}`,
      kind: edge.lanes >= 3 ? 'primary' : (edge.lanes === 2 ? 'secondary' : 'local'),
      lanes: edge.lanes,
      lengthKm: edge.length_km,
      speedKmh: edge.speed_kmh,
      baseTime: edge.base_time,
      currentTime: edge.current_time,
      capacity: edge.capacity,
      load: vehicles,
      saturation,
      event: edge.event,
      geometry,
      labelAt: geometry[Math.floor(geometry.length / 2)],
      labelAngle: readableAngle(geometry),
    }
  })

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    nodes,
    roads,
    geography: {
      name: 'Lima metropolitana',
      source: 'Coordenadas aproximadas de Superpose API',
      scaleKm: 5,
    },
  }
}

function roadLookup(map) {
  return new Map(map.roads.flatMap((road) => [
    [`${road.from}|${road.to}`, { road, reversed: false }],
    [`${road.to}|${road.from}`, { road, reversed: true }],
  ]))
}

function geometryForPath(nodePath, map) {
  const roads = roadLookup(map)
  return nodePath.slice(0, -1).flatMap((nodeId, index) => {
    const match = roads.get(`${nodeId}|${nodePath[index + 1]}`)
    if (!match) throw new Error(`La respuesta usa una arista inexistente: ${nodeId} → ${nodePath[index + 1]}`)
    const points = match.reversed ? [...match.road.geometry].reverse() : match.road.geometry
    return index === 0 ? points : points.slice(1)
  })
}

function minutesForPath(nodePath, map) {
  const roads = roadLookup(map)
  return nodePath.slice(0, -1).reduce((total, nodeId, index) => {
    const match = roads.get(`${nodeId}|${nodePath[index + 1]}`)
    return total + Number(match?.road.currentTime || 0)
  }, 0)
}

function allocateVisualVehicles(flows, count) {
  const total = flows.reduce((sum, flow) => sum + flow.vehicles, 0)
  const allocations = flows.map((flow) => ({
    id: flow.name,
    exact: (flow.vehicles / total) * count,
    count: 1,
  }))
  let remaining = Math.max(0, count - allocations.length)
  while (remaining > 0) {
    const target = allocations.reduce((best, item) => {
      const deficit = item.exact - item.count
      return deficit > best.deficit ? { item, deficit } : best
    }, { item: allocations[0], deficit: -Infinity }).item
    target.count += 1
    remaining -= 1
  }
  return new Map(allocations.map((allocation) => [allocation.id, allocation.count]))
}

function timelineFor(points, index, durationMs) {
  const delay = (index % 6) * 360
  return points.map(([x, y], pointIndex) => ({
    x: x + ((index % 3) - 1) * 3.2,
    y: y + ((index % 4) - 1.5) * 2.2,
    atMs: delay + Math.round((durationMs * pointIndex) / Math.max(1, points.length - 1)),
  }))
}

function createRoutes(flows, strategy, map) {
  return flows.map((flow) => {
    const nodePath = strategy === 'coordinated' ? flow.qaoa_route : flow.selfish_route
    return {
      id: `${flow.name}-${strategy}`,
      flowId: flow.name,
      nodePath,
      label: `${shortNode(flow.origin)} → ${shortNode(flow.destination)}`,
      color: FLOW_COLORS[flow.name] || '#d7e3e8',
      points: geometryForPath(nodePath, map),
    }
  })
}

function createVehicles(flows, routes, map, strategy, visualVehicleCount, optimization) {
  const allocations = allocateVisualVehicles(flows, visualVehicleCount)
  let visualIndex = 0
  return flows.flatMap((flow) => {
    const route = routes.find((candidate) => candidate.flowId === flow.name)
    const count = allocations.get(flow.name) || 1
    const wasReassigned = flow.qaoa_route.join('|') !== flow.selfish_route.join('|')
    const routeMinutes = flow.name === 'usuario'
      ? Number(strategy === 'coordinated' ? optimization.optimized.estimated_time : optimization.selfish.estimated_time)
      : minutesForPath(route.nodePath, map)
    return Array.from({ length: count }, (_, flowIndex) => {
      visualIndex += 1
      const durationMs = clamp(routeMinutes * 420, 12000, 32000) + (flowIndex % 4) * 420
      return {
        id: `auto-${String(visualIndex).padStart(2, '0')}`,
        color: route.color,
        flowId: flow.name,
        flowLabel: `${flow.name === 'usuario' ? 'Usuario' : `Flujo ${flow.name.replace('_', ' ')}`} · ${shortNode(flow.origin)} → ${shortNode(flow.destination)}`,
        originId: flow.origin,
        destinationId: flow.destination,
        routeId: route.id,
        rerouted: strategy === 'coordinated' && wasReassigned,
        representedVehicles: Number((flow.vehicles / count).toFixed(1)),
        estimatedTravelMinutes: Number(routeMinutes.toFixed(1)),
        explanation: strategy === 'coordinated'
          ? (wasReassigned
            ? 'QAOA asignó una alternativa para reducir el costo conjunto y la saturación compartida.'
            : 'QAOA conservó esta ruta dentro de la mejor combinación encontrada para los tres flujos.')
          : 'Dijkstra eligió la ruta de menor tiempo para este flujo sin coordinarla con los demás.',
        timeline: timelineFor(route.points, visualIndex, durationMs),
      }
    })
  })
}

function maximumSaturation(edgeLoads, strategy) {
  const field = strategy === 'coordinated' ? 'saturation_optimized' : 'saturation_selfish'
  return Math.max(0, ...edgeLoads.map((edge) => Number(edge[field] || 0))) * 100
}

function solverFor(strategy, optimization, flowCount, visualVehicleCount) {
  if (strategy === 'traditional') {
    return {
      framework: 'NetworkX',
      execution: 'backend',
      mode: 'Dijkstra por tiempo',
      facts: [
        { id: 'engine', label: 'Motor', value: 'NetworkX' },
        { id: 'method', label: 'Método', value: 'Dijkstra' },
        { id: 'flows', label: 'Flujos', value: String(flowCount) },
      ],
      problem: { binaryVariables: 0, constraints: 0, visualVehicles: visualVehicleCount },
    }
  }
  const telemetry = optimization.quantum_telemetry
  return {
    framework: 'Qiskit',
    execution: telemetry.solver_used,
    mode: `QAOA · ${telemetry.solver_used}`,
    facts: [
      { id: 'qubits', label: 'Qubits', value: String(telemetry.qubits_used) },
      { id: 'bitstring', label: 'Bitstring', value: telemetry.optimal_bitstring },
      { id: 'feasible', label: 'Solución', value: telemetry.feasible ? 'Factible' : 'No factible' },
    ],
    problem: {
      binaryVariables: telemetry.qubits_used,
      constraints: flowCount,
      candidateRoutes: telemetry.variables.length,
      visualVehicles: visualVehicleCount,
    },
  }
}

function strategyView(strategy, topology, optimization, visualVehicleCount) {
  const map = buildSuperposeMap(topology, strategy, optimization.edge_loads)
  const routes = createRoutes(optimization.flows, strategy, map)
  const coordinated = strategy === 'coordinated'
  const systemCost = coordinated
    ? optimization.comparison.system_cost_optimized
    : optimization.comparison.system_cost_selfish
  const reassignedVehicles = coordinated
    ? optimization.flows
      .filter((flow) => flow.qaoa_route.join('|') !== flow.selfish_route.join('|'))
      .reduce((sum, flow) => sum + flow.vehicles, 0)
    : 0
  return {
    strategy,
    strategyLabel: coordinated ? 'Qflow · asignación conjunta' : 'Tradicional · rutas individuales',
    strategyDescription: coordinated
      ? `${optimization.quantum_telemetry.solver_used} combina ${optimization.flows.length} flujos sobre ${optimization.quantum_telemetry.qubits_used} qubits.`
      : `NetworkX resuelve ${optimization.flows.length} rutas con Dijkstra, una por flujo.`,
    map,
    routes,
    vehicles: createVehicles(optimization.flows, routes, map, strategy, visualVehicleCount, optimization),
    metrics: {
      computeMs: coordinated ? optimization.quantum_telemetry.execution_time_ms : null,
      totalComputeMs: optimization.total_time_ms,
      reroutedVehicles: reassignedVehicles,
      modeledVehicles: optimization.flows.reduce((sum, flow) => sum + flow.vehicles, 0),
      averageTravelMinutes: systemCost / optimization.flows.length,
      maxCongestionPct: maximumSaturation(optimization.edge_loads, strategy),
      userEstimatedMinutes: coordinated ? optimization.optimized.estimated_time : optimization.selfish.estimated_time,
      systemCost,
    },
    solver: solverFor(strategy, optimization, optimization.flows.length, visualVehicleCount),
  }
}

function firstDifferentDecision(strategyViews, flows) {
  const coordinatedRoutes = strategyViews.coordinated.routes
  const traditionalRoutes = strategyViews.traditional.routes
  const coordinated = coordinatedRoutes.find((route) => {
    const traditional = traditionalRoutes.find((candidate) => candidate.flowId === route.flowId)
    return traditional?.nodePath.join('|') !== route.nodePath.join('|')
  })
  if (!coordinated) return null
  const traditional = traditionalRoutes.find((route) => route.flowId === coordinated.flowId)
  const flow = flows.find((candidate) => candidate.name === coordinated.flowId)
  return {
    flowLabel: `${flow.name === 'usuario' ? 'Usuario' : `Flujo ${flow.name.replace('_', ' ')}`} · ${shortNode(flow.origin)} → ${shortNode(flow.destination)}`,
    traditionalPath: traditional.nodePath.map(shortNode).join(' → '),
    coordinatedPath: coordinated.nodePath.map(shortNode).join(' → '),
  }
}

export function adaptSuperposeResponse({
  topology,
  optimization,
  visualVehicleCount = 20,
  previousSession = null,
  source = 'superpose-api',
}) {
  const strategyViews = {
    traditional: strategyView('traditional', topology, optimization, visualVehicleCount),
    coordinated: strategyView('coordinated', topology, optimization, visualVehicleCount),
  }
  const comparison = {
    individual: {
      userEstimatedMinutes: optimization.selfish.estimated_time,
      systemCost: optimization.comparison.system_cost_selfish,
      maxCongestionPct: strategyViews.traditional.metrics.maxCongestionPct,
      computeMs: null,
    },
    coordinated: {
      userEstimatedMinutes: optimization.optimized.estimated_time,
      systemCost: optimization.comparison.system_cost_optimized,
      maxCongestionPct: strategyViews.coordinated.metrics.maxCongestionPct,
      computeMs: optimization.quantum_telemetry.execution_time_ms,
    },
    userImprovementPct: optimization.comparison.user_improvement_pct,
    systemImprovementPct: optimization.comparison.system_improvement_pct,
  }
  const modeledVehicles = optimization.flows.reduce((sum, flow) => sum + flow.vehicles, 0)
  return {
    sessionId: previousSession?.sessionId || `${source}-lima`,
    revision: (previousSession?.revision || 0) + 1,
    source,
    topology,
    optimization,
    flows: optimization.flows.map((flow) => ({
      id: flow.name,
      originId: flow.origin,
      destinationId: flow.destination,
      vehicles: flow.vehicles,
      label: `${flow.name === 'usuario' ? 'Usuario' : `Flujo ${flow.name.replace('_', ' ')}`} · ${shortNode(flow.origin)} → ${shortNode(flow.destination)}`,
    })),
    visualVehicleCount,
    modeledVehicles,
    activeEvents: topology.active_events || [],
    dataNotice: `${visualVehicleCount} autos visuales representan ${modeledVehicles} vehículos modelados en 3 flujos.`,
    ...strategyViews.coordinated,
    strategyViews,
    keyDecision: firstDifferentDecision(strategyViews, optimization.flows),
    comparison,
  }
}

export function buildEdgeLoads(topology, flows) {
  const loadMap = (field) => {
    const loads = new Map((topology.edges || []).map((edge) => [edgeId(edge.source, edge.target), 0]))
    flows.forEach((flow) => {
      const path = flow[field]
      path.slice(0, -1).forEach((node, index) => {
        const id = edgeId(node, path[index + 1])
        loads.set(id, (loads.get(id) || 0) + flow.vehicles)
      })
    })
    return loads
  }
  const optimized = loadMap('qaoa_route')
  const selfish = loadMap('selfish_route')
  return topology.edges.map((edge) => {
    const id = edgeId(edge.source, edge.target)
    return {
      source: edge.source,
      target: edge.target,
      capacity: edge.capacity,
      event: edge.event,
      vehicles_optimized: optimized.get(id) || 0,
      saturation_optimized: Number(((optimized.get(id) || 0) / edge.capacity).toFixed(4)),
      vehicles_selfish: selfish.get(id) || 0,
      saturation_selfish: Number(((selfish.get(id) || 0) / edge.capacity).toFixed(4)),
    }
  })
}
