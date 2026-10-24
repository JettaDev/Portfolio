import type { APIRoute } from 'astro';

// Se deja rastrear todo: en modo demo cada página lleva <meta name="robots" content="noindex">.
export const GET: APIRoute = () =>
  new Response('User-agent: *\nAllow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
