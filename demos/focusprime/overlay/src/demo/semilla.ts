import type { SqlValue } from "sql.js"
import { diaSemana, hoyEn, sumarDias } from "../shared/domain/fechas"
import { hitosAlcanzados } from "../shared/domain/progreso"
import type { DiaSemana, EstadoRegistro, FechaLocal } from "../shared/domain/tipos"

// Datos de ejemplo de la demo: una cuenta con diez semanas de hábitos, un par de tareas y un
// objetivo. Lo que se puede crear por la API se crea por la API (con sus validaciones); el
// historial se escribe directamente en la base de datos, porque son cientos de registros.

type Herramientas = {
  pedir: (ruta: string, init?: RequestInit) => Promise<Response>
  sql: (consulta: string, params?: SqlValue[]) => unknown
  leerUno: (consulta: string, params?: SqlValue[]) => SqlValue
  codigo: () => string
}

const EMAIL = "demo@focusprime.app"
const SEMANAS = 10

type Habito = {
  titulo: string
  dias: DiaSemana[]
  icono: string
  color: string
  opcional?: boolean
  /** Probabilidad de completarlo un día que toca. */
  constancia: number
  /** Si se hace a medias, a veces. */
  parcial?: boolean
  notas?: Record<number, string>
}

const TODOS: DiaSemana[] = [1, 2, 3, 4, 5, 6, 7]

const HABITOS: Habito[] = [
  {
    titulo: "Entreno de fuerza",
    dias: [1, 3, 5],
    icono: "pesa",
    color: "verde",
    constancia: 0.88,
    notas: { 4: "Sentadilla 5×5 con 80 kg", 11: "Nuevo récord en peso muerto" },
  },
  {
    titulo: "Correr",
    dias: [2, 6],
    icono: "correr",
    color: "azul",
    constancia: 0.8,
    parcial: true,
    notas: { 6: "5 de 8 km, gemelo cargado" },
  },
  { titulo: "Beber 2 litros de agua", dias: TODOS, icono: "gota", color: "turquesa", constancia: 0.9 },
  { titulo: "Programar", dias: [1, 2, 3, 4, 5], icono: "codigo", color: "indigo", constancia: 0.86 },
  {
    titulo: "Leer antes de dormir",
    dias: TODOS,
    icono: "libro",
    color: "rosa",
    constancia: 0.72,
    parcial: true,
  },
  {
    titulo: "Estirar 10 minutos",
    dias: TODOS,
    icono: "estirar",
    color: "ambar",
    opcional: true,
    constancia: 0.55,
  },
]

/** Lo que ya está hecho hoy, para que la pantalla Hoy no salga ni vacía ni terminada. */
const HECHO_HOY = new Set(["Beber 2 litros de agua", "Programar"])

/** Pseudoaleatorio estable: la misma demo cada vez. */
function azar(semilla: number) {
  let x = semilla * 2654435761
  x ^= x >>> 15
  x = Math.imul(x, 2246822519)
  x ^= x >>> 13
  return ((x >>> 0) % 10_000) / 10_000
}

