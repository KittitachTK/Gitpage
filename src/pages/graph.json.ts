import type { APIRoute } from 'astro';
import { getVault } from '../lib/vault/vault';

/** The whole knowledge graph, built from `[[wikilinks]]` across the vault. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(getVault().graph), { headers: { 'Content-Type': 'application/json' } });
