import React, { useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE, reportIncident, startSimulation } from '../api/simulation'
import { applyMockIncident, createMockSession, MOCK_INCIDENTS } from '../data/mockBackend'

const INCIDENTS = [
  { value: 'accident', label: 'Accidente' },
  { value: 'closure', label: 'Vía cerrada' },
  { value: 'roadworks', label: 'Obras' },
  { value: 'demand_spike', label: 'Alta demanda' },
]

const STATUS_LABELS = {
  idle: 'Esperando inicio',
  connecting: 'Consultando backend',
  running: 'Simulación activa',
  paused: 'Simulación pausada',
  recalculating: 'Recalculando rutas',
  error: 'Sin conexión',
  complete: 'Recorrido completado',
}

function number(value, digits = 0) {
  return Number.isFinite(Number(value))
    ? new Intl.NumberFormat('es-PE', { maximumFractionDigits: digits }).format(Number(value))
    : '—'
}

function seconds(value) {
  if (!Number.isFinite(Number(value))) return '—'
  const total = Number(value)
  if (total < 60) return `${number(total, 1)} s`
  return `${Math.floor(total / 60)} min ${Math.round(total % 60)} s`
}

function pointAt(timeline = [], elapsedMs = 0) {
  if (!timeline.length) return null
  if (elapsedMs <= timeline[0].atMs) return timeline[0]

  for (let index = 1; index < timeline.length; index += 1) {
    const next = timeline[index]
    const previous = timeline[index - 1]
    if (elapsedMs <= next.atMs) {
      const span = Math.max(1, next.atMs - previous.atMs)
      const ratio = Math.min(1, Math.max(0, (elapsedMs - previous.atMs) / span))
      return {
        x: previous.x + (next.x - previous.x) * ratio,
        y: previous.y + (next.y - previous.y) * ratio,
        angle: Math.atan2(next.y - previous.y, next.x - previous.x) * (180 / Math.PI),
      }
    }
  }

  const last = timeline[timeline.length - 1]
  const previous = timeline[timeline.length - 2] || last
  return { ...last, angle: Math.atan2(last.y - previous.y, last.x - previous.x) * (180 / Math.PI) }
}

function pointsForRoad(road, nodes) {
  if (road.geometry?.length) return road.geometry
  const from = nodes.get(road.from)
  const to = nodes.get(road.to)
  return from && to ? [[from.x, from.y], [to.x, to.y]] : []
}

function pathFromPoints(points = [], closed = false) {
  if (!points.length) return ''
  return `${points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ')}${closed ? ' Z' : ''}`
}

