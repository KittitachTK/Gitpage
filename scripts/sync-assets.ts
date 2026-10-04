/**
 * Mirror vault attachments (images, PDFs, …) into public/vault/ so Astro serves
 * them in dev and copies them into the build. Markdown is never copied — it is
 * rendered from the vault directly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ASSET_PREFIX } from '../src/lib/config';
import { loadVault } from '../src/lib/vault/vault';

const vault = loadVault();
const outDir = path.resolve('public', ASSET_PREFIX);
fs.rmSync(outDir, { recursive: true, force: true });

for (const asset of vault.assets) {
  const dest = path.join(outDir, ...asset.id.split('/'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(asset.file, dest);
}
console.log(`Synced ${vault.assets.length} vault asset(s) → public/${ASSET_PREFIX}/`);
