import { instalarApiDemo } from "./api"

// Arranque de la demo: primero la API en el navegador (y, la primera vez, los datos de ejemplo),
// después la app tal cual.
await instalarApiDemo()
await import("../app/main")
