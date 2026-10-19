// Bloques de los edificios: una sola InstancedMesh ordenada por filas.

import { BoxGeometry, InstancedMesh, Matrix4, MeshLambertMaterial, Quaternion, Vector3 } from 'three';
import { COLORES } from './escena';
import type { Trazado } from './trazado';

export function crearEdificios(trazado: Trazado): InstancedMesh {
  const caja = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const malla = new InstancedMesh(caja, new MeshLambertMaterial({ color: COLORES.edificio }), trazado.edificios.length);
  const m = new Matrix4();
  const giro = new Quaternion();
  trazado.edificios.forEach((e, i) => {
    m.compose(new Vector3(e.x, 0, e.z), giro, new Vector3(e.ancho, e.alto, e.fondo));
    malla.setMatrixAt(i, m);
  });
  malla.computeBoundingSphere();
  return malla;
}