function SimulationMap({ session, elapsedMs, selectedRoad, onSelectRoad, incident, selectedVehicleId, onSelectVehicle, roadsInteractive = true }) {
  const map = session?.map
  const vehicles = session?.vehicles || []
  const width = map?.width || 1000
  const height = map?.height || 560

  if (!map?.nodes?.length || !map?.roads?.length) {
    return (
      <div className="traffic-map traffic-map--empty">
        <div>
          <strong>El mapa llegará desde el backend</strong>
          <p>Inicia una sesión para recibir calles, rutas y posiciones de los vehículos.</p>
        </div>
      </div>
    )
  }

  const nodes = new Map(map.nodes.map((node) => [node.id, node]))
  const originIds = new Set((session.flows || []).map((flow) => flow.originId))
  const destinationIds = new Set((session.flows || []).map((flow) => flow.destinationId))
  const selectedGeometry = pointsForRoad(map.roads.find((road) => road.id === selectedRoad) || {}, nodes)
  const selectedMidpoint = selectedGeometry[Math.floor(selectedGeometry.length / 2)]

  return (
    <div className="traffic-map">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapa de la simulación de tráfico">
        <rect width={width} height={height} fill="#14202a" />

        <g className="traffic-map__areas">
          {(map.areas || []).map((area) => <path key={area.id} className={`city-area city-area--${area.kind}`} d={pathFromPoints(area.points, true)} />)}
        </g>

        <g className="traffic-map__roads">
          {map.roads.map((road) => {
            const points = pointsForRoad(road, nodes)
            if (!points.length) return null
            const isSelected = road.id === selectedRoad
            const isIncident = road.id === incident?.roadId
            return (
              <g key={road.id}>
                <title>{`${road.label || road.id} · ${road.baseTime ?? '—'} min · capacidad ${road.capacity ?? '—'}`}</title>
                <path className={`traffic-road__edge traffic-road__edge--${road.kind || 'secondary'}`} d={pathFromPoints(points, road.closed)} />
                <path className={`traffic-road traffic-road--${road.kind || 'secondary'}${isSelected ? ' traffic-road--selected' : ''}${isIncident ? ' traffic-road--incident' : ''}`} d={pathFromPoints(points, road.closed)} />
                <path
                  className={`traffic-road__hit${roadsInteractive ? '' : ' traffic-road__hit--disabled'}`}
                  d={pathFromPoints(points, road.closed)}
                  tabIndex={roadsInteractive ? 0 : undefined}
                  role={roadsInteractive ? 'button' : undefined}
                  aria-label={`Seleccionar vía ${road.label || road.id}`}
                  onClick={() => roadsInteractive && onSelectRoad(road.id)}
                  onKeyDown={(event) => {
                    if (roadsInteractive && (event.key === 'Enter' || event.key === ' ')) onSelectRoad(road.id)
                  }}
                />
              </g>
            )
          })}
        </g>

        <g className="traffic-map__routes">
          {(session.routes || []).map((route, index) => {
            const badgePoint = route.points?.[Math.max(1, Math.floor((route.points.length - 1) / 2))]
            const label = route.label || `R${index + 1}`
            return (
              <g
                key={route.id}
                className="traffic-route"
                style={{
                  '--route-color': route.color,
                  '--route-dash': index === 0 ? 'none' : (index === 1 ? '18 7' : '7 6'),
                  '--route-offset': index * -4,
                }}
                aria-label={`${label}: ${route.id}`}
              >
                <path className="traffic-route__casing" d={pathFromPoints(route.points)} />
                <path className="traffic-route__line" d={pathFromPoints(route.points)} />
                {badgePoint && (
                  <g className="traffic-route__badge" transform={`translate(${badgePoint[0]} ${badgePoint[1]})`}>
                    <rect x="-19" y="-11" width="38" height="22" rx="5" />
                    <text textAnchor="middle" dominantBaseline="central">{label}</text>
                  </g>
                )}
              </g>
            )
          })}
        </g>

        <g className="traffic-map__markings" aria-hidden="true">
          {map.roads.map((road) => {
            const points = pointsForRoad(road, nodes)
            return points.length
              ? <path key={road.id} className={`traffic-road__lane traffic-road__lane--${road.kind || 'secondary'}`} d={pathFromPoints(points, road.closed)} />
              : null
          })}
        </g>

        <g className="traffic-map__labels" aria-hidden="true">
          {map.roads.map((road) => road.labelAt && (
            <g className="traffic-road-label" key={`${road.id}-label`} transform={`translate(${road.labelAt[0]} ${road.labelAt[1]})`}>
              <rect x="-28" y="-10" width="56" height="20" rx="4" />
              <text textAnchor="middle" dominantBaseline="central">{road.baseTime} min</text>
            </g>
          ))}
          {(map.labels || []).map((label) => <text key={`${label.text}-${label.x}`} className={`city-label city-label--${label.kind}`} x={label.x} y={label.y}>{label.text}</text>)}
          {(map.badges || []).map((badge) => (
            <g key={badge.text} transform={`translate(${badge.x} ${badge.y})`}>
              <rect x="-19" y="-15" width="38" height="30" rx="7" />
              <text textAnchor="middle" dominantBaseline="central">{badge.text}</text>
            </g>
          ))}
        </g>

        <g className="traffic-map__nodes">
          {map.nodes.map((node) => {
            const isOrigin = originIds.has(node.id)
            const isDestination = destinationIds.has(node.id)
            const role = isOrigin && isDestination ? 'Origen · destino' : (isOrigin ? 'Origen' : (isDestination ? 'Destino' : 'Conexión'))
            return (
              <g
                key={node.id}
                className={`traffic-node${isOrigin ? ' traffic-node--origin' : ''}${isDestination ? ' traffic-node--destination' : ''}`}
                transform={`translate(${node.x} ${node.y})`}
              >
                <title>{`${node.id} · ${role}`}</title>
                <circle r="16" />
                <text className="traffic-node__id" textAnchor="middle" dominantBaseline="central">{node.label || node.id.replace('NODO_', '')}</text>
                <text className="traffic-node__role" x="0" y="31" textAnchor="middle">{role}</text>
              </g>
            )
          })}
        </g>

        {selectedMidpoint && incident && (
          <g className="traffic-incident" transform={`translate(${selectedMidpoint[0]} ${selectedMidpoint[1]})`}>
            <circle r="17" />
            <path d="M-6-6 6 6M6-6-6 6" />
          </g>
        )}

        <g className="traffic-map__vehicles">
          {vehicles.map((vehicle, index) => {
            const position = pointAt(vehicle.timeline, elapsedMs)
            if (!position) return null
            return (
              <g
                key={vehicle.id}
                className={`traffic-vehicle-group${vehicle.id === selectedVehicleId ? ' traffic-vehicle-group--selected' : ''}`}
                transform={`translate(${position.x} ${position.y}) rotate(${(position.angle || 0) + 90})`}
                tabIndex="0"
                role="button"
                aria-label={`Inspeccionar ${vehicle.id}`}
                onClick={() => onSelectVehicle(vehicle.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectVehicle(vehicle.id)
                }}
              >
                <title>{`${vehicle.id}${vehicle.routeId ? ` · ${vehicle.routeId}` : ''}`}</title>
                <circle className="traffic-vehicle__halo" r="14" />
                <g className="traffic-vehicle" style={{ '--vehicle-color': vehicle.color || `var(--vehicle-${(index % 4) + 1})` }}>
                  <rect className="traffic-vehicle__wheel" x="-8" y="-7" width="3" height="6" rx="1" />
                  <rect className="traffic-vehicle__wheel" x="5" y="-7" width="3" height="6" rx="1" />
                  <rect className="traffic-vehicle__wheel" x="-8" y="4" width="3" height="6" rx="1" />
                  <rect className="traffic-vehicle__wheel" x="5" y="4" width="3" height="6" rx="1" />
                  <path className="traffic-vehicle__body" d="M-5-11Q0-13 5-11L7-5V8Q7 11 4 12H-4Q-7 11-7 8V-5Z" />
                  <path className="traffic-vehicle__glass" d="M-4-5 4-5 5-1H-5ZM-5 2H5L4 7H-4Z" />
                  <path className="traffic-vehicle__roof" d="M-4-6Q0-8 4-6L5 7Q0 9-5 7Z" />
                  <circle className="traffic-vehicle__light" cx="-3.5" cy="-9.5" r="1.1" />
                  <circle className="traffic-vehicle__light" cx="3.5" cy="-9.5" r="1.1" />
                </g>
              </g>
            )
          })}
        </g>
      </svg>
      <div className="traffic-map__context">
        <strong>{session.strategyLabel || 'Rutas recibidas del backend'}</strong>
        <span>{session.strategyDescription || '6 nodos · 8 vías'}</span>
      </div>
      <div className="traffic-map__source">6 nodos · 8 vías · solo A–F son cruces</div>
      <div className="traffic-map__key" aria-hidden="true">
        <span><i className="key-origin" />Origen</span>
        <span><i className="key-destination" />Destino</span>
        <span><i className="key-route" />Ruta asignada</span>
        <span><i className="key-vehicle" />Auto</span>
      </div>
    </div>
  )
}

