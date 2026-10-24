// Los 14 alérgenos de declaración obligatoria en la UE (Reglamento 1169/2011, anexo II).
// Lista cerrada: el config solo puede usar estos identificadores. El orden es el de los chips del filtro.

export const ALERGENOS = [
  { id: 'gluten', nombre: 'Gluten' },
  { id: 'crustaceos', nombre: 'Crustáceos' },
  { id: 'huevos', nombre: 'Huevos' },
  { id: 'pescado', nombre: 'Pescado' },
  { id: 'cacahuetes', nombre: 'Cacahuetes' },
  { id: 'soja', nombre: 'Soja' },
  { id: 'lacteos', nombre: 'Lácteos' },
  { id: 'frutosCascara', nombre: 'Frutos de cáscara' },
  { id: 'apio', nombre: 'Apio' },
  { id: 'mostaza', nombre: 'Mostaza' },
  { id: 'sesamo', nombre: 'Sésamo' },
  { id: 'sulfitos', nombre: 'Sulfitos' },
  { id: 'altramuces', nombre: 'Altramuces' },
  { id: 'moluscos', nombre: 'Moluscos' },
] as const;

export type Alergeno = (typeof ALERGENOS)[number]['id'];

export const NOMBRE_ALERGENO = Object.fromEntries(ALERGENOS.map((a) => [a.id, a.nombre])) as Record<Alergeno, string>;
