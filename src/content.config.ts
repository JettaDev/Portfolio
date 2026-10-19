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
      /** Capturas para la galería del detalle; se emparejan escritorio + móvil en ese orden */
      gallery: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
            title: z.string(),
            caption: z.string().optional(),
            device: z.enum(['desktop', 'mobile']).default('desktop'),
          }),
        )
        .default([]),
      stack: z.array(z.string()),
      year: z.number(),
      status: z.enum(['live', 'beta', 'wip']),
      /** Color propio de la app (pestaña y detalles) */
      hue: z.string().default('#7fe0a6'),
      order: z.number().default(100),
      /** Ajustes de la ventana en la ciudad 3D; sin ellos, la colocación es automática */
      ciudad: z
        .object({
          /** Planta de la ventana, contando desde 0 en la calle */
          planta: z.number().int().min(0).optional(),
        })
        .optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { apps };