function Metric({ label, value, note }) {
  return (
    <div className="lab-metric">
      <span>{label}</span>
      <strong className="num">{value}</strong>
      {note && <small>{note}</small>}
    </div>
  )
}

export default function TrafficLab() {
  const [source, setSource] = useState('demo')
  const [strategy, setStrategy] = useState('coordinated')
  const [vehicleCount, setVehicleCount] = useState(20)
  const [incidentType, setIncidentType] = useState('accident')
  const [demoIncidentId, setDemoIncidentId] = useState(MOCK_INCIDENTS[0].id)
  const [selectedRoad, setSelectedRoad] = useState(MOCK_INCIDENTS[0].roadId)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [session, setSession] = useState(() => createMockSession(20))
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [apiLatencyMs, setApiLatencyMs] = useState(null)
  const [incident, setIncident] = useState(null)
  const clockRef = useRef({ origin: 0, pausedAt: 0 })

  const visibleSession = useMemo(() => {
    const strategyView = source === 'demo' ? session?.strategyViews?.[strategy] : null
    return strategyView ? { ...session, ...strategyView } : session
  }, [session, source, strategy])

  const durationMs = useMemo(() => {
    const ends = (visibleSession?.vehicles || []).map((vehicle) => vehicle.timeline?.at(-1)?.atMs || 0)
    return Math.max(0, ...ends)
  }, [visibleSession])

  useEffect(() => {
    if (status !== 'running') return undefined
    let frame
    const update = () => {
      const next = performance.now() - clockRef.current.origin
      setElapsedMs(next)
      if (durationMs && next >= durationMs) {
        setElapsedMs(durationMs)
        setStatus('complete')
        return
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [status, durationMs])

  async function handleStart() {
    setStatus('connecting')
    setError('')
    setIncident(null)
    setSelectedRoad('')
    setElapsedMs(0)

    try {
      const result = source === 'demo'
        ? { data: createMockSession(vehicleCount), latencyMs: null }
        : await startSimulation({ vehicleCount, strategy: strategy === 'coordinated' ? 'coordinated' : 'individual' })
      if (!result.data?.sessionId || !result.data?.map || !Array.isArray(result.data?.vehicles)) {
        throw new Error('La respuesta no cumple el contrato de simulación.')
      }
      setSession(result.data)
      setSelectedRoad(source === 'demo' ? MOCK_INCIDENTS.find((item) => item.id === demoIncidentId).roadId : '')
      setSelectedVehicleId('')
      setApiLatencyMs(result.latencyMs)
      clockRef.current = { origin: performance.now(), pausedAt: 0 }
      setStatus('running')
    } catch (requestError) {
      setStatus('error')
      setError(requestError.message)
    }
  }

  function handleSourceChange(nextSource) {
    setSource(nextSource)
    setStatus('idle')
    setError('')
    setElapsedMs(0)
    setIncident(null)
    setSelectedRoad(nextSource === 'demo' ? MOCK_INCIDENTS.find((item) => item.id === demoIncidentId).roadId : '')
    setSelectedVehicleId('')
    setApiLatencyMs(null)
    setSession(nextSource === 'demo' ? createMockSession(vehicleCount) : null)
  }

  function handleDemoIncidentChange(nextScenarioId) {
    const scenario = MOCK_INCIDENTS.find((item) => item.id === nextScenarioId)
    setDemoIncidentId(nextScenarioId)
    setSelectedRoad(scenario.roadId)
  }

  function handleStrategyChange(nextStrategy) {
    setStrategy(nextStrategy)
    setSelectedVehicleId('')
  }

  function togglePause() {
    if (status === 'running') {
      clockRef.current.pausedAt = elapsedMs
      setStatus('paused')
    } else if (status === 'paused') {
      clockRef.current.origin = performance.now() - clockRef.current.pausedAt
      setStatus('running')
    }
  }

  async function handleIncident() {
    if (!session?.sessionId || !selectedRoad) return
    const wasRunning = status === 'running'
    const incidentAt = elapsedMs
    setStatus('recalculating')
    setError('')

    try {
      const scenario = MOCK_INCIDENTS.find((item) => item.id === demoIncidentId)
      const incidentPayload = source === 'demo'
        ? { scenarioId: scenario.id, roadId: scenario.roadId, type: scenario.type, simulationTimeMs: incidentAt }
        : { roadId: selectedRoad, type: incidentType, simulationTimeMs: incidentAt }
      if (source === 'demo') await new Promise((resolve) => setTimeout(resolve, 650))
      const result = source === 'demo'
        ? { data: applyMockIncident(session, incidentPayload), latencyMs: null }
        : await reportIncident(session.sessionId, incidentPayload)
      if (!Array.isArray(result.data?.vehicles)) {
        throw new Error('El backend no devolvió las nuevas trayectorias.')
      }
      setSession((current) => ({ ...current, ...result.data }))
      setSelectedVehicleId('')
      setApiLatencyMs(result.latencyMs)
      setIncident({ roadId: selectedRoad, type: incidentType, atMs: incidentAt })
      clockRef.current.origin = performance.now() - incidentAt
      setStatus(wasRunning ? 'running' : 'paused')
    } catch (requestError) {
      setStatus(wasRunning ? 'running' : 'paused')
      setError(requestError.message)
    }
  }

  const metrics = visibleSession?.metrics || {}
  const solver = visibleSession?.solver
  const comparison = session?.comparison
  const selectedVehicle = visibleSession?.vehicles?.find((vehicle) => vehicle.id === selectedVehicleId)
  const progress = durationMs ? Math.min(100, (elapsedMs / durationMs) * 100) : 0
  const congestionDifference = comparison
    ? comparison.individual.maxCongestionPct - comparison.coordinated.maxCongestionPct
    : null
  const activePath = session?.keyDecision
    ? (strategy === 'coordinated' ? session.keyDecision.coordinatedPath : session.keyDecision.traditionalPath)
    : null

  return (
    <div className="traffic-lab">
      <div className="traffic-lab__toolbar" data-ui>
        <div className="traffic-lab__state">
          <span className={`connection-dot connection-dot--${status}`} />
          <div>
            <strong>{STATUS_LABELS[status]}</strong>
            <span>{source === 'demo' ? `${vehicleCount} autos visuales · 3 flujos · ${strategy === 'coordinated' ? '6 variables QUBO' : '3 rutas Dijkstra'}` : API_BASE}</span>
          </div>
        </div>

        <div className="traffic-lab__controls">
          <div className="source-switch" aria-label="Fuente de las rutas">
            <button type="button" className={source === 'demo' ? 'source-switch--active' : ''} onClick={() => handleSourceChange('demo')}>Vista previa</button>
            <button type="button" className={source === 'backend' ? 'source-switch--active' : ''} onClick={() => handleSourceChange('backend')}>Backend</button>
          </div>
          <label>
            <span>Vehículos</span>
            <select value={vehicleCount} onChange={(event) => setVehicleCount(Number(event.target.value))} disabled={status === 'connecting' || status === 'recalculating'}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
          <button className="lab-control lab-control--primary" type="button" onClick={handleStart} disabled={status === 'connecting' || status === 'recalculating'}>
            {session ? 'Reiniciar' : 'Iniciar simulación'}
          </button>
          <button className="lab-control" type="button" onClick={togglePause} disabled={!['running', 'paused'].includes(status)}>
            {status === 'paused' ? 'Continuar' : 'Pausar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="traffic-lab__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={handleStart}>Reintentar</button>
        </div>
      )}

      {source === 'demo' && comparison && (
        <div className="strategy-test" data-ui>
          <div className="strategy-test__intro">
            <strong>Prueba A/B · misma ciudad, mismos autos</strong>
            <span>Cambia únicamente la forma de asignar las rutas.</span>
          </div>
          <div className="strategy-switch" aria-label="Estrategia de asignación">
            <button
              type="button"
              className={strategy === 'traditional' ? 'strategy-switch--active' : ''}
              aria-pressed={strategy === 'traditional'}
              onClick={() => handleStrategyChange('traditional')}
            >
              <span>Tradicional</span>
              <strong>{seconds(comparison.individual.averageTravelSeconds)}</strong>
              <small>Una ruta mínima por flujo</small>
            </button>
            <button
              type="button"
              className={strategy === 'coordinated' ? 'strategy-switch--active' : ''}
              aria-pressed={strategy === 'coordinated'}
              onClick={() => handleStrategyChange('coordinated')}
            >
              <span>Qflow · Qiskit</span>
              <strong>{seconds(comparison.coordinated.averageTravelSeconds)}</strong>
              <small>Una asignación para toda la red</small>
            </button>
          </div>
          {session.keyDecision && (
            <div className="strategy-test__decision">
              <span>Decisión que cambia · {session.keyDecision.flowLabel}</span>
              <strong>{strategy === 'coordinated' ? 'Qflow' : 'Tradicional'} asigna {activePath}</strong>
            </div>
          )}
          <p>Qflow reduce la congestión máxima en <strong>{number(congestionDifference)} puntos</strong>, aunque requiere más tiempo de cálculo.</p>
        </div>
      )}

      <div className="traffic-lab__stage" data-ui>
        <SimulationMap
          session={visibleSession}
          elapsedMs={elapsedMs}
          selectedRoad={selectedRoad}
          onSelectRoad={setSelectedRoad}
          incident={incident}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={setSelectedVehicleId}
          roadsInteractive={source === 'backend'}
        />
        <aside className="incident-panel">
          <div>
            <strong>Provocar un cambio</strong>
            <p>{source === 'demo' ? 'El incidente se aplica a ambas estrategias para compararlas en igualdad de condiciones.' : 'Selecciona una vía y envía el incidente al backend.'}</p>
          </div>
          {source === 'demo' ? (
            <label>
              <span>Escenario</span>
              <select value={demoIncidentId} onChange={(event) => handleDemoIncidentChange(event.target.value)}>
                {MOCK_INCIDENTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
          ) : (
            <label>
              <span>Tipo de incidente</span>
              <select value={incidentType} onChange={(event) => setIncidentType(event.target.value)}>
                {INCIDENTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          )}
          <div className="incident-panel__road">
            <span>Vía seleccionada</span>
            <strong>{source === 'demo' ? MOCK_INCIDENTS.find((item) => item.id === demoIncidentId).roadLabel : (selectedRoad || 'Haz clic en el mapa')}</strong>
          </div>
          <button type="button" onClick={handleIncident} disabled={!session || !selectedRoad || !['running', 'paused'].includes(status)}>
            Aplicar incidente
          </button>
          {incident && <small>Último evento aplicado en {seconds(incident.atMs / 1000)}.</small>}
          {selectedVehicle ? (
            <div className="vehicle-inspector">
              <span>{selectedVehicle.id} · {selectedVehicle.rerouted ? 'Redirigido' : 'Ruta mantenida'}</span>
              <strong>{selectedVehicle.flowLabel}</strong>
              <p>{selectedVehicle.explanation}</p>
              <small>Ruta {selectedVehicle.routeId} · ETA {seconds(selectedVehicle.estimatedTravelSeconds)}</small>
            </div>
          ) : <small>Selecciona un auto en el mapa para explicar su asignación.</small>}
        </aside>
      </div>

      <div className="traffic-lab__progress" aria-label={`Progreso ${Math.round(progress)}%`}>
        <i style={{ width: `${progress}%` }} />
      </div>

      {solver && comparison && (
        <div className="traffic-lab__evidence" data-ui>
          <div className="solver-preview">
            <div>
              <strong>{strategy === 'coordinated' ? 'Flujo Qiskit simulado' : 'Flujo tradicional simulado'}</strong>
              <span>{solver.mode}{strategy === 'coordinated' ? ` · ${number(solver.problem.binaryVariables)} variables · ${number(solver.problem.constraints)} restricciones` : ' · 3 rutas independientes'}</span>
            </div>
            <ol>
              {solver.stages.map((stage) => <li key={stage.id}><span>{stage.label}</span><strong className="num">{number(stage.durationMs, 1)} ms</strong></li>)}
            </ol>
          </div>
          <div className="strategy-comparison">
            <div className="strategy-comparison__heading">
              <strong>Individual vs. coordinada</strong>
              <span>Valores demostrativos</span>
            </div>
            <div className="strategy-comparison__table">
              <span /> <span className={strategy === 'traditional' ? 'is-active' : ''}>Tradicional</span><span className={strategy === 'coordinated' ? 'is-active' : ''}>Qflow</span>
              <strong>Cálculo</strong><span className="num">{number(comparison.individual.computeMs, 1)} ms</span><span className="num">{number(comparison.coordinated.computeMs, 1)} ms</span>
              <strong>Viaje promedio</strong><span className="num">{seconds(comparison.individual.averageTravelSeconds)}</span><span className="num">{seconds(comparison.coordinated.averageTravelSeconds)}</span>
              <strong>Congestión máxima</strong><span className="num">{number(comparison.individual.maxCongestionPct)}%</span><span className="num">{number(comparison.coordinated.maxCongestionPct)}%</span>
              <strong>Último en llegar</strong><span className="num">{seconds(comparison.individual.lastArrivalSeconds)}</span><span className="num">{seconds(comparison.coordinated.lastArrivalSeconds)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="traffic-lab__metrics" data-ui>
        <Metric label="Tiempo simulado" value={seconds(elapsedMs / 1000)} note="Reloj de la sesión" />
        <Metric label="Cálculo del backend" value={Number.isFinite(Number(metrics.computeMs)) ? `${number(metrics.computeMs, 1)} ms` : '—'} note={source === 'demo' ? (strategy === 'coordinated' ? 'Tiempo mock de Qiskit' : 'Tiempo mock de Dijkstra') : 'Informado por el servidor'} />
        <Metric label="Latencia API" value={apiLatencyMs === null ? '—' : `${number(apiLatencyMs, 1)} ms`} note={source === 'demo' ? 'Sin consulta en modo demo' : 'Ida, proceso y vuelta'} />
        <Metric label="Vehículos redirigidos" value={number(metrics.reroutedVehicles)} note={`de ${visibleSession?.vehicles?.length || vehicleCount}`} />
        <Metric label="Viaje promedio" value={seconds(metrics.averageTravelSeconds)} note={source === 'demo' ? 'Valor ilustrativo' : 'Dato del backend'} />
        <Metric label="Congestión máxima" value={Number.isFinite(Number(metrics.maxCongestionPct)) ? `${number(metrics.maxCongestionPct, 1)}%` : '—'} note={source === 'demo' ? 'Valor ilustrativo' : 'Dato del backend'} />
      </div>
    </div>
  )
}
