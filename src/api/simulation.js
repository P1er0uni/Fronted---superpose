export { API_BASE, reportIncident, startSimulation } from './superposeApi.js'

/* Legacy visual-session contract retained for repository history.
const API_BASE = (import.meta.env.VITE_SIMULATION_API_URL || '/api').replace(/\/$/, '')

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

  const latencyMs = performance.now() - startedAt
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.message || payload?.error || `El servidor respondió ${response.status}`
    throw new Error(message)
  }

  return { data: payload, latencyMs }
}

export function startSimulation({ vehicleCount, strategy }) {
  return request('/v1/simulations', {
    method: 'POST',
    body: JSON.stringify({ vehicleCount, strategy }),
  })
}

export function reportIncident(sessionId, { roadId, type, simulationTimeMs }) {
  return request(`/v1/simulations/${encodeURIComponent(sessionId)}/incidents`, {
    method: 'POST',
    body: JSON.stringify({ roadId, type, simulationTimeMs: Math.round(simulationTimeMs) }),
  })
}

export { API_BASE }
*/
