// Mini-test: corrige cada pregunta al responderla (con texto, no solo color) y muestra el resumen al terminar.

const LETRAS = 'ABCDEFG';

export function iniciarTest() {
  const form = document.querySelector<HTMLFormElement>('[data-test]');
  if (!form) return;
  const textos = JSON.parse(form.dataset.textos ?? '{}') as { resultado: string; bien: string; mal: string };
  const preguntas = [...form.querySelectorAll<HTMLFieldSetElement>('fieldset[data-correcta]')];
  const resumen = form.querySelector<HTMLElement>('[data-resumen-dentro]')!;

  function corregir(fs: HTMLFieldSetElement, elegida: HTMLInputElement) {
    const correcta = Number(fs.dataset.correcta);
    const radios = [...fs.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    const acierto = Number(elegida.value) === correcta;
    fs.dataset.estado = acierto ? 'bien' : 'mal';

    radios.forEach((r, i) => {
      const label = r.closest('label')!;
      const marca = label.querySelector<HTMLElement>('[data-marca]')!;
      if (i === correcta) {
        label.classList.add('es-correcta');
        marca.textContent = 'Correcta';
      } else if (r === elegida) {
        label.classList.add('es-fallo');
        marca.textContent = 'Tu respuesta';
      }
      // La pregunta queda cerrada; la opción elegida sigue enfocable para no perder el foco.
      if (r !== elegida) r.disabled = true;
    });

    const buena = radios[correcta].closest('label')!.querySelector('.respuesta__texto')!.textContent;
    fs.querySelector('[data-veredicto]')!.textContent = acierto
      ? 'Correcto.'
      : `Incorrecto. La correcta es la ${LETRAS[correcta]}: ${buena}.`;
    fs.querySelector<HTMLElement>('[data-explica]')!.hidden = false;

    const hechas = preguntas.filter((p) => p.dataset.estado);
    if (hechas.length === preguntas.length) {
      const aciertos = preguntas.filter((p) => p.dataset.estado === 'bien').length;
      form!.querySelector('[data-resumen-nota]')!.textContent = textos.resultado
        .replace('{aciertos}', String(aciertos))
        .replace('{total}', String(preguntas.length));
      form!.querySelector('[data-resumen-texto]')!.textContent = aciertos >= preguntas.length - 1 ? textos.bien : textos.mal;
      resumen.dataset.aciertos = String(aciertos);
      resumen.hidden = false;
    }
  }

  form.addEventListener('change', (e) => {
    const r = e.target as HTMLInputElement;
    const fs = r.closest<HTMLFieldSetElement>('fieldset[data-correcta]');
    if (fs && !fs.dataset.estado) corregir(fs, r);
  });

  // «Repetir el test»: el reset nativo desmarca los radios; aquí se limpia lo demás.
  form.addEventListener('reset', () => {
    requestAnimationFrame(() => {
      for (const fs of preguntas) {
        delete fs.dataset.estado;
        for (const r of fs.querySelectorAll<HTMLInputElement>('input')) r.disabled = false;
        for (const l of fs.querySelectorAll('label')) l.classList.remove('es-correcta', 'es-fallo');
        for (const m of fs.querySelectorAll('[data-marca]')) m.textContent = '';
        fs.querySelector('[data-veredicto]')!.textContent = '';
        fs.querySelector<HTMLElement>('[data-explica]')!.hidden = true;
      }
      resumen.hidden = true;
      const primera = preguntas[0]?.querySelector<HTMLInputElement>('input');
      const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('test')?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto' });
      primera?.focus({ preventScroll: true });
    });
  });
}
