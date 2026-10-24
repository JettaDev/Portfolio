// Formulario de cita: valida, monta el mensaje y lo abre en WhatsApp o en el correo.
// Solo nombre, teléfono, especialidad, días y franja. Nada de salud y nada se guarda.
import { construirMensaje, enlaceFormulario } from '@comun/enlaces.ts';
import { abrir } from '@comun/cliente/demo.ts';

/** «lunes», «lunes y martes», «lunes, martes y jueves». */
const enumerar = (v: string[]) => (v.length > 1 ? `${v.slice(0, -1).join(', ')} y ${v.at(-1)}` : v[0] ?? '');

export function iniciarCita() {
  const form = document.querySelector<HTMLFormElement>('form[data-cita]');
  if (!form) return;
  const ds = form.dataset;
  const nombre = form.elements.namedItem('nombre') as HTMLInputElement;
  const tel = form.elements.namedItem('telefono') as HTMLInputElement;
  const esp = form.elements.namedItem('especialidad') as HTMLSelectElement;
  const dias = [...form.querySelectorAll<HTMLInputElement>('input[name="dias"]')];
  const franjas = [...form.querySelectorAll<HTMLInputElement>('input[name="franja"]')];

  // Muestra u oculta el error de un campo; devuelve el elemento a enfocar si hay error.
  function marcar(campo: HTMLElement, idError: string, mensaje: string, foco: HTMLElement) {
    const caja = document.getElementById(idError)!;
    caja.textContent = mensaje;
    caja.hidden = !mensaje;
    campo.toggleAttribute('data-error', !!mensaje);
    if (foco instanceof HTMLInputElement && foco.type !== 'checkbox' && foco.type !== 'radio')
      foco.setAttribute('aria-invalid', String(!!mensaje));
    return mensaje ? foco : null;
  }

  const digitos = (s: string) => s.replace(/\D/g, '').replace(/^(00)?34(?=\d{9}$)/, '');

  function validar() {
    const errores = [
      marcar(nombre.closest('.campo')!, 'cita-nombre-error',
        nombre.value.trim().length < 2 ? 'Escribe tu nombre para saber a quién llamamos.' : '', nombre),
      marcar(tel.closest('.campo')!, 'cita-tel-error',
        !tel.value.trim() ? 'Escribe un teléfono para confirmarte la cita.'
        : !/^[6789]\d{8}$/.test(digitos(tel.value)) ? 'Revisa el teléfono: deben ser 9 cifras, por ejemplo 600 123 456.' : '', tel),
      marcar(dias[0].closest('fieldset')!, 'cita-dias-error',
        dias.some((d) => d.checked) ? '' : 'Marca al menos un día.', dias[0]),
      marcar(franjas[0].closest('fieldset')!, 'cita-franja-error',
        franjas.some((f) => f.checked) ? '' : 'Elige mañana o tarde.', franjas[0]),
    ].filter(Boolean) as HTMLElement[];
    return errores;
  }

  // Al corregir, el error se quita sin esperar a enviar otra vez.
  form.addEventListener('input', () => {
    if (form.querySelector('[data-error]')) validar();
  });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const errores = validar();
    if (errores.length) {
      errores[0].focus();
      return;
    }
    const franja = franjas.find((f) => f.checked)!;
    const texto = construirMensaje(ds.saludo!, [
      ['Nombre', nombre.value.trim()],
      ['Teléfono', tel.value.trim()],
      ['Especialidad', esp.selectedOptions[0]?.textContent],
      ['Días preferidos', enumerar(dias.filter((d) => d.checked).map((d) => d.dataset.nombre!))],
      ['Franja', franja.dataset.texto],
    ]);
    const canal = ds.canal === 'email' ? 'email' : 'whatsapp';
    abrir(enlaceFormulario(canal, { whatsapp: ds.whatsapp ?? '', email: ds.email ?? '' }, ds.asunto ?? '', texto));
  });

  // «Pedir cita» desde una especialidad: la deja elegida en el formulario.
  document.addEventListener('click', (ev) => {
    const a = (ev.target as Element).closest<HTMLAnchorElement>('a[data-pedir]');
    if (!a) return;
    esp.value = a.dataset.pedir!;
    // Tras el salto al formulario, el foco va al primer campo.
    requestAnimationFrame(() => nombre.focus({ preventScroll: true }));
  });
}
