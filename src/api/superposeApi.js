import { adaptSuperposeResponse } from '../data/superposeAdapter.js'

const API_BASE = (import.meta.env.VITE_SIMULATION_API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function request(path, options = {}) {
  const startedAt = performance.now()
  let response

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch (error) {
    throw new Error(`No se pudo conectar con ${API_BASE}. ${error.message}`)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = Array.isArray(payload?.detail)
      ? payload.detail.map((item) => item.msg).join('. ')
      : payload?.detail
    throw new Error(detail || payload?.message || payload?.error || `El servidor respondió ${response.status}`)
  }
  return { data: payload, latencyMs: performance.now() - startedAt }
}

async function optimize() {
  return request('/api/v1/route/optimize', {
    method: 'POST',
    body: JSON.stringify({ origin: 'NODO_A', destination: 'NODO_F', vehicles: 1 }),
  })
}

export async function startSimulation({ vehicleCount }) {
  const startedAt = performance.now()
  const topologyResult = await request('/api/v1/events/reset', { method: 'POST' })
  const optimizationResult = await optimize()
  return {
    data: adaptSuperposeResponse({
      topology: topologyResult.data,
      optimization: optimizationResult.data,
      visualVehicleCount: vehicleCount,
      source: 'superpose-api',
    }),
    latencyMs: performance.now() - startedAt,
  }
}

export async function reportIncident(previousSession, { roadId, type }, visualVehicleCount) {
  const [source, target] = roadId.split('--')
  if (!source || !target) throw new Error('La vía seleccionada no contiene dos nodos válidos.')

  const startedAt = performance.now()
  const topologyResult = await request('/api/v1/events/report', {
    method: 'POST',
    body: JSON.stringify({ source, target, event_type: type }),
  })
  const optimizationResult = await optimize()
  return {
    data: adaptSuperposeResponse({
      topology: topologyResult.data,
      optimization: optimizationResult.data,
      visualVehicleCount,
      previousSession,
      source: 'superpose-api',
    }),
    latencyMs: performance.now() - startedAt,
  }
}

export { API_BASE }
