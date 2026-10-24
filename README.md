# Qflow

Primera interfaz conceptual para un sistema de movilidad que coordina rutas mediante optimización cuántica. Qflow no busca la mejor ruta para cada conductor de forma aislada: busca la mejor asignación conjunta para toda la red.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Vite mostrará la URL local, normalmente `http://localhost:5173`.

## Conectar el simulador

El laboratorio incluye una vista previa jugable con respuestas mock y un modo conectado. Ninguno calcula rutas en el navegador. Para usar el backend, copia `.env.example` como `.env.local`, configura `VITE_SIMULATION_API_URL` y sigue el contrato descrito en [`BACKEND_API.md`](./BACKEND_API.md).

El backend previsto usará Qiskit para formular y ejecutar el proceso de optimización cuántica o híbrida. Durante esta etapa, la demo local reproduce respuestas predefinidas con la misma forma que tendrá la API, sin presentarlas como resultados reales del algoritmo.

La vista previa actual incluye tres flujos origen-destino, tres incidentes con respuestas diferentes y una prueba A/B interactiva. El modo tradicional simula Dijkstra con NetworkX; el modo Qflow simula la asignación conjunta QUBO con Qiskit. El mapa conserva los seis nodos y las ocho vías del backend y solo cambia su proyección visual para que se lea como una red urbana.

## Producción

```bash
npm run build
npm run preview
```

La carpeta generada es `dist/` y el proyecto puede importarse directamente en Vercel.
