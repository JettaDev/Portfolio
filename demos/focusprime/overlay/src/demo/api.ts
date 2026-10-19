import initSqlJs, { type Database } from "sql.js"
import urlWasm from "sql.js/dist/sql-wasm-browser.wasm?url"
import app from "../worker/index"
import { crearD1 } from "./d1"
import { sembrar } from "./semilla"

// API de la demo: el mismo Worker de producción (Hono, Better Auth y Drizzle) ejecutándose en el
// navegador, con una D1 hecha con SQLite en WebAssembly. `fetch` a `/api/*` no sale a la red: lo
// atiende este Worker. La sesión viaja como token Bearer (el navegador no deja leer ni poner
// cookies en peticiones y respuestas creadas por la página) y la base de datos se guarda en
// localStorage, así lo que hace el visitante sigue ahí al volver.

const VERSION = "1"
const CLAVE_BD = "focusprime-demo:bd"
const CLAVE_TOKEN = "focusprime-demo:token"
const CLAVE_VERSION = "focusprime-demo:version"
const CLAVE_FECHA = "focusprime-demo:sembrada"
/** Pasados unos días los datos de ejemplo se quedan viejos: se vuelven a sembrar. */
const CADUCIDAD = 4 * 24 * 60 * 60 * 1000

const migraciones = import.meta.glob<string>("../../drizzle/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
})

const leer = (clave: string) => {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}
const guardar = (clave: string, valor: string | null) => {
  try {
    if (valor === null) localStorage.removeItem(clave)
    else localStorage.setItem(clave, valor)
  } catch {
    // Modo privado estricto o cuota llena: la demo sigue, solo que sin recordar.
  }
}

const aBase64 = (bytes: Uint8Array) => {
  let texto = ""
  for (let i = 0; i < bytes.length; i += 0x8000)
    texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(texto)
}
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))

function crearBaseNueva(SQL: Awaited<ReturnType<typeof initSqlJs>>): Database {
  const db = new SQL.Database()
  db.run("pragma foreign_keys = on")
  for (const ruta of Object.keys(migraciones).sort()) db.exec(migraciones[ruta])
  return db
}

export async function instalarApiDemo() {
  const SQL = await initSqlJs({ locateFile: () => urlWasm })

  const vigente =
    leer(CLAVE_VERSION) === VERSION && Date.now() - Number(leer(CLAVE_FECHA) ?? 0) < CADUCIDAD
  let db: Database | null = null
  const guardada = vigente ? leer(CLAVE_BD) : null
  if (guardada) {
    try {
      db = new SQL.Database(deBase64(guardada))
      db.run("pragma foreign_keys = on")
    } catch {
      db = null
    }
  }
  const sembrar_ = !db
  if (!db) {
    db = crearBaseNueva(SQL)
    guardar(CLAVE_TOKEN, null)
  }
  const base = db

  const env = {
    DB: crearD1(base),
    ENTORNO: "desarrollo",
    BETTER_AUTH_URL: location.origin,
    BETTER_AUTH_SECRET: "demo-focusprime-portfolio-0123456789abcdef",
    LIMITE_API: { limit: async () => ({ success: true }) },
  } as unknown as Env

  let token = leer(CLAVE_TOKEN)
  let sembrando = false

  let guardado: ReturnType<typeof setTimeout> | undefined
  const programarGuardado = () => {
    clearTimeout(guardado)
    guardado = setTimeout(() => guardar(CLAVE_BD, aBase64(base.export())), 400)
  }

  async function atender(peticion: Request): Promise<Response> {
    const url = new URL(peticion.url)
    const cabeceras = new Headers(peticion.headers)
    if (token) cabeceras.set("authorization", `Bearer ${token}`)
    // La IP con la que Better Auth cuenta los intentos de acceso, como la que pone Cloudflare.
    cabeceras.set("cf-connecting-ip", "127.0.0.1")
    const lectura = peticion.method === "GET" || peticion.method === "HEAD"
    const interna = new Request(url, {
      method: peticion.method,
      headers: cabeceras,
      body: lectura ? undefined : await peticion.arrayBuffer(),
    })
    const pendientes: Promise<unknown>[] = []
    const respuesta = await app.fetch(interna, env, {
      waitUntil: (p: Promise<unknown>) => void pendientes.push(p),
      passThroughOnException: () => undefined,
      props: {},
    } as unknown as ExecutionContext)
    await Promise.allSettled(pendientes)

    const nuevo = respuesta.headers.get("set-auth-token")
    if (nuevo) token = nuevo
    const salida =
      url.pathname === "/api/auth/sign-out" ||
      (url.pathname === "/api/v1/cuenta" && peticion.method === "DELETE" && respuesta.ok)
    if (salida) token = null
    if (nuevo || salida) guardar(CLAVE_TOKEN, token)
    if (!lectura) programarGuardado()

    if (url.pathname === "/api/auth/email-otp/send-verification-otp" && respuesta.ok && !sembrando)
      avisarCodigo((globalThis as { __codigoDemo?: string }).__codigoDemo)
    return respuesta
  }

  // Una petición detrás de otra: SQLite es síncrono y Better Auth, sin AsyncLocalStorage en el
  // navegador, no distingue peticiones que se solapan.
  let cola: Promise<unknown> = Promise.resolve()
  const enCola = (peticion: Request) => {
    const turno = cola.then(() => atender(peticion))
    cola = turno.catch(() => undefined)
    return turno
  }

  const fetchOriginal = globalThis.fetch.bind(globalThis)
  globalThis.fetch = (entrada: RequestInfo | URL, init?: RequestInit) => {
    const peticion = new Request(entrada, init)
    const url = new URL(peticion.url)
    if (url.origin !== location.origin || !url.pathname.startsWith("/api/"))
      return fetchOriginal(entrada, init)
    return enCola(peticion)
  }

  if (sembrar_) {
    sembrando = true
    await sembrar({
      pedir: (ruta, init) => fetch(ruta, init),
      sql: (consulta, params = []) => base.run(consulta, params),
      leerUno: (consulta, params = []) => base.exec(consulta, params)[0]?.values[0]?.[0] ?? null,
      codigo: () => (globalThis as { __codigoDemo?: string }).__codigoDemo ?? "",
    })
    sembrando = false
    guardar(CLAVE_BD, aBase64(base.export()))
    guardar(CLAVE_VERSION, VERSION)
    guardar(CLAVE_FECHA, String(Date.now()))
  }
}

/** En la demo no hay correo: el código de acceso aparece en un aviso. */
function avisarCodigo(codigo: string | undefined) {
  if (!codigo || document.readyState === "loading") return
  document.getElementById("codigo-demo")?.remove()
  const aviso = document.createElement("div")
  aviso.id = "codigo-demo"
  aviso.setAttribute("role", "status")
  aviso.textContent = `En la demo no se envían correos: tu código es ${codigo}`
  Object.assign(aviso.style, {
    position: "fixed",
    left: "50%",
    top: "16px",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    padding: "10px 16px",
    borderRadius: "12px",
    background: "#111",
    color: "#fff",
    font: "600 15px/1.3 system-ui, sans-serif",
    letterSpacing: "0.02em",
    boxShadow: "0 6px 24px rgb(0 0 0 / 0.25)",
  })
  document.body.append(aviso)
  setTimeout(() => aviso.remove(), 60_000)
}