export async function sembrar({ pedir, sql, leerUno, codigo }: Herramientas) {
  const json = async (ruta: string, metodo: string, cuerpo?: unknown) => {
    const r = await pedir(ruta, {
      method: metodo,
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
    const datos = (await r.json()) as { ok?: boolean; datos?: unknown; data?: unknown }
    if (!r.ok) throw new Error(`Demo: ${metodo} ${ruta} → ${String(r.status)}`)
    return datos
  }

  await json("/api/auth/email-otp/send-verification-otp", "POST", { email: EMAIL, type: "sign-in" })
  await json("/api/auth/sign-in/email-otp", "POST", { email: EMAIL, otp: codigo() })

  const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid"
  await json("/api/v1/preferencias", "PUT", { zona, inicioSemana: "lunes", tema: "sistema" })
  await json("/api/v1/onboarding", "POST", { plantillas: [] })

  const hoy = hoyEn(zona)
  const inicio = sumarDias(hoy, -(SEMANAS * 7 - 1))
  const usuarioId = String(leerUno("select id from user where email = ?", [EMAIL]))

  const ids: string[] = []
  for (const h of HABITOS) {
    await json("/api/v1/actividades", "POST", {
      tipo: "habito",
      titulo: h.titulo,
      opcional: h.opcional ?? false,
      color: h.color,
      icono: h.icono,
      programacion: { tipo: "semanal", inicio, cadaSemanas: 1, dias: h.dias, fin: null },
    })
    ids.push(String(leerUno("select id from actividades where titulo = ?", [h.titulo])))
  }

  const tareas = [
    { titulo: "Pedir cita para la revisión médica", fecha: hoy, icono: "corazon", color: "coral" },
    { titulo: "Renovar la licencia federativa", fecha: sumarDias(hoy, -2), icono: "check", color: "verde" },
    { titulo: "Preparar la mochila del partido", fecha: sumarDias(hoy, 1), icono: "balon", color: "azul" },
  ]
  for (const t of tareas)
    await json("/api/v1/actividades", "POST", {
      tipo: "tarea",
      titulo: t.titulo,
      color: t.color,
      icono: t.icono,
      programacion: { tipo: "unica", fecha: t.fecha },
    })

  // Historial: los días que tocaba cada hábito, del primero a hoy.
  const ahora = Date.now()
  const anotar = (actividadId: string, fecha: FechaLocal, estado: EstadoRegistro, fraccion: number | null, notas: string | null) =>
    sql(
      `insert into registros (actividad_id, fecha, usuario_id, estado, fraccion, notas, registrado_en, actualizado_en)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
      [actividadId, fecha, usuarioId, estado, fraccion, notas, ahora, ahora],
    )

  HABITOS.forEach((h, i) => {
    for (let d = 0; d < SEMANAS * 7; d++) {
      const fecha = sumarDias(inicio, d)
      if (!h.dias.includes(diaSemana(fecha))) continue
      const nota = h.notas?.[SEMANAS * 7 - 1 - d] ?? null
      if (fecha === hoy) {
        if (HECHO_HOY.has(h.titulo)) anotar(ids[i], fecha, "completado", null, null)
        continue
      }
      const r = azar(i * 1000 + d + 7)
      // Las últimas semanas, con más constancia: rachas en marcha que se ven en Hoy.
      const constancia = d >= SEMANAS * 7 - 21 ? Math.min(0.97, h.constancia + 0.12) : h.constancia
      if (r < constancia) anotar(ids[i], fecha, "completado", null, nota)
      else if (h.parcial && r < constancia + 0.12) anotar(ids[i], fecha, "parcial", 0.5, nota)
      else if (r < constancia + 0.18) anotar(ids[i], fecha, "omitido", null, null)
      else if (r > 0.97) anotar(ids[i], fecha, "descanso", null, null)
      // El resto queda sin anotar, como pasa de verdad.
    }
  })
  const renovar = String(leerUno("select id from actividades where titulo = ?", [tareas[1].titulo]))
  anotar(renovar, tareas[1].fecha, "completado", null, null)

  // Un objetivo que lleva semanas en marcha.
  await json("/api/v1/objetivos", "POST", {
    titulo: "50 entrenos antes de fin de año",
    meta: 50,
    unidad: "entrenos",
    hasta: `${hoy.slice(0, 4)}-12-31`,
    actividades: ids.slice(0, 2),
  })
  sql("update objetivos set desde = ? where usuario_id = ?", [inicio, usuarioId])

  // Los niveles e hitos ya ganados no se celebran al abrir la demo, solo los que lleguen.
  await json("/api/v1/progreso/celebraciones/vistas", "POST", {
    nivel: 100_000,
    hitos: hitosAlcanzados(100_000).map((h) => h.id),
  })
}
