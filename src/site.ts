// Datos personales del sitio. TODO: confirmar redes.
export const site = {
  name: 'JettaDev',
  email: 'isragarciap06@gmail.com',
  github: 'https://github.com/JettaDev',
  linkedin: '',
  stack: {
    es: [
      { group: 'Frontend', items: ['TypeScript', 'React', 'Next.js', 'Astro', 'Tailwind CSS'] },
      { group: 'Backend', items: ['Supabase', 'PostgreSQL', 'Node.js'] },
      { group: 'Despliegue y pruebas', items: ['Cloudflare Workers', 'Vitest', 'Playwright', 'Git'] },
    ],
    en: [
      { group: 'Frontend', items: ['TypeScript', 'React', 'Next.js', 'Astro', 'Tailwind CSS'] },
      { group: 'Backend', items: ['Supabase', 'PostgreSQL', 'Node.js'] },
      { group: 'Deploys and testing', items: ['Cloudflare Workers', 'Vitest', 'Playwright', 'Git'] },
    ],
  },
} as const;
