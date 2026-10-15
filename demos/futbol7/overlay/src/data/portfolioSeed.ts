import type { DataAdapter } from './adapter';
import { simControls } from './mockAdapter';
import { emptyDraft } from '../domain/formations';
import { todayIso } from '../domain/format';
import type { LineupDraft, Player, PositionPref, ResultInput, SlotId } from '../domain/types';
import { TEAM_ID } from './seed';

/**
 * Datos de ejemplo de la demo pública: plantilla, partidos jugados y el próximo partido.
 * Se crean con las mismas operaciones que usa la app, así que siempre cumplen sus reglas.
 * Las fechas se calculan desde hoy para que la demo no envejezca.
 */
const SEEDED_KEY = 'f7:portfolio:sembrado';

const SQUAD: [string, number, PositionPref[]][] = [
  ['Dani Ortega', 1, ['POR']],
  ['Rubén Salas', 4, ['DEF']],
  ['Marcos Vidal', 5, ['DEF', 'MED']],
  ['Hugo Pardo', 2, ['DEF']],
  ['Álex Romero', 8, ['MED']],
  ['Iván Castro', 6, ['MED', 'DEF']],
  ['Sergio Lago', 10, ['MED', 'DEL']],
  ['Pablo Núñez', 7, ['DEL']],
  ['Javi Moreno', 9, ['DEL']],
  ['Nico Herrera', 11, ['MED']],
  ['Óscar Ruiz', 13, ['POR']],
  ['Adrián Gil', 14, ['DEF', 'MED']],
];

const shift = (days: number) => {
  const d = new Date(`${todayIso()}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const key = () => `semilla-${Math.random().toString(36).slice(2)}`;

function draft(name: string, starters: string[], bench: string[]): LineupDraft {
  const d = emptyDraft(name, '2-3-1');
  const ids: SlotId[] = ['GK', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
  d.slots = d.slots.map((s) => ({ ...s, playerId: starters[ids.indexOf(s.id)] ?? null }));
  d.bench = bench;
  return d;
}

interface Played {
  opponent: string;
  days: number;
  time: string;
  home: boolean;
  /** Índices de la plantilla: 7 titulares y suplentes. */
  starters: number[];
  bench: number[];
  absent: number[];
  goalsFor: number;
  goalsAgainst: number;
  scorers: [number, number][];
  assists: [number, number][];
  keeper: [number, number];
  mvp: number;
}

const PLAYED: Played[] = [
  { opponent: 'Real Ribera', days: -28, time: '10:30', home: true, starters: [0, 1, 3, 4, 5, 6, 8], bench: [7, 9, 11], absent: [2], goalsFor: 3, goalsAgainst: 1, scorers: [[8, 2], [6, 1]], assists: [[4, 2]], keeper: [0, 4], mvp: 8 },
  { opponent: 'Atlético Molinos', days: -21, time: '12:00', home: false, starters: [0, 1, 2, 4, 6, 7, 8], bench: [5, 9, 3], absent: [11], goalsFor: 2, goalsAgainst: 2, scorers: [[7, 1], [8, 1]], assists: [[6, 1]], keeper: [0, 6], mvp: 0 },
  { opponent: 'Deportivo Alameda', days: -14, time: '11:00', home: true, starters: [10, 1, 2, 4, 5, 6, 7], bench: [8, 9, 11, 3], absent: [0], goalsFor: 1, goalsAgainst: 3, scorers: [[6, 1]], assists: [], keeper: [10, 3], mvp: 4 },
  { opponent: 'Unión Puerto', days: -7, time: '10:00', home: false, starters: [0, 1, 3, 4, 6, 9, 8], bench: [2, 7, 5, 11], absent: [10], goalsFor: 4, goalsAgainst: 0, scorers: [[8, 2], [9, 1], [7, 1]], assists: [[6, 2], [4, 1]], keeper: [0, 5], mvp: 6 },
];

export async function seedPortfolioDemo(adapter: DataAdapter): Promise<void> {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return;
  } catch {
    return;
  }
  const previous = adapter.currentSession();
  simControls.instant = true;
  try {
    await adapter.signIn('u-admin');
    const team = await adapter.getTeam(TEAM_ID);
    await adapter.updateTeam({ ...team, name: 'CD Barrio Norte', colors: { primary: '#0F7A4A', secondary: '#F4C430', number: '#FFFFFF' } });

    const players: Player[] = [];
    for (const [displayName, number, preferredPositions] of SQUAD) {
      players.push(await adapter.savePlayer({ teamId: TEAM_ID, displayName, number, preferredPositions, archived: false }));
    }
    const id = (i: number) => players[i].id;
    await adapter.linkMemberPlayer(TEAM_ID, 'u-jug', id(6));

    for (const p of PLAYED) {
      const match = await adapter.saveMatch({ teamId: TEAM_ID, opponent: p.opponent, date: shift(p.days), time: p.time, home: p.home });
      for (const i of [...p.starters, ...p.bench]) await adapter.setAvailability(match.id, id(i), 'disponible');
      for (const i of p.absent) await adapter.setAvailability(match.id, id(i), 'no_disponible');
      await adapter.createLineup(match.id, draft('Titular', p.starters.map(id), p.bench.map(id)), key());
      const scored = p.scorers.reduce((n, [, g]) => n + g, 0);
      const input: ResultInput = {
        goalsFor: p.goalsFor,
        goalsAgainst: p.goalsAgainst,
        scorers: p.scorers.map(([i, goals]) => ({ playerId: id(i), goals })),
        assists: p.assists.map(([i, assists]) => ({ playerId: id(i), assists })),
        keepers: [{ playerId: id(p.keeper[0]), saves: p.keeper[1], conceded: p.goalsAgainst }],
        unassigned: p.goalsFor - scored,
        unassignedNote: null,
        mvpId: id(p.mvp),
      };
      const saved = await adapter.saveResult(match.id, input, 0);
      if (!saved.ok) throw new Error(`Resultado de ejemplo rechazado: ${'message' in saved ? saved.message : saved.reason}`);
    }

    // Próximo partido: convocatoria a medias y una alineación en preparación.
    const next = await adapter.saveMatch({ teamId: TEAM_ID, opponent: 'CF Las Eras', date: shift(3), time: '11:30', home: true });
    for (const i of [0, 1, 3, 4, 5, 8, 9]) await adapter.setAvailability(next.id, id(i), 'disponible');
    for (const i of [2, 11]) await adapter.setAvailability(next.id, id(i), 'no_disponible');
    await adapter.createLineup(next.id, draft('Once inicial', [0, 1, 3, 4, 5, 9, 8].map(id), []), key());
    await adapter.saveMatch({ teamId: TEAM_ID, opponent: 'Racing Vega', date: shift(10), time: '10:00', home: false });

    localStorage.setItem(SEEDED_KEY, '1');
  } catch (e) {
    console.error(e);
  } finally {
    simControls.instant = false;
    await adapter.signOut();
    if (previous) await adapter.signIn(previous.userId);
  }
}

export function forgetPortfolioSeed() {
  try {
    localStorage.removeItem(SEEDED_KEY);
  } catch {
    // Sin almacenamiento la demo se vuelve a sembrar en cada carga.
  }
}
