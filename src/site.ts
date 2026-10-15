// Datos personales del sitio. TODO: confirmar redes.
export const site = {
  name: 'JettaDev',
  email: 'isragarciap06@gmail.com',
  github: 'https://github.com/JettaDev',
  linkedin: '',
  stack: {
    es: [
      { group: 'Frontend', items: ['TypeScript', 'Astro', 'React', 'Tailwind CSS'] },
      { group: 'Backend', items: ['Node.js', 'PostgreSQL', 'APIs REST'] },
      { group: 'Herramientas', items: ['Git', 'Figma', 'Vercel'] },
    ],
    en: [
      { group: 'Frontend', items: ['TypeScript', 'Astro', 'React', 'Tailwind CSS'] },
      { group: 'Backend', items: ['Node.js', 'PostgreSQL', 'REST APIs'] },
      { group: 'Tools', items: ['Git', 'Figma', 'Vercel'] },
    ],
  },
} as const;
