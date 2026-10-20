// Sonido del juego, sintetizado con Web Audio (sin archivos): el rumor de la ciudad de noche,
// algún coche que pasa a lo lejos, los pasos, el salto y la puerta. Arranca al pulsar «Jugar»
// (los navegadores no dejan sonar nada antes de un gesto) y se puede silenciar.

export interface Sonido {
  arrancar(): Promise<void>;
  silenciar(silencio: boolean): void;
  readonly silenciado: boolean;
  paso(carrera: boolean, sobreAcera: boolean): void;
  salto(): void;
  aterrizaje(): void;
  puerta(): void;
  /** Dentro de una sala la calle se oye amortiguada. */
  dentro(si: boolean): void;
  pausar(si: boolean): void;
  destruir(): void;
}

export function crearSonido(silenciadoAlEmpezar: boolean): Sonido {
  let ctx: AudioContext | null = null;
  let maestro: GainNode;
  let calle: BiquadFilterNode;
  let ruido: AudioBuffer;
  let silenciado = silenciadoAlEmpezar;
  let pasaCoche: ReturnType<typeof setTimeout> | undefined;

  const volumen = () => (silenciado ? 0 : 0.8);

  /** Dos segundos de ruido marrón: de ahí salen el rumor, los pasos y los coches. */
  const crearRuido = (c: AudioContext) => {
    const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = b.getChannelData(0);
    let ultimo = 0;
    for (let k = 0; k < d.length; k++) {
      const blanco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * blanco) / 1.02;
      d[k] = ultimo * 3.5;
    }
    return b;
  };

  const fuente = (bucle = false) => {
    const f = ctx!.createBufferSource();
    f.buffer = ruido;
    f.loop = bucle;
    return f;
  };

  const coche = () => {
    if (!ctx) return;
    // Un coche que pasa a lo lejos: ruido filtrado que sube y baja, de un lado a otro
    const t = ctx.currentTime;
    const f = fuente(true);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.setValueAtTime(220, t);
    filtro.frequency.linearRampToValueAtTime(480, t + 2);
    filtro.frequency.linearRampToValueAtTime(200, t + 4.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 2);
    g.gain.linearRampToValueAtTime(0, t + 4.5);
    const pan = ctx.createStereoPanner();
    const lado = Math.random() < 0.5 ? -1 : 1;
    pan.pan.setValueAtTime(-0.8 * lado, t);
    pan.pan.linearRampToValueAtTime(0.8 * lado, t + 4.5);
    f.connect(filtro).connect(g).connect(pan).connect(calle);
    f.start(t, Math.random());
    f.stop(t + 4.6);
    pasaCoche = setTimeout(coche, 7000 + Math.random() * 12000);
  };

  const tono = (frecuencia: number, hasta: number, duracion: number, volumen: number, tipo: OscillatorType = 'sine', retraso = 0) => {
    if (!ctx) return;
    const t = ctx.currentTime + retraso;
    const o = ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(frecuencia, t);
    o.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volumen, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    o.connect(g).connect(maestro);
    o.start(t);
    o.stop(t + duracion + 0.02);
  };

  return {
    get silenciado() {
      return silenciado;
    },
    arrancar: async () => {
      if (ctx) return;
      try {
        ctx = new AudioContext();
      } catch {
        return;
      }
      await ctx.resume().catch(() => {});
      ruido = crearRuido(ctx);
      maestro = ctx.createGain();
      maestro.gain.value = volumen();
      maestro.connect(ctx.destination);
      // Todo lo de la calle pasa por un filtro: dentro de una sala se cierra
      calle = ctx.createBiquadFilter();
      calle.type = 'lowpass';
      calle.frequency.value = 18000;
      calle.connect(maestro);
      // Rumor de fondo: ruido grave que respira despacio
      const rumor = fuente(true);
      const grave = ctx.createBiquadFilter();
      grave.type = 'lowpass';
      grave.frequency.value = 320;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.07;
      lfo.connect(lfoG).connect(g.gain);
      rumor.connect(grave).connect(g).connect(calle);
      rumor.start();
      lfo.start();
      // Un zumbido muy bajo de farolas y ciudad
      const zumbido = ctx.createOscillator();
      zumbido.frequency.value = 55;
      const zg = ctx.createGain();
      zg.gain.value = 0.012;
      zumbido.connect(zg).connect(calle);
      zumbido.start();
      pasaCoche = setTimeout(coche, 2500);
    },
    silenciar: (si) => {
      silenciado = si;
      if (ctx) maestro.gain.setTargetAtTime(volumen(), ctx.currentTime, 0.05);
    },
    paso: (carrera, sobreAcera) => {
      if (!ctx || silenciado) return;
      const t = ctx.currentTime;
      const f = fuente();
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.value = (sobreAcera ? 1300 : 900) * (0.85 + Math.random() * 0.3);
      filtro.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(carrera ? 0.5 : 0.32, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + (carrera ? 0.09 : 0.12));
      f.connect(filtro).connect(g).connect(maestro);
      f.start(t, Math.random() * 1.5);
      f.stop(t + 0.15);
    },
    salto: () => tono(240, 420, 0.16, 0.07, 'triangle'),
    aterrizaje: () => tono(110, 50, 0.14, 0.2),
    puerta: () => {
      // Campanilla de tienda: dos notas
      tono(988, 980, 0.5, 0.08, 'sine');
      tono(1319, 1310, 0.6, 0.06, 'sine', 0.12);
    },
    dentro: (si) => {
      if (ctx) calle.frequency.setTargetAtTime(si ? 380 : 18000, ctx.currentTime, 0.25);
    },
    pausar: (si) => {
      if (!ctx) return;
      if (si) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
    },
    destruir: () => {
      clearTimeout(pasaCoche);
      ctx?.close().catch(() => {});
      ctx = null;
    },
  };
}
