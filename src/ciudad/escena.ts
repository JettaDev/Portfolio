// Atmósfera de la ciudad: cielo, estrellas, luna, luces, niebla y suelo.

import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three';
import { aleatorio } from './semilla';

export const COLORES = {
  cielo: '#040b07',
  horizonte: '#143524',
  niebla: '#0f2a1d',
  edificio: '#0d2217',
  suelo: '#06100b',
  apagada: '#060e0a',
  calendula: '#ffb547',
  luna: '#f4f1e1',
  estrellas: '#e6eee4',
} as const;

/** Halo radial pintado en un canvas, sin archivos externos (compartido por luna y ventanales). */
export function texturaHalo(): CanvasTexture {
  const lado = 128;
  const c = document.createElement('canvas');
  c.width = c.height = lado;
  const g = c.getContext('2d')!;
  const degradado = g.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2);
  degradado.addColorStop(0, 'rgba(255,255,255,1)');
  degradado.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  degradado.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = degradado;
  g.fillRect(0, 0, lado, lado);
  const textura = new CanvasTexture(c);
  textura.colorSpace = SRGBColorSpace;
  return textura;
}

/** Cúpula con degradado vertical: horizonte verde bosque y cénit casi negro. */
function cupula(): Mesh {
  return new Mesh(
    new SphereGeometry(500, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        arriba: { value: new Color(COLORES.cielo) },
        abajo: { value: new Color(COLORES.horizonte) },
      },
      vertexShader: /* glsl */ `
        varying float vAltura;
        void main() {
          vAltura = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 arriba;
        uniform vec3 abajo;
        varying float vAltura;
        void main() {
          gl_FragColor = vec4(mix(abajo, arriba, smoothstep(-0.02, 0.35, vAltura)), 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
}

function estrellas(cantidad: number, azar: () => number): Points {
  const posiciones = new Float32Array(cantidad * 3);
  for (let i = 0; i < cantidad; i++) {
    // Repartidas por la mitad superior de una esfera
    const angulo = azar() * Math.PI * 2;
    const y = 0.08 + azar() * 0.92;
    const r = Math.sqrt(1 - y * y);
    posiciones.set([Math.cos(angulo) * r * 420, y * 420, Math.sin(angulo) * r * 420], i * 3);
  }
  const geometria = new BufferGeometry();
  geometria.setAttribute('position', new BufferAttribute(posiciones, 3));
  return new Points(
    geometria,
    new PointsMaterial({ color: COLORES.estrellas, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false }),
  );
}

function luna(halo: CanvasTexture): Group {
  const grupo = new Group();
  // Por encima de ~0,85 deslumbra con el bloom
  const cuerpo = new Mesh(
    new SphereGeometry(7, 32, 16),
    new MeshBasicMaterial({ color: new Color(COLORES.luna).multiplyScalar(0.85), fog: false, toneMapped: false }),
  );
  const brillo = new Sprite(
    new SpriteMaterial({ map: halo, color: '#cfe0d4', opacity: 0.12, transparent: true, depthWrite: false, fog: false, blending: AdditiveBlending }),
  );
  brillo.scale.setScalar(70);
  grupo.add(brillo, cuerpo);
  grupo.position.set(80, 118, -260);
  return grupo;
}

export function crearEscena(semilla: number, halo: CanvasTexture, { pocasEstrellas = false } = {}): Scene {
  const azar = aleatorio(semilla ^ 0x5eed);
  const escena = new Scene();
  escena.fog = new FogExp2(COLORES.niebla, 0.0105);
  escena.background = new Color(COLORES.cielo);
  escena.add(cupula(), estrellas(pocasEstrellas ? 500 : 1500, azar), luna(halo));

  // Luz de luna fría y ambiente muy bajo: solo dan volumen a las fachadas
  escena.add(new AmbientLight('#2c5240', 0.9));
  const luzLuna = new DirectionalLight('#b9cfe0', 0.9);
  luzLuna.position.set(75, 80, -60);
  escena.add(luzLuna);

  const suelo = new Mesh(new PlaneGeometry(1200, 1200), new MeshLambertMaterial({ color: COLORES.suelo }));
  suelo.rotation.x = -Math.PI / 2;
  escena.add(suelo);
  return escena;
}
