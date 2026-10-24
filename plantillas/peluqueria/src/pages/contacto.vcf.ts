import type { APIRoute } from 'astro';
import { vcard } from '@comun/seo.ts';
import config from '../../config.ts';

export const GET: APIRoute = () =>
  new Response(vcard(config), { headers: { 'Content-Type': 'text/vcard; charset=utf-8' } });
