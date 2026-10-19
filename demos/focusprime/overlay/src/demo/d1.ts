import type { Database, SqlValue } from "sql.js"

// D1 sobre SQLite en WebAssembly (sql.js): lo justo de la interfaz que usan Drizzle y las rutas
// del Worker (prepare/bind/all/raw/first/run, batch y exec), con la misma forma de resultados.

type Valor = SqlValue | boolean | undefined

const aSql = (v: Valor): SqlValue => (v === undefined ? null : typeof v === "boolean" ? Number(v) : v)

// `getRowsModified` arrastra el valor de la última escritura también en un select: mejor la diferencia.
const totalCambios = (db: Database) => Number(db.exec("select total_changes()")[0]?.values[0]?.[0] ?? 0)

function meta(db: Database, changes = 0) {
  const fila = db.exec("select last_insert_rowid()")[0]?.values[0]?.[0]
  return {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: changes,
    changes,
    last_row_id: Number(fila ?? 0),
    changed_db: changes > 0,
  }
}

class Sentencia {
  constructor(
    private readonly db: Database,
    private readonly sql: string,
    private readonly params: SqlValue[] = [],
  ) {}

  bind(...params: Valor[]) {
    return new Sentencia(this.db, this.sql, params.map(aSql))
  }

  /** Filas como arrays, con los nombres de columna. */
  ejecutar(): { columnas: string[]; filas: SqlValue[][]; cambios: number } {
    const antes = totalCambios(this.db)
    const stmt = this.db.prepare(this.sql)
    try {
      stmt.bind(this.params)
      const filas: SqlValue[][] = []
      while (stmt.step()) filas.push(stmt.get())
      const columnas = stmt.getColumnNames()
      return { columnas, filas, cambios: totalCambios(this.db) - antes }
    } finally {
      stmt.free()
    }
  }

  allSync() {
    const { columnas, filas, cambios } = this.ejecutar()
    const results = filas.map((f) => Object.fromEntries(columnas.map((c, i) => [c, f[i]])))
    return { success: true, results, meta: meta(this.db, cambios) }
  }

  async all() {
    return this.allSync()
  }

  async raw(opciones?: { columnNames?: boolean }) {
    const { columnas, filas } = this.ejecutar()
    return opciones?.columnNames ? [columnas, ...filas] : filas
  }

  async first(columna?: string) {
    const fila = this.allSync().results[0]
    if (!fila) return null
    return columna ? (fila[columna] ?? null) : fila
  }

  async run() {
    const { cambios } = this.ejecutar()
    return { success: true, results: [], meta: meta(this.db, cambios) }
  }
}

export function crearD1(db: Database) {
  return {
    prepare: (sql: string) => new Sentencia(db, sql),
    // Como en D1, el lote es atómico: si falla una sentencia no se aplica ninguna.
    async batch(sentencias: Sentencia[]) {
      db.run("savepoint lote")
      try {
        const resultados = sentencias.map((s) => s.allSync())
        db.run("release lote")
        return resultados
      } catch (error) {
        db.run("rollback to lote")
        db.run("release lote")
        throw error
      }
    },
    async exec(sql: string) {
      db.exec(sql)
      return { count: 0, duration: 0 }
    },
    withSession: () => crearD1(db),
    dump: async () => db.export().buffer,
  }
}
