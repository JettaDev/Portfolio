// Un gato sentado en el pretil de la tienda, con la cola colgando por la fachada y los ojos
// encendidos en la oscuridad. Es un detalle escondido: al tocarlo da un saltito y mueve la cola
// (y la portada dice «Miau»). Con movimiento reducido no se mueve.

import { BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, Vector3 } from 'three';
import { COLORES } from './escena';
import { fachada, type Trazado } from './trazado';

export interface Gato {
  objeto: Group;
  /** Zona de toque (invisible, algo más grande que el gato). */
  toque: Mesh;
  /** Punto para la etiqueta «Miau». */
  posicion: Vector3;
  saltar(): void;
  actualizar(t: number, dt: number, conMovimiento: boolean): void;
  apagar(): void;
}

export function crearGato(t: Trazado): Gato {
  const tienda = t.edificios[t.tienda];
  const grupo = new Group();
  // En la esquina izquierda del pretil, lejos del ventanal del estudio
  grupo.position.set(tienda.x - tienda.ancho / 2 + 0.55, tienda.alto, fachada(tienda) - 0.3);
  // Algo más grande que un gato de verdad: de lejos tiene que poder encontrarse
  grupo.scale.setScalar(1.5);
  const caja = new BoxGeometry(1, 1, 1);
  const pelo = new MeshLambertMaterial({ color: '#0a140f', emissive: '#0a140f', emissiveIntensity: 0.4 });
  const pieza = (padre: Group, x: number, y: number, z: number, a: number, h: number, f: number, material: MeshLambertMaterial | MeshBasicMaterial = pelo) => {
    const p = new Mesh(caja, material);
    p.scale.set(a, h, f);
    p.position.set(x, y, z);
    padre.add(p);
    return p;
  };

  const cuerpo = new Group();
  grupo.add(cuerpo);
  pieza(cuerpo, 0, 0.17, -0.04, 0.26, 0.34, 0.3); // tronco, sentado
  pieza(cuerpo, 0, 0.05, 0.08, 0.24, 0.1, 0.12); // patas delanteras
  const cabeza = new Group();
  cabeza.position.set(0, 0.41, 0.04);
  cuerpo.add(cabeza);
  pieza(cabeza, 0, 0, 0, 0.22, 0.18, 0.18);
  for (const lado of [-1, 1]) {
    const oreja = pieza(cabeza, lado * 0.07, 0.12, -0.01, 0.06, 0.09, 0.04);
    oreja.rotation.z = -lado * 0.25;
  }
  const ojo = new MeshBasicMaterial({ color: new Color(COLORES.brote).multiplyScalar(1.1), toneMapped: false });
  const ojos = [-1, 1].map((lado) => pieza(cabeza, lado * 0.05, 0.01, 0.092, 0.04, 0.03, 0.01, ojo));
  // La cola cuelga por delante del pretil, en tres tramos que se balancean
  const cola = new Group();
  cola.position.set(0.1, 0.04, 0.24);
  cuerpo.add(cola);
  const tramos: Group[] = [];
  let padre = cola;
  for (let k = 0; k < 3; k++) {
    const tramo = new Group();
    tramo.position.y = k === 0 ? 0 : -0.14;
    padre.add(tramo);
    pieza(tramo, 0, -0.07, 0, 0.05, 0.15, 0.05);
    tramos.push(tramo);
    padre = tramo;
  }

  // Zona de toque: el gato es pequeño, así que se le da margen
  const toque = new Mesh(caja, new MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  toque.scale.set(0.9, 1, 0.9);
  toque.position.set(0, 0.25, 0);
  grupo.add(toque);

  let salto = -1;
  let parpadeo = 3;
  let apagado = false;
  return {
    objeto: grupo,
    toque,
    posicion: grupo.position.clone().add(new Vector3(0, 0.85, 0)),
    saltar: () => {
      if (salto < 0) salto = 0;
    },
    actualizar: (tiempo, dt, conMovimiento) => {
      // La cola se mece despacio; al saltar, da un latigazo
      const latigo = salto >= 0 ? Math.sin(salto * 18) * 0.6 : 0;
      tramos.forEach((tr, k) => (tr.rotation.z = conMovimiento ? Math.sin(tiempo * 1.3 - k * 0.7) * 0.25 + latigo : 0));
      if (salto >= 0) {
        salto += dt;
        const f = Math.min(1, salto / 0.45);
        cuerpo.position.y = Math.sin(f * Math.PI) * 0.35;
        cabeza.rotation.z = Math.sin(f * Math.PI * 2) * 0.2;
        if (f >= 1) {
          salto = -1;
          cuerpo.position.y = 0;
        }
      }
      // Parpadea de vez en cuando
      if (apagado) return;
      parpadeo -= dt;
      const cerrados = conMovimiento && parpadeo < 0.12;
      ojos.forEach((o) => (o.visible = !cerrados));
      if (parpadeo < 0) parpadeo = 2.5 + ((tiempo * 7.3) % 4);
    },
    apagar: () => {
      apagado = true;
      ojos.forEach((o) => (o.visible = false));
    },
  };
}
