# Contrato del simulador Qflow

La interfaz no calcula rutas. Solo anima trayectorias predefinidas en el modo demo o presenta las trayectorias y métricas que devuelve el backend en el modo conectado.

## Arquitectura prevista

El backend se implementará con Qiskit y será responsable de formular el problema de asignación conjunta, ejecutar el solver cuántico o híbrido y convertir la solución en rutas consumibles por la interfaz. El navegador se limita a enviar el escenario, reproducir la respuesta y medir por separado la latencia de red.

La idea central del sistema es optimizar la asignación de toda la red, no calcular de forma aislada la ruta más corta de cada conductor.

Configura la URL base en `.env.local`:

```env
VITE_SIMULATION_API_URL=http://localhost:8080/api
```

Si no se configura, el cliente usa `/api` en el mismo dominio.

## Crear una simulación

`POST /v1/simulations`

```json
{
  "vehicleCount": 20,
  "strategy": "coordinated"
}
```

Respuesta:

```json
{
  "sessionId": "sim_01",
  "revision": 1,
  "map": {
    "width": 1000,
    "height": 560,
    "nodes": [
      { "id": "a", "x": 80, "y": 280, "kind": "origin" },
      { "id": "b", "x": 920, "y": 280, "kind": "destination" }
    ],
    "roads": [
      {
        "id": "road-1",
        "from": "a",
        "to": "b",
        "label": "Av. Central",
        "kind": "primary",
        "geometry": [[80, 280], [500, 190], [920, 280]]
      }
    ]
  },
  "routes": [
    {
      "id": "route-1",
      "color": "#73d5ff",
      "points": [[80, 280], [500, 190], [920, 280]]
    }
  ],
  "vehicles": [
    {
      "id": "car-01",
      "color": "#438d9b",
      "timeline": [
        { "x": 80, "y": 280, "atMs": 0 },
        { "x": 920, "y": 280, "atMs": 18000 }
      ]
    }
  ],
  "metrics": {
    "computeMs": 42.7,
    "reroutedVehicles": 0,
    "averageTravelSeconds": 19.4,
    "maxCongestionPct": 61.2
  }
}
```

Las coordenadas de nodos, calles, rutas y trayectorias usan el mismo sistema definido por `map.width` y `map.height`. Los tiempos de cada `timeline` son absolutos dentro de la sesión y deben llegar ordenados. `roads.geometry` permite representar una vía curva; si se omite, la interfaz dibuja una línea entre `from` y `to`. `routes` es opcional y sirve para mostrar los corredores asignados detrás de los vehículos.

## Reportar un incidente

`POST /v1/simulations/{sessionId}/incidents`

```json
{
  "roadId": "road-1",
  "type": "accident",
  "simulationTimeMs": 7400
}
```

Tipos admitidos por la interfaz: `accident`, `closure`, `roadworks` y `demand_spike`.

La respuesta usa el mismo formato de la creación. Puede omitir `map` cuando no cambie, pero debe incluir `vehicles`, `metrics`, `revision` y `sessionId`. Las nuevas trayectorias continúan usando tiempos absolutos de la sesión.

`metrics.computeMs` debe medir únicamente el cálculo del backend. La interfaz mide por separado la duración completa de la solicitud y la muestra como “Latencia API”.

## Errores

Los errores deben usar un código HTTP apropiado y pueden devolver:

```json
{ "message": "La vía ya está cerrada" }
```

Si frontend y backend están en dominios distintos, el backend debe permitir CORS para el origen de la página.
