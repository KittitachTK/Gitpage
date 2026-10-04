/**
 * Vault validation, run locally (`npm run validate`) and in CI before the build.
 * Errors fail the job; warnings are printed (and annotated on GitHub).
 */
import path from 'node:path';
import { loadVault } from '../src/lib/vault/vault';
import { validateVault } from '../src/lib/vault/validate';

const vault = loadVault();
const issues = validateVault(vault);
const gh = process.env.GITHUB_ACTIONS === 'true';
const color = process.stdout.isTTY && !gh;
const c = (code: number, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);

console.log(`Vault: ${vault.root}`);
console.log(`  ${vault.notes.length} notes · ${vault.assets.length} assets · ${vault.graph.links.length} links · ${vault.bib.size} references\n`);

for (const i of issues) {
  const loc = `${i.file}${i.line ? `:${i.line}` : ''}`;
  const tag = i.level === 'error' ? c(31, 'error') : c(33, 'warn ');
  console.log(`${tag} ${c(2, `[${i.rule}]`)} ${loc}\n      ${i.message}`);
  if (i.suggestions?.length) console.log(`      ${c(36, 'Possible:')} ${i.suggestions.join('  ')}`);
  if (gh) {
    const file = path.relative(process.cwd(), path.join(vault.root, i.file)).split(path.sep).join('/');
    const extra = i.suggestions?.length ? ` — possible: ${i.suggestions.join(', ')}` : '';
    console.log(`::${i.level === 'error' ? 'error' : 'warning'} file=${file}${i.line ? `,line=${i.line}` : ''},title=${i.rule}::${i.message}${extra}`);
  }
}

const errors = issues.filter((i) => i.level === 'error').length;
const warnings = issues.length - errors;
console.log(`\n${errors ? c(31, `✗ ${errors} error(s)`) : c(32, '✓ no errors')}, ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
