# Contrato del simulador Qflow

La interfaz no calcula rutas. Solo anima trayectorias predefinidas en el modo demo o presenta las trayectorias y métricas que devuelve el backend en el modo conectado.

## Arquitectura prevista

El backend se implementará con Qiskit y será responsable de formular el problema de asignación conjunta, ejecutar el solver cuántico o híbrido y convertir la solución en rutas consumibles por la interfaz. El navegador se limita a enviar el escenario, reproducir la respuesta y medir por separado la latencia de red.

La idea central del sistema es optimizar la asignación de toda la red, no calcular de forma aislada la ruta más corta de cada conductor.

## Compatibilidad con `superpose-api`

El backend elegido encaja con el concepto de Qflow: compara enrutamiento egoísta con asignación conjunta QAOA, trabaja con incidentes y devuelve telemetría cuántica. Sin embargo, su contrato actual no coincide directamente con el contrato visual descrito más abajo. La integración debe incorporar un adaptador en el frontend.

Base local del backend:

```env
VITE_SIMULATION_API_URL=http://localhost:8000
```

Correspondencia prevista:

| Qflow | `superpose-api` | Adaptación necesaria |
|---|---|---|
| Crear escenario | `GET /api/v1/topology` + `POST /api/v1/route/optimize` | Convertir nodos y aristas en el mapa SVG. |
| Rutas coordinadas | `flows[].qaoa_route` | Sustituir IDs de nodo por coordenadas y construir polilíneas. |
| Comparación individual | `flows[].selfish_route` y `comparison` | Mostrar la alternativa clásica y sus métricas. |
| Incidente | `POST /api/v1/events/report` | Reportar el evento y volver a ejecutar `/route/optimize`. |
| Métricas del solver | `quantum_telemetry` y `total_time_ms` | Separar tiempo QAOA de latencia HTTP. |
| Autos animados | `flows[].vehicles` | Expandir visualmente cada flujo sobre su ruta; el navegador solo anima. |

La vista previa actual replica la topología exacta de `app/config.py`: `NODO_A` a `NODO_F` y sus 8 aristas configuradas, con sus tiempos base y capacidades. Como el backend no entrega coordenadas geográficas, el frontend proyecta esas conexiones como corredores urbanos ortogonales y dos conectores diagonales. No inventa calles, nodos ni rotondas; una ruta solo puede recorrer conexiones presentes en esa configuración. En el mapa, únicamente los nodos circulares A–F representan cruces habilitados.

La diferencia conceptual importante es que `superpose-api` optimiza exactamente **3 flujos con 2 rutas candidatas cada uno**, lo que produce un QUBO de 6 variables/qubits. Los 20 autos de la demostración no deben presentarse como 20 decisiones cuánticas independientes: son la representación visual de vehículos agrupados dentro de esos flujos. Esta escala es adecuada para la primera demo y mantiene visible el aporte cuántico sin inflar el problema.

## Prueba A/B de la vista previa

La demo contiene dos respuestas precalculadas para el mismo escenario. “Tradicional” representa las rutas egoístas obtenidas por Dijkstra para cada flujo; “Qflow · Qiskit” representa la asignación conjunta. El selector no ejecuta ninguno de los algoritmos en el navegador: intercambia rutas, trayectorias, etapas y métricas mock con el mismo contrato visual.

El caso inicial destaca una decisión concreta. Para el flujo A → E, la estrategia tradicional usa A → C → E, mientras Qflow usa A → B → E para no concentrar ambos flujos de A sobre A → C. Los números de cálculo, viaje y congestión son ilustrativos y deben reemplazarse por `selfish_route`, `qaoa_route`, `comparison` y `quantum_telemetry` cuando se conecte `superpose-api`.

El solver actual usa QAOA sobre `qiskit-aer` y puede recurrir a `NumPyMinimumEigensolver`. Para afirmar que la ejecución ocurrió en hardware de IBM será necesario añadir una configuración de IBM Quantum Runtime y devolver el proveedor real en la telemetría. Mientras tanto, la interfaz debe rotular la ejecución como simulada.

Los endpoints que aparecen a continuación documentan el contrato visual original. Se conservarán como modelo interno de la interfaz hasta que el adaptador traduzca las respuestas de `superpose-api`.

Para el contrato visual original descrito debajo, la URL base se configuraba así:

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
  },
  "solver": {
    "framework": "Qiskit",
    "execution": "quantum_simulator",
    "mode": "QUBO híbrido",
    "problem": {
      "binaryVariables": 6,
      "constraints": 3,
      "candidateRoutes": 6
    },
    "stages": [
      { "id": "encode", "label": "Formular QUBO", "durationMs": 8.4 },
      { "id": "solve", "label": "Resolver", "durationMs": 29.1 },
      { "id": "decode", "label": "Decodificar", "durationMs": 5.2 }
    ]
  }
}
```

Las coordenadas de nodos, calles, rutas y trayectorias usan el mismo sistema definido por `map.width` y `map.height`. Los tiempos de cada `timeline` son absolutos dentro de la sesión y deben llegar ordenados. `roads.geometry` permite representar una vía curva; si se omite, la interfaz dibuja una línea entre `from` y `to`. `routes` es opcional y sirve para mostrar los corredores asignados detrás de los vehículos. `solver` permite explicar la ejecución de Qiskit sin mezclar sus etapas con la latencia HTTP.

Cada vehículo puede incluir `flowLabel`, `routeId`, `rerouted`, `estimatedTravelSeconds` y `explanation`. La interfaz los usa para explicar por qué recibió esa asignación. También puede incluirse `comparison.individual` y `comparison.coordinated`, con `computeMs`, `averageTravelSeconds`, `maxCongestionPct` y `lastArrivalSeconds`, para contrastar ambas estrategias. Para solicitar el cálculo clásico se enviará `strategy: "individual"`; para la asignación Qiskit, `strategy: "coordinated"`.

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
