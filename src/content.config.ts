import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const apps = defineCollection({
  // id = "es/nombre-app" | "en/nombre-app"
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/apps' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      summary: z.string(),
      cover: image(),
      coverAlt: z.string(),
      domain: z.string(),
      url: z.url().optional(),
      repo: z.url().optional(),
      /** Ruta de la demo con datos simulados, servida desde public/demo/ */
      demo: z.string().startsWith('/demo/').optional(),
      stack: z.array(z.string()),
      year: z.number(),
      status: z.enum(['live', 'beta', 'wip']),
      /** Color propio de la app (pestaña y detalles) */
      hue: z.string().default('#7fe0a6'),
      order: z.number().default(100),
      draft: z.boolean().default(false),
    }),
});

export const collections = { apps };
